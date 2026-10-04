// A stand-in for the database API, for tests of code that reads lists.
//
// It does the one thing the real API does and a hand-written stub forgets: it
// hands back at most 1,000 rows a request, whatever .limit() or .range() asked
// for, and says nothing about the rest. Code that reads a list in one request
// passes against a stub that returns everything, and fails here, which is the
// point: docs/audit/findings.yaml F-31.
//
// Filters, order, limit and range are applied the way the API applies them,
// for the operators the code under test uses. One it does not know throws, so
// a test cannot pass by having a filter quietly ignored. update() and insert()
// change the rows they are given, so a test can see what was written; a write
// is not capped, as it is not on the real API.

import type { SupabaseClient } from "@supabase/supabase-js";

export const API_MAX_ROWS = 1000;

type Row = Record<string, unknown>;
type ApiError = { message: string; code?: string };
type Source = Row[] | { error: ApiError };

export type ApiRequest = { table: string; ordered: boolean; from: number; rows: number };

type Options = {
  /** Who auth.getUser() answers with. Nobody when left out. */
  user?: { id: string } | null;
  /** Make a read fail: `n` counts the reads of that table, from 1. */
  fail?: (read: { table: string; n: number }) => ApiError | null;
};

const absent = (name: string): ApiError => ({
  code: "PGRST205",
  message: `Could not find the table 'public.${name}' in the schema cache`,
});

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (a as string | number) < (b as string | number) ? -1 : 1;
}

/**
 * `tables` maps a table to its rows, or to the error a read of it gives; a
 * table left out is absent. `functions` does the same for rpc().
 */
export function cappedApi(
  tables: Record<string, Source>,
  functions: Record<string, (args: Row) => Source> = {},
  opts: Options = {},
): { client: SupabaseClient; requests: ApiRequest[] } {
  const requests: ApiRequest[] = [];
  const reads = new Map<string, number>();
  let made = 0;

  const query = (table: string, source: Source | undefined) => {
    const filters: ((r: Row) => boolean)[] = [];
    const orders: { column: string; ascending: boolean }[] = [];
    let from = 0;
    let to = Number.POSITIVE_INFINITY;
    let countOnly = false;
    let write: { patch: Row } | { rows: Row[] } | null = null;
    let returning = false;

    const where = (test: (r: Row) => boolean) => {
      filters.push(test);
      return q;
    };
    const run = (): { data: Row[] | null; error: ApiError | null; count?: number } => {
      if (!source) return { data: null, error: absent(table) };
      if (!Array.isArray(source)) return { data: null, error: source.error };

      if (write && "rows" in write) {
        const added = write.rows.map((r) => ({ id: `${table}-${++made}`, ...r }));
        source.push(...added);
        return { data: returning ? added : null, error: null };
      }
      let rows = source.filter((r) => filters.every((f) => f(r)));
      if (write) {
        for (const r of rows) Object.assign(r, write.patch);
        return { data: returning ? rows : null, error: null };
      }

      const n = (reads.get(table) ?? 0) + 1;
      reads.set(table, n);
      const failure = opts.fail?.({ table, n });
      if (failure) return { data: null, error: failure };
      // A count is taken in the database and is not capped: that is why
      // { count: "exact", head: true } is one of the right answers.
      if (countOnly) return { data: null, error: null, count: rows.length };
      if (orders.length > 0) {
        rows = [...rows].sort((a, b) => {
          for (const o of orders) {
            const d = compare(a[o.column], b[o.column]);
            if (d !== 0) return o.ascending ? d : -d;
          }
          return 0;
        });
      }
      const page = rows.slice(from, Math.min(to, from + API_MAX_ROWS - 1) + 1);
      requests.push({ table, ordered: orders.length > 0, from, rows: page.length });
      return { data: page, error: null };
    };
    const one = () => {
      const { data, error } = run();
      return { data: data?.[0] ?? null, error };
    };

    const q = {
      select: (_columns?: string, selectOpts?: { head?: boolean }) => {
        if (write) returning = true;
        else countOnly = selectOpts?.head === true;
        return q;
      },
      update: (patch: Row) => {
        write = { patch };
        return q;
      },
      insert: (rows: Row | Row[]) => {
        write = { rows: Array.isArray(rows) ? rows : [rows] };
        return q;
      },
      // Accepted and forgotten: no test here reads back what it upserts.
      upsert: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve().then(one),
      single: () => Promise.resolve().then(one),
      eq: (c: string, v: unknown) => where((r) => r[c] === v),
      neq: (c: string, v: unknown) => where((r) => r[c] !== v),
      gt: (c: string, v: string | number) => where((r) => r[c] != null && (r[c] as string | number) > v),
      gte: (c: string, v: string | number) => where((r) => r[c] != null && (r[c] as string | number) >= v),
      lt: (c: string, v: string | number) => where((r) => r[c] != null && (r[c] as string | number) < v),
      lte: (c: string, v: string | number) => where((r) => r[c] != null && (r[c] as string | number) <= v),
      in: (c: string, vs: readonly unknown[]) => where((r) => vs.includes(r[c])),
      is: (c: string, v: null | boolean) => where((r) => (r[c] ?? null) === v),
      not: (c: string, op: string, v: unknown) => {
        if (op !== "is" || v !== null) throw new Error(`cappedApi does not model .not(${c}, ${op})`);
        return where((r) => r[c] != null);
      },
      order: (column: string, orderOpts?: { ascending?: boolean }) => {
        orders.push({ column, ascending: orderOpts?.ascending !== false });
        return q;
      },
      limit: (n: number) => {
        to = Math.min(to, from + n - 1);
        return q;
      },
      range: (a: number, b: number) => {
        from = a;
        to = b;
        return q;
      },
      then: <A, B>(ok: (v: ReturnType<typeof run>) => A, fail?: (e: unknown) => B) =>
        Promise.resolve().then(run).then(ok, fail),
    };
    return q;
  };

  const client = {
    from: (table: string) => query(table, tables[table]),
    rpc: (name: string, args: Row = {}) =>
      query(name, functions[name] ? functions[name](args) : { error: { code: "PGRST202", message: `Could not find the function public.${name}` } }),
    auth: { getUser: async () => ({ data: { user: opts.user ?? null }, error: null }) },
  } as unknown as SupabaseClient;

  return { client, requests };
}
