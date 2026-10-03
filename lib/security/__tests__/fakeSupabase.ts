/**
 * An in-memory stand-in for the supabase-js calls that the upload routes,
 * lib/security/uploadOwners.ts and scripts/migrate-upload-paths.mjs make.
 *
 * Not a test file. The suites beside it run real route handlers and the real
 * script against this, because none of them can be walked in a browser
 * without writing to the production project.
 *
 * It keeps the rules that matter to those suites, as Postgres and PostgREST
 * keep them:
 *   - a table that is not there answers PGRST205, and a column a table lacks
 *     answers 42703, so a misspelt column cannot pass (COLUMNS below is read
 *     off the migrations);
 *   - upload_owners has its primary key and its foreign key to auth.users;
 *   - a page is capped by the server (maxRows) whatever the caller asks for;
 *   - storage refuses to overwrite, and answers "not found" for a copy of a
 *     file that is gone.
 */

export const PROJECT = "https://proj.supabase.co";
const STORAGE = `${PROJECT}/storage/v1`;

export type Row = Record<string, unknown>;
type Failure = { code?: string; message: string; statusCode?: string };
type Result = { data: unknown; error: Failure | null };

/** Every column of the tables these suites touch, from supabase/migrations. */
const COLUMNS: Record<string, string[]> = {
  // 20261007000000_upload_owners.sql
  upload_owners: ["bucket", "path", "owner_id", "created_at"],
  // 20260713000500_trapeza_recipes.sql, 20260928000000_kitchen.sql
  trapeza_recipes: [
    "id", "author_id", "title", "fast_level", "season", "tradition", "summary", "ingredients",
    "steps", "servings", "time_minutes", "status", "created_at", "updated_at", "photo_url",
    "photo_credit",
  ],
  // 20260928000000_kitchen.sql
  trapeza_recipe_reviews: [
    "id", "recipe_id", "author_id", "author_name", "author_avatar", "stars", "body", "photo_urls",
    "status", "created_at", "updated_at",
  ],
  // 20260713000200_prayer_campaigns.sql, 20260713000300 (prayer duration), 20260725000000_prayer_campaign_image.sql
  prayer_campaigns: [
    "id", "creator_id", "title", "intention", "for_whom", "subject_name", "note", "praying_count",
    "prayer_count", "status", "created_at", "updated_at", "prayer_key", "ends_at", "image_url",
  ],
};

const DEFAULTS: Record<string, Row> = {
  trapeza_recipes: { status: "pending", photo_url: null },
  trapeza_recipe_reviews: { status: "published", photo_urls: [] },
  prayer_campaigns: { status: "active", image_url: null },
};

export type World = {
  /** Rows by table. null is a table whose migration has not been applied. */
  tables: Record<string, Row[] | null>;
  /** Every stored object, as "<bucket>/<path>". */
  objects: Set<string>;
  /** Accounts that exist: upload_owners.owner_id references auth.users. */
  users: Set<string>;
  /** Server-side page cap, below what a caller may ask for. */
  maxRows: number;
  /** Failures to inject: a table name, or a storage call. */
  fail: { insert: string | null; update: string | null; upload: boolean; copy: boolean };
  /** Runs once, just before the next update is applied: for a write that races. */
  beforeUpdate: (() => void) | null;
  calls: { upload: number; copy: number; remove: number; writes: number };
};

export function world(): World {
  return {
    tables: {
      upload_owners: [],
      trapeza_recipes: [],
      trapeza_recipe_reviews: [],
      prayer_campaigns: [],
    },
    objects: new Set(),
    users: new Set(),
    maxRows: Infinity,
    fail: { insert: null, update: null, upload: false, copy: false },
    beforeUpdate: null,
    calls: { upload: 0, copy: 0, remove: 0, writes: 0 },
  };
}

/** The public URL supabase-js builds for bucket/path. */
export function publicUrl(bucket: string, path: string): string {
  return encodeURI(`${STORAGE}/object/public/${bucket}/${path}`);
}

class Query {
  private op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private filters: ((row: Row) => boolean)[] = [];
  private named = new Set<string>();
  private values: Row = {};
  private conflict: string[] = [];
  private window: [number, number] = [0, Infinity];
  private sortBy = "id";
  private one: "maybe" | "single" | null = null;

  constructor(
    private w: World,
    private table: string,
  ) {}

  select(columns = "*") {
    for (const c of columns.split(",").map((s) => s.trim())) if (c && c !== "*") this.named.add(c);
    return this;
  }
  insert(values: Row) {
    this.op = "insert";
    this.values = values;
    return this;
  }
  upsert(values: Row, opts: { onConflict: string }) {
    this.op = "upsert";
    this.values = values;
    this.conflict = opts.onConflict.split(",").map((s) => s.trim());
    return this;
  }
  update(values: Row) {
    this.op = "update";
    this.values = values;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  private where(column: string, test: (value: unknown) => boolean) {
    this.named.add(column);
    this.filters.push((row) => test(row[column]));
    return this;
  }
  eq(column: string, value: unknown) {
    return this.where(column, (v) => v === value);
  }
  neq(column: string, value: unknown) {
    return this.where(column, (v) => v !== value);
  }
  in(column: string, values: unknown[]) {
    return this.where(column, (v) => values.includes(v));
  }
  contains(column: string, values: unknown[]) {
    return this.where(column, (v) => Array.isArray(v) && values.every((x) => v.includes(x)));
  }
  order(column: string) {
    this.named.add(column);
    this.sortBy = column;
    return this;
  }
  range(from: number, to: number) {
    this.window = [from, to];
    return this;
  }
  limit(count: number) {
    this.window = [0, count - 1];
    return this;
  }
  maybeSingle() {
    this.one = "maybe";
    return Promise.resolve(this.run());
  }
  single() {
    this.one = "single";
    return Promise.resolve(this.run());
  }
  then<T>(resolve: (value: Result) => T, reject?: (reason: unknown) => T) {
    return Promise.resolve()
      .then(() => this.run())
      .then(resolve, reject);
  }

  private run(): Result {
    const rows = this.w.tables[this.table];
    const columns = COLUMNS[this.table];
    if (!rows || !columns) {
      return {
        data: null,
        error: {
          code: "PGRST205",
          message: `Could not find the table 'public.${this.table}' in the schema cache`,
        },
      };
    }
    const unknown = [...this.named, ...Object.keys(this.values)].find((c) => !columns.includes(c));
    if (unknown) {
      return {
        data: null,
        error: { code: "42703", message: `column ${this.table}.${unknown} does not exist` },
      };
    }
    const result = this.apply(rows);
    if (result.error || !this.one) return result;
    const list = result.data as Row[];
    if (this.one === "single" && list.length !== 1) {
      return { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } };
    }
    return { data: list[0] ?? null, error: null };
  }

  private apply(rows: Row[]): Result {
    const copy = (list: Row[]) => list.map((row) => structuredClone(row));
    const hit = () => rows.filter((row) => this.filters.every((test) => test(row)));

    if (this.op === "select") {
      const sorted = hit().sort((a, b) => String(a[this.sortBy]).localeCompare(String(b[this.sortBy])));
      const [from, to] = this.window;
      return { data: copy(sorted.slice(from, to + 1).slice(0, this.w.maxRows)), error: null };
    }

    this.w.calls.writes++;
    if (this.op === "delete") {
      const gone = hit();
      this.w.tables[this.table] = rows.filter((row) => !gone.includes(row));
      return { data: copy(gone), error: null };
    }
    if (this.op === "update") {
      const before = this.w.beforeUpdate;
      this.w.beforeUpdate = null;
      before?.();
      if (this.w.fail.update === this.table) return { data: null, error: { code: "XX000", message: "boom" } };
      const changed = hit();
      for (const row of changed) Object.assign(row, structuredClone(this.values));
      return { data: copy(changed), error: null };
    }

    if (this.w.fail.insert === this.table) return { data: null, error: { code: "XX000", message: "boom" } };
    if (this.table === "upload_owners") {
      const { bucket, path, owner_id } = this.values;
      if (rows.some((row) => row.bucket === bucket && row.path === path)) {
        return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
      }
      if (!this.w.users.has(String(owner_id))) {
        return {
          data: null,
          error: { code: "23503", message: 'insert or update on table "upload_owners" violates foreign key constraint' },
        };
      }
    }
    const existing =
      this.op === "upsert"
        ? rows.find((row) => this.conflict.every((c) => row[c] === this.values[c]))
        : undefined;
    if (existing) {
      Object.assign(existing, structuredClone(this.values));
      return { data: copy([existing]), error: null };
    }
    const now = new Date().toISOString();
    const row: Row = {
      ...(hasColumn(this.table, "id") ? { id: crypto.randomUUID() } : {}),
      ...(hasColumn(this.table, "updated_at") ? { updated_at: now } : {}),
      created_at: now,
      ...DEFAULTS[this.table],
      ...structuredClone(this.values),
    };
    rows.push(row);
    return { data: copy([row]), error: null };
  }
}

function hasColumn(table: string, column: string): boolean {
  return COLUMNS[table].includes(column);
}

/** The fake client. Cast it to whatever the code under test expects. */
export function client(w: World) {
  const buckets = new Set<string>();
  return {
    from: (table: string) => new Query(w, table),
    storage: {
      createBucket: async (name: string) => {
        if (buckets.has(name)) return { data: null, error: { message: "The resource already exists" } };
        buckets.add(name);
        return { data: { name }, error: null };
      },
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: publicUrl(bucket, path) } }),
        upload: async (path: string) => {
          w.calls.upload++;
          if (w.fail.upload) return { data: null, error: { message: "storage is down" } };
          if (w.objects.has(`${bucket}/${path}`)) {
            return { data: null, error: { message: "The resource already exists" } };
          }
          w.objects.add(`${bucket}/${path}`);
          return { data: { path }, error: null };
        },
        copy: async (from: string, to: string) => {
          w.calls.copy++;
          if (w.fail.copy) return { data: null, error: { message: "storage is down" } };
          if (!w.objects.has(`${bucket}/${from}`)) {
            return { data: null, error: { message: "Object not found", statusCode: "404" } };
          }
          if (w.objects.has(`${bucket}/${to}`)) {
            return { data: null, error: { message: "The resource already exists" } };
          }
          w.objects.add(`${bucket}/${to}`);
          return { data: { path: to }, error: null };
        },
        remove: async (paths: string[]) => {
          w.calls.remove++;
          for (const path of paths) w.objects.delete(`${bucket}/${path}`);
          return { data: [], error: null };
        },
      }),
    },
  };
}
