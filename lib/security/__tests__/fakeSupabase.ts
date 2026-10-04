/**
 * An in-memory stand-in for the supabase-js calls that the upload routes,
 * the profile banner and picture routes, lib/security/uploadOwners.ts and
 * scripts/migrate-upload-paths.mjs make.
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
 *   - profiles.avatar_url is held by its CHECK, the one before or the one
 *     after 20261008000000_avatar_random_path.sql (World.avatarCheck), and a
 *     new picture reaches the reader's posts and replies as the trigger in
 *     20261003000000_profile_pictures.sql carries it;
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
  // 20260518000000 (the table), then 20260526000000, 20260527000100, 20260719000000,
  // 20260802000000, 20260905000100, 20260914000000, 20261001000000 (handle, bio, banner),
  // 20261002000000 (parish), 20261003000000 (avatar_url), 20261005000000 (social_links),
  // 20261006000000
  profiles: [
    "id", "display_name", "joined_at", "updated_at", "has_password", "calendar_reckoning",
    "calendar_tradition", "preferred_language", "focus", "depth", "show_supporter_mark",
    "patron_saint", "handle", "handle_changed_at", "bio", "status_text", "favorite_verse",
    "banner_color", "banner_url", "theme_primary", "theme_accent", "avatar_decoration",
    "profile_effect", "parish", "prayer_request_at", "now_reading", "now_reading_at",
    "show_now_reading", "profile_private", "hide_posts", "hide_joined", "avatar_url",
    "social_links", "name_color", "banner_motion", "hidden_badges", "push_community", "show_streak",
  ],
  // 20260612000000_entitlements.sql, 20260713000000_entitlements_pro.sql, 20260914000100_email_sends.sql
  entitlements: [
    "user_id", "is_supporter", "plus_until", "plus_source", "updated_at", "pro_until",
    "billing_issue_at", "auto_renew",
  ],
  // 20260801000100_community_safety.sql, 20261001000000_profiles_badges.sql (profile_id)
  community_reports: [
    "id", "post_id", "reply_id", "profile_id", "reporter_id", "reason", "status",
    "handled_by_email", "handled_at", "created_at",
  ],
  // 20260722000000_community.sql (the table), then 20260801000100, 20260811000100,
  // 20260826000000, 20260901000000, 20260901000100, 20260905000100, 20261001000000,
  // 20261005000000
  community_posts: [
    "id", "user_id", "kind", "title", "body", "quote_text", "quote_source", "quote_href",
    "author_name", "author_avatar", "reply_count", "status", "created_at", "removed_reason",
    "removed_by_email", "group_id", "like_count", "dislike_count", "author_verified", "pinned_at",
    "pinned_by", "author_plus_until", "author_pro_until", "author_handle", "author_decoration",
    "category", "chapter_ref", "feast_day", "feast_slug", "author_clergy", "author_name_color",
    "amen_count", "praying_count", "glory_count", "clergy_reply_count", "mod_cleared_at",
  ],
  // 20260722000000_community.sql (the table), then 20260801000100, 20260826000000,
  // 20260905000100, 20261001000000, 20261005000000
  community_post_replies: [
    "id", "post_id", "user_id", "body", "author_name", "author_avatar", "created_at", "status",
    "removed_reason", "removed_by_email", "like_count", "dislike_count", "author_plus_until",
    "author_pro_until", "author_handle", "author_decoration", "author_clergy", "author_name_color",
    "amen_count", "praying_count", "glory_count", "mod_cleared_at",
  ],
  // 20261005000000_community_three.sql
  community_mod_log: [
    "id", "actor_id", "actor_name", "actor_email", "action", "target_kind", "target_id",
    "summary", "created_at",
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
  /** Columns, by table, that a migration not applied yet would have added. */
  missing: Record<string, string[]>;
  /** Every stored object, as "<bucket>/<path>". */
  objects: Set<string>;
  /** Accounts that exist: upload_owners.owner_id references auth.users. */
  users: Set<string>;
  /** Each account's user_metadata, as auth.admin.updateUserById leaves it. */
  metadata: Map<string, Row>;
  /**
   * The CHECK on profiles.avatar_url. "own_upload" is the one
   * 20261003000000_profile_pictures.sql made, which holds a picture to the
   * reader's own u/<id>/ folder; "shape" is the one
   * 20261008000000_avatar_random_path.sql puts in its place, which also
   * takes a/<random uuid>.
   */
  avatarCheck: "own_upload" | "shape";
  /** Server-side page cap, below what a caller may ask for. */
  maxRows: number;
  /** Failures to inject: a table name, or a storage call. */
  fail: {
    insert: string | null;
    update: string | null;
    upload: boolean;
    copy: boolean;
    /** A bucket whose deletes fail. */
    remove: string | null;
    deleteUser: boolean;
    updateUser: boolean;
  };
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
    missing: {},
    objects: new Set(),
    users: new Set(),
    metadata: new Map(),
    avatarCheck: "shape",
    maxRows: Infinity,
    fail: {
      insert: null, update: null, upload: false, copy: false, remove: null, deleteUser: false,
      updateUser: false,
    },
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
  like(column: string, pattern: string) {
    // SQL LIKE: % is any run of characters, _ any one, the rest itself.
    const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const body = pattern
      .split("%")
      .map((part) => part.split("_").map(literal).join("."))
      .join(".*");
    const re = new RegExp(`^${body}$`);
    return this.where(column, (v) => typeof v === "string" && re.test(v));
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
    const absent = this.w.missing[this.table] ?? [];
    const columns = COLUMNS[this.table]?.filter((c) => !absent.includes(c));
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
      if (this.table === "profiles" && "avatar_url" in this.values) {
        const picture = this.values.avatar_url;
        if (changed.some((row) => !avatarAllowed(this.w.avatarCheck, row.id, picture))) {
          return {
            data: null,
            error: {
              code: "23514",
              message: `new row for relation "profiles" violates check constraint "profiles_avatar_url_${this.w.avatarCheck}"`,
            },
          };
        }
      }
      for (const row of changed) {
        const shown = row.avatar_url;
        Object.assign(row, structuredClone(this.values));
        if (this.table === "profiles") followPicture(this.w, row, shown);
      }
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

const AVATARS = String.raw`^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/`;
const OWN_FOLDER = new RegExp(AVATARS + String.raw`u/[0-9a-f-]{36}/[0-9]{10,16}\.(jpg|png|webp)$`);
const RANDOM_NAME = new RegExp(
  AVATARS + String.raw`a/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$`,
);

/** What the CHECK on profiles.avatar_url lets a row hold. */
function avatarAllowed(check: World["avatarCheck"], id: unknown, url: unknown): boolean {
  if (url === null || url === undefined) return true;
  if (typeof url !== "string" || url.length > 600) return false;
  if (OWN_FOLDER.test(url) && url.includes(`/avatars/u/${String(id)}/`)) return true;
  return check === "shape" && RANDOM_NAME.test(url);
}

/**
 * profiles_author_profile_sync, the picture half: a picture that changed,
 * and is not null, reaches every post and reply of that reader's.
 */
function followPicture(w: World, profile: Row, before: unknown) {
  const picture = profile.avatar_url;
  if (picture === null || picture === undefined || picture === before) return;
  for (const table of ["community_posts", "community_post_replies"]) {
    for (const row of w.tables[table] ?? []) if (row.user_id === profile.id) row.author_avatar = picture;
  }
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
          if (w.fail.remove === bucket) return { data: null, error: { message: "storage is down" } };
          for (const path of paths) w.objects.delete(`${bucket}/${path}`);
          return { data: [], error: null };
        },
        // What the storage API answers for a folder: the names directly
        // under it, a nested folder as one entry with no id.
        list: async (folder: string, opts: { limit?: number; offset?: number } = {}) => {
          const under = `${bucket}/${folder}/`;
          const seen = new Map<string, { name: string; id: string | null }>();
          for (const object of [...w.objects].sort()) {
            if (!object.startsWith(under)) continue;
            const rest = object.slice(under.length);
            const nested = rest.includes("/");
            const name = nested ? rest.slice(0, rest.indexOf("/")) : rest;
            if (!seen.has(name)) seen.set(name, { name, id: nested ? null : `id-${name}` });
          }
          const offset = opts.offset ?? 0;
          return { data: [...seen.values()].slice(offset, offset + (opts.limit ?? 100)), error: null };
        },
      }),
    },
    auth: {
      admin: {
        // GoTrue merges user_metadata key by key, and a null deletes its key.
        updateUserById: async (id: string, attrs: { user_metadata?: Row }) => {
          if (w.fail.updateUser) return { data: { user: null }, error: { message: "Database error updating user" } };
          if (!w.users.has(id)) return { data: { user: null }, error: { message: "User not found", status: 404 } };
          const metadata = w.metadata.get(id) ?? {};
          for (const [key, value] of Object.entries(attrs.user_metadata ?? {})) {
            if (value === null) delete metadata[key];
            else metadata[key] = structuredClone(value);
          }
          w.metadata.set(id, metadata);
          return { data: { user: { id, user_metadata: structuredClone(metadata) } }, error: null };
        },
        // Deleting an account takes the rows that reference auth.users with
        // it, as each table's foreign key says.
        deleteUser: async (id: string) => {
          if (w.fail.deleteUser) return { data: { user: null }, error: { message: "Database error deleting user" } };
          if (!w.users.has(id)) return { data: { user: null }, error: { message: "User not found", status: 404 } };
          w.users.delete(id);
          for (const [table, column, rule] of ACCOUNT_KEYS) {
            const rows = w.tables[table];
            if (!rows) continue;
            if (rule === "cascade") w.tables[table] = rows.filter((row) => row[column] !== id);
            else for (const row of rows) if (row[column] === id) row[column] = null;
          }
          return { data: { user: { id } }, error: null };
        },
      },
    },
  };
}

/** Each table's foreign key to auth.users, and what its on delete does. */
const ACCOUNT_KEYS: [table: string, column: string, rule: "cascade" | "set null"][] = [
  ["upload_owners", "owner_id", "cascade"],
  ["profiles", "id", "cascade"],
  ["entitlements", "user_id", "cascade"],
  ["trapeza_recipe_reviews", "author_id", "cascade"],
  ["community_posts", "user_id", "cascade"],
  ["community_post_replies", "user_id", "cascade"],
  ["prayer_campaigns", "creator_id", "cascade"],
  ["trapeza_recipes", "author_id", "set null"],
];
