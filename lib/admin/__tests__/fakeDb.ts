/**
 * A stand-in for the Supabase admin client, for the owner's desk tests: every
 * query records its table, its columns and its filters, and is answered by a
 * handler per table. It honours the filters it is given (eq, in, gte, gt, lt,
 * lte) on the rows a handler returns, because a fake that ignores them hides
 * a row the real read would lose (the quiet board's lesson, quietBoard.test.ts),
 * and pages by .range() as PostgREST does.
 */

export type Filter = { op: "eq" | "in" | "gte" | "gt" | "lt" | "lte" | "is"; column: string; value: unknown };

export type Call = {
  table: string;
  columns: string;
  head: boolean;
  filters: Filter[];
  insert?: unknown;
  upsert?: unknown;
  update?: unknown;
};

export type Answer = { data?: unknown; error?: { code?: string; message: string } | null; count?: number | null };

export type Handlers = Record<string, (call: Call) => Answer>;

function passes(row: Record<string, unknown>, f: Filter): boolean {
  const v = row[f.column];
  if (v === undefined) return true; // a column the fixture leaves out is not filtered on
  switch (f.op) {
    case "eq":
      return v === f.value;
    case "in":
      return (f.value as unknown[]).includes(v);
    case "is":
      return v === f.value;
    case "gte":
      return String(v) >= String(f.value);
    case "gt":
      return String(v) > String(f.value);
    case "lt":
      return String(v) < String(f.value);
    case "lte":
      return String(v) <= String(f.value);
  }
}

export function fakeDb(handlers: Handlers, rpc: Record<string, (args: Record<string, unknown>) => Answer> = {}) {
  const calls: Call[] = [];

  function answer(call: Call, range?: [number, number]): Answer {
    const h = handlers[call.table];
    const a = h ? h(call) : { data: [] };
    if (a.error) return { data: null, error: a.error, count: null };
    if (call.head) return { data: null, error: null, count: a.count ?? (Array.isArray(a.data) ? a.data.length : 0) };
    if (!Array.isArray(a.data)) return { data: a.data ?? null, error: null };
    const rows = (a.data as Record<string, unknown>[]).filter((r) => call.filters.every((f) => passes(r, f)));
    return { data: range ? rows.slice(range[0], range[1] + 1) : rows, error: null };
  }

  function from(table: string) {
    const call: Call = { table, columns: "", head: false, filters: [] };
    calls.push(call);
    const q = {
      select(columns = "*", opts?: { head?: boolean }) {
        call.columns = columns;
        call.head = !!opts?.head;
        return q;
      },
      eq: (column: string, value: unknown) => (call.filters.push({ op: "eq", column, value }), q),
      in: (column: string, value: unknown[]) => (call.filters.push({ op: "in", column, value }), q),
      is: (column: string, value: unknown) => (call.filters.push({ op: "is", column, value }), q),
      gte: (column: string, value: unknown) => (call.filters.push({ op: "gte", column, value }), q),
      gt: (column: string, value: unknown) => (call.filters.push({ op: "gt", column, value }), q),
      lt: (column: string, value: unknown) => (call.filters.push({ op: "lt", column, value }), q),
      lte: (column: string, value: unknown) => (call.filters.push({ op: "lte", column, value }), q),
      or: () => q,
      order: () => q,
      limit: () => q,
      insert(row: unknown) {
        call.insert = row;
        return q;
      },
      upsert(row: unknown) {
        call.upsert = row;
        return q;
      },
      update(row: unknown) {
        call.update = row;
        return q;
      },
      range: (a: number, b: number) => Promise.resolve(answer(call, [a, b])),
      maybeSingle: () => {
        const a = answer(call);
        return Promise.resolve({ ...a, data: Array.isArray(a.data) ? (a.data[0] ?? null) : a.data });
      },
      single: () => {
        const a = answer(call);
        return Promise.resolve({ ...a, data: Array.isArray(a.data) ? (a.data[0] ?? null) : a.data });
      },
      then: (ok: (a: Answer) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(answer(call)).then(ok, bad),
    };
    return q;
  }

  return {
    calls,
    from,
    rpc: async (name: string, args: Record<string, unknown>) => (rpc[name] ? rpc[name](args) : { data: null, error: { message: `no ${name}` } }),
  };
}
