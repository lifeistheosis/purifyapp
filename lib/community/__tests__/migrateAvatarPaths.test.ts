import { describe, expect, it } from "vitest";

import { migrateAvatarPaths, redact } from "@/scripts/migrate-avatar-paths.mjs";

/**
 * scripts/migrate-avatar-paths.mjs, run against an in-memory stand-in for the
 * few Supabase calls it makes. The owner runs it once against production, so
 * this is where its behaviour is pinned before that: what a dry run leaves
 * alone, what --apply moves, that a copy is written down as its uploader's
 * and never as whoever pointed at it, that a failure part way never leaves
 * anything naming a file that is gone, that it stops at once when the
 * database is not ready for it, and that a second run does nothing.
 */

const STORAGE = "https://proj.supabase.co/storage/v1";
const PREFIX = `${STORAGE}/object/public/avatars/`;
const url = (path: string) => PREFIX + path;

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";
const E = "55555555-5555-4555-8555-555555555555";
const G = "66666666-6666-4666-8666-666666666666";
/** An account that has since been deleted. */
const GONE = "77777777-7777-4777-8777-777777777777";

const A_NOW = `u/${A}/1700000000001.jpg`;
const A_OLD = `u/${A}/1700000000000.jpg`;
const A_ORPHAN = `u/${A}/1600000000000.webp`;
const E_NOW = `u/${E}/1700000000005.png`;
const G_NOW = `u/${G}/1700000000006.webp`;
const GONE_PIC = `u/${GONE}/1700000000007.jpg`;
const GOOGLE = "https://lh3.googleusercontent.com/a/ACg8ocExample=s96-c";
const ELSEWHERE = `https://elsewhere.example/storage/v1/object/public/avatars/u/${D}/1.jpg`;
const RANDOM = /^a\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

type Row = Record<string, unknown>;
type User = {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
};

function world() {
  return {
    users: [
      { id: A, email: "a@example.com", user_metadata: { display_name: "Anna", avatar_url: url(A_NOW) }, app_metadata: { provider: "email", providers: ["email"] } },
      { id: B, email: "b@example.com", user_metadata: { avatar_url: GOOGLE }, app_metadata: { provider: "google" } },
      // Pointed their own metadata at Anna's picture, which anyone can do.
      { id: C, email: "c@example.com", user_metadata: { avatar_url: url(A_NOW) }, app_metadata: { provider: "email" } },
      { id: D, email: "d@example.com", user_metadata: { avatar_url: ELSEWHERE }, app_metadata: {} },
      // A picture from before the picture of record: metadata only.
      { id: E, email: "e@example.com", user_metadata: { avatar_url: url(E_NOW) }, app_metadata: { provider: "email" } },
      // Uploaded a picture, then signed in with Google, which rewrote metadata.
      { id: G, email: "g@example.com", user_metadata: { avatar_url: GOOGLE }, app_metadata: { provider: "google" } },
    ] as User[],
    tables: {
      upload_owners: [],
      profiles: [
        { id: A, avatar_url: url(A_NOW) },
        { id: B, avatar_url: null },
        { id: C, avatar_url: null },
        { id: D, avatar_url: null },
        { id: E, avatar_url: null },
        { id: G, avatar_url: url(G_NOW) },
      ],
      community_posts: [
        { id: "p1", user_id: A, author_avatar: url(A_NOW) },
        // Written before Anna changed her picture: still names the old one.
        { id: "p0", user_id: A, author_avatar: url(A_OLD) },
        { id: "p2", user_id: B, author_avatar: GOOGLE },
        { id: "p3", user_id: E, author_avatar: url(E_NOW) },
        { id: "p4", user_id: D, author_avatar: null },
      ],
      community_post_replies: [
        { id: "r1", user_id: A, author_avatar: url(A_NOW) },
        { id: "r2", user_id: C, author_avatar: url(A_NOW) },
      ],
      trapeza_recipe_reviews: [
        { id: "k1", author_id: A, author_avatar: url(A_NOW) },
        // Reviews follow no trigger: this one still names her older picture.
        { id: "k0", author_id: A, author_avatar: url(A_OLD) },
      ],
    } as Record<string, Row[] | null>,
    objects: new Set([A_NOW, A_OLD, A_ORPHAN, E_NOW, G_NOW]),
    failUpdate: null as string | null,
    failInsert: null as string | null,
    /** False while 20261008000000_avatar_random_path.sql has not been applied. */
    checkRelaxed: true,
    /** False before 20261003000000_profile_pictures.sql: no avatar_url column. */
    pictureColumn: true,
    /** Server-side page caps, below the script's own page size. */
    maxRows: Infinity,
    maxUsers: Infinity,
    calls: { copy: 0, remove: 0, updateUser: 0, writes: 0 },
  };
}
type World = ReturnType<typeof world>;

function likeToRegExp(pattern: string) {
  const body = pattern.split("%").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp(`^${body}$`);
}

/** The handful of supabase-js calls the script makes, over `w`. */
function client(w: World) {
  class Query {
    private filters: ((r: Row) => boolean)[] = [];
    private op: "select" | "update" | "insert" | "delete" = "select";
    private values: Row = {};
    private window: [number, number] = [0, Infinity];
    constructor(private table: string) {}
    select() {
      return this;
    }
    order() {
      return this;
    }
    like(col: string, pattern: string) {
      const re = likeToRegExp(pattern);
      this.filters.push((r) => typeof r[col] === "string" && re.test(r[col] as string));
      return this;
    }
    eq(col: string, value: unknown) {
      this.filters.push((r) => r[col] === value);
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
    update(values: Row) {
      this.op = "update";
      this.values = values;
      return this;
    }
    insert(values: Row) {
      this.op = "insert";
      this.values = values;
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    then<T>(resolve: (v: { data: unknown; error: unknown }) => T) {
      return Promise.resolve(this.run()).then(resolve);
    }
    private run() {
      const rows = w.tables[this.table];
      if (!rows) {
        return { data: null, error: { code: "PGRST205", message: `Could not find the table 'public.${this.table}' in the schema cache` } };
      }
      if (this.table === "profiles" && !w.pictureColumn) {
        return { data: null, error: { code: "42703", message: "column profiles.avatar_url does not exist" } };
      }
      const hit = [...rows].sort((x, y) => String(x.id).localeCompare(String(y.id))).filter((r) => this.filters.every((f) => f(r)));
      if (this.op === "select") {
        const [from, to] = this.window;
        return { data: hit.slice(from, to + 1).slice(0, w.maxRows).map((r) => ({ ...r })), error: null };
      }
      w.calls.writes++;
      if (this.op === "delete") {
        w.tables[this.table] = rows.filter((r) => !hit.includes(r));
        return { data: null, error: null };
      }
      if (this.op === "insert") {
        if (w.failInsert === this.table) return { data: null, error: { code: "XX000", message: "boom" } };
        // upload_owners.owner_id references auth.users.
        if (this.table === "upload_owners" && !w.users.some((u) => u.id === this.values.owner_id)) {
          return { data: null, error: { code: "23503", message: "violates foreign key constraint" } };
        }
        rows.push({ ...this.values });
        return { data: null, error: null };
      }
      if (w.failUpdate === this.table) return { data: null, error: { code: "XX000", message: "boom" } };
      if (this.table === "profiles") {
        const next = this.values.avatar_url;
        // The column's check, as it stands before the migration.
        if (hit.length > 0 && typeof next === "string" && next.includes("/avatars/a/") && !w.checkRelaxed) {
          return { data: null, error: { code: "23514", message: 'violates check constraint "profiles_avatar_url_own_upload"' } };
        }
        for (const r of hit) {
          Object.assign(r, this.values);
          // profiles_author_profile_sync: posts and replies follow the picture.
          if (typeof next === "string") {
            for (const table of ["community_posts", "community_post_replies"]) {
              for (const post of w.tables[table] ?? []) if (post.user_id === r.id) post.author_avatar = next;
            }
          }
        }
      } else {
        for (const r of hit) Object.assign(r, this.values);
      }
      return { data: hit.map((r) => ({ id: r.id })), error: null };
    }
  }

  const bucket = {
    getPublicUrl: (path: string) => ({ data: { publicUrl: encodeURI(`${STORAGE}/object/public/avatars/${path}`) } }),
    copy: async (from: string, to: string) => {
      w.calls.copy++;
      if (!w.objects.has(from)) return { data: null, error: { message: "Object not found", statusCode: "404" } };
      if (w.objects.has(to)) return { data: null, error: { message: "The resource already exists" } };
      w.objects.add(to);
      return { data: { path: to }, error: null };
    },
    remove: async (paths: string[]) => {
      w.calls.remove++;
      for (const p of paths) w.objects.delete(p);
      return { data: [], error: null };
    },
  };

  const copyUser = (u: User): User => JSON.parse(JSON.stringify(u));
  return {
    storage: { from: () => bucket },
    from: (table: string) => new Query(table),
    auth: {
      admin: {
        listUsers: async ({ page, perPage }: { page: number; perPage: number }) => {
          const size = Math.min(perPage, w.maxUsers);
          return { data: { users: w.users.slice((page - 1) * size, page * size).map(copyUser) }, error: null };
        },
        getUserById: async (id: string) => {
          const u = w.users.find((x) => x.id === id);
          return u ? { data: { user: copyUser(u) }, error: null } : { data: { user: null }, error: { status: 404 } };
        },
        // GoTrue merges metadata key by key.
        updateUserById: async (id: string, attrs: Partial<Pick<User, "user_metadata" | "app_metadata">>) => {
          w.calls.updateUser++;
          const u = w.users.find((x) => x.id === id)!;
          Object.assign(u.user_metadata, attrs.user_metadata ?? {});
          Object.assign(u.app_metadata, attrs.app_metadata ?? {});
          return { data: { user: copyUser(u) }, error: null };
        },
      },
    },
  };
}

async function run(w: World, opts: { apply?: boolean; limit?: number } = {}) {
  const lines: string[] = [];
  const result = await migrateAvatarPaths(client(w), { ...opts, log: (s: string) => lines.push(s) });
  return { result, out: lines.join("\n") };
}

const snapshot = (w: World) => JSON.stringify({ users: w.users, tables: w.tables, objects: [...w.objects].sort() });

/** Every reference to our bucket: accounts, profiles and rows alike. */
function references(w: World): string[] {
  const out = w.users.map((u) => u.user_metadata.avatar_url as string);
  for (const [table, rows] of Object.entries(w.tables)) {
    if (table === "upload_owners") continue;
    for (const r of rows ?? []) out.push((table === "profiles" ? r.avatar_url : r.author_avatar) as string);
  }
  return out.filter((u) => typeof u === "string" && u.startsWith(PREFIX));
}

/** References whose file does not exist: a picture that would not load. */
function dangling(w: World): string[] {
  return references(w).filter((u) => !w.objects.has(decodeURI(u.slice(PREFIX.length))));
}

const row = (w: World, table: string, id: string) => w.tables[table]!.find((r) => r.id === id)!;
const user = (w: World, id: string) => w.users.find((u) => u.id === id)!;
/** Who the record gives a copy to. */
const ownerOf = (w: World, path: string) => w.tables.upload_owners!.find((r) => r.bucket === "avatars" && r.path === path)?.owner_id;
const pathOf = (address: unknown) => (address as string).slice(PREFIX.length);

describe("migrate-avatar-paths, dry run", () => {
  it("counts and writes nothing", async () => {
    const w = world();
    const before = snapshot(w);
    const { result, out } = await run(w);
    expect(snapshot(w)).toBe(before);
    expect(w.calls).toEqual({ copy: 0, remove: 0, updateUser: 0, writes: 0 });
    expect(result).toEqual({ ok: true, moved: 0, remaining: 4 });
    expect(out).toMatch(/profiles whose picture is on a u\/<id> path\s+2/);
    expect(out).toMatch(/old pictures to move\s+4/);
    expect(out).toMatch(/of which a profile names\s+2/);
    expect(out).toMatch(/u\/ URLs on another host, left alone\s+1/);
  });

  it("finds everything when the server pages smaller than the script asks", async () => {
    const w = world();
    w.maxRows = 1;
    w.maxUsers = 1;
    const { result } = await run(w);
    expect(result.remaining).toBe(4);
  });
});

describe("migrate-avatar-paths --apply", () => {
  it("moves every named picture to a random path, writes down whose it is, and repoints every copy", async () => {
    const w = world();
    const { result, out } = await run(w, { apply: true });
    expect(result).toEqual({ ok: true, moved: 3, remaining: 0 });
    expect(out).toContain("Nothing names a u/<id> picture any more.");
    expect(out).toMatch(/owners written down\s+3/);

    // Anna's picture of record moved, and everything of hers follows it.
    const annaUrl = row(w, "profiles", A).avatar_url as string;
    expect(pathOf(annaUrl)).toMatch(RANDOM);
    expect(pathOf(annaUrl)).not.toContain(A);
    const anna = user(w, A);
    expect(anna.user_metadata.avatar_url).toBe(annaUrl);
    expect(anna.user_metadata.display_name).toBe("Anna");
    // Written down as hers, so her next upload may delete it.
    expect(ownerOf(w, pathOf(annaUrl))).toBe(A);
    for (const [table, id] of [
      ["community_posts", "p1"],
      // Her posts and reviews that named an OLDER picture of hers follow too.
      ["community_posts", "p0"],
      ["community_post_replies", "r1"],
      ["trapeza_recipe_reviews", "k1"],
      ["trapeza_recipe_reviews", "k0"],
    ]) {
      expect(row(w, table, id).author_avatar, id).toBe(annaUrl);
    }

    // Pointing your metadata at someone's picture moves your URL with it,
    // but never makes the file yours to delete.
    expect(user(w, C).user_metadata.avatar_url).toBe(annaUrl);
    expect(w.tables.upload_owners!.some((r) => r.owner_id === C)).toBe(false);
    expect(row(w, "community_post_replies", "r2").author_avatar).toBe(annaUrl);

    // A Google sign-in had rewritten this reader's metadata: the picture of
    // record still moves and is still written down as theirs, the Google photo stays.
    const gretaUrl = row(w, "profiles", G).avatar_url as string;
    expect(pathOf(gretaUrl)).toMatch(/^a\/.*\.webp$/);
    expect(ownerOf(w, pathOf(gretaUrl))).toBe(G);
    expect(user(w, G).user_metadata.avatar_url).toBe(GOOGLE);

    // A picture only metadata names, from before the picture of record.
    const elleUrl = user(w, E).user_metadata.avatar_url as string;
    expect(pathOf(elleUrl)).toMatch(/^a\/.*\.png$/);
    expect(ownerOf(w, pathOf(elleUrl))).toBe(E);
    expect(row(w, "community_posts", "p3").author_avatar).toBe(elleUrl);

    // Nothing is kept in auth metadata about any of it.
    for (const u of w.users) expect(Object.keys(u.app_metadata)).not.toContain("avatar_path");

    // Untouched: a Google picture, another host, and files nothing names.
    expect(user(w, B).user_metadata.avatar_url).toBe(GOOGLE);
    expect(row(w, "community_posts", "p2").author_avatar).toBe(GOOGLE);
    expect(user(w, D).user_metadata.avatar_url).toBe(ELSEWHERE);
    expect(w.objects.has(A_ORPHAN)).toBe(true);
    expect(w.objects.has(A_OLD)).toBe(true);

    expect([A_NOW, E_NOW, G_NOW].some((p) => w.objects.has(p))).toBe(false);
    expect(references(w).filter((u) => u.includes("/avatars/u/"))).toEqual([]);
    expect(dangling(w)).toEqual([]);
    // Every record names a file that exists.
    for (const r of w.tables.upload_owners!) expect(w.objects.has(r.path as string)).toBe(true);
  });

  it("does nothing the second time", async () => {
    const w = world();
    await run(w, { apply: true });
    const after = snapshot(w);
    const calls = { ...w.calls };
    const { result } = await run(w, { apply: true });
    expect(result).toEqual({ ok: true, moved: 0, remaining: 0 });
    expect(w.calls.copy).toBe(calls.copy);
    expect(w.calls.remove).toBe(calls.remove);
    expect(snapshot(w)).toBe(after);
  });

  it("stops before writing while the owners table is not there", async () => {
    const w = world();
    w.tables.upload_owners = null;
    const before = snapshot(w);
    const { result, out } = await run(w, { apply: true });
    expect(result).toEqual({ ok: false, moved: 0, remaining: 4 });
    expect(out).toContain("The upload_owners table is not there");
    expect(snapshot(w)).toBe(before);
    expect(w.calls).toEqual({ copy: 0, remove: 0, updateUser: 0, writes: 0 });
  });

  it("stops at once, with nothing moved, while the database still refuses the new path", async () => {
    const w = world();
    w.checkRelaxed = false;
    const before = snapshot(w);
    const { result, out } = await run(w, { apply: true });
    expect(result).toEqual({ ok: false, moved: 0, remaining: 4 });
    expect(out).toContain("Apply 20261008000000_avatar_random_path.sql first");
    expect(out).toMatch(/pictures copied to a random path\s+0/);
    expect(out).toMatch(/owners written down\s+0/);
    expect(snapshot(w)).toBe(before);
    expect(dangling(w)).toEqual([]);
  });

  it("moves nothing it could not write an owner down for", async () => {
    const w = world();
    w.failInsert = "upload_owners";
    const before = snapshot(w);
    const { result, out } = await run(w, { apply: true });
    expect(result.ok).toBe(false);
    expect(out).toMatch(/owners not written down, picture not moved\s+4/);
    expect(snapshot(w)).toBe(before);
  });

  it("still moves a picture whose uploader's account is gone, with no owner", async () => {
    const w = world();
    // Somebody's metadata still names a picture of an account since deleted.
    w.objects.add(GONE_PIC);
    user(w, B).user_metadata.avatar_url = url(GONE_PIC);
    const { result, out } = await run(w, { apply: true });
    expect(result).toEqual({ ok: true, moved: 4, remaining: 0 });
    expect(out).toMatch(/moved with no owner, the account is gone\s+1/);
    const moved = pathOf(user(w, B).user_metadata.avatar_url);
    expect(moved).toMatch(RANDOM);
    expect(w.objects.has(moved)).toBe(true);
    expect(ownerOf(w, moved)).toBeUndefined();
    expect(w.objects.has(GONE_PIC)).toBe(false);
  });

  it("keeps an old file while anything still names it, and finishes on the next run", async () => {
    const w = world();
    w.failUpdate = "community_post_replies";
    const first = await run(w, { apply: true });
    expect(first.result.ok).toBe(false);
    expect(first.out).toMatch(/old files kept, a reference did not move\s+3/);
    expect(w.objects.has(A_NOW)).toBe(true);
    expect(dangling(w)).toEqual([]);

    // Only somebody else's reply still names Anna's old file; the rest
    // finished moving on the first run, their old files unused.
    w.failUpdate = null;
    const second = await run(w, { apply: true });
    expect(second.result).toEqual({ ok: true, moved: 1, remaining: 0 });
    expect(w.objects.has(A_NOW)).toBe(false);
    expect(references(w).filter((u) => u.includes("/avatars/u/"))).toEqual([]);
    expect(dangling(w)).toEqual([]);
  });

  it("leaves a picture that is already gone, and says so", async () => {
    const w = world();
    w.objects.delete(E_NOW);
    const { result, out } = await run(w, { apply: true });
    expect(result.ok).toBe(false);
    expect(out).toMatch(/old pictures already gone \(references left\)\s+1/);
    expect(user(w, E).user_metadata.avatar_url).toBe(url(E_NOW));
    expect(row(w, "community_posts", "p3").author_avatar).toBe(url(E_NOW));
    expect(row(w, "community_posts", "p1").author_avatar).toBe(row(w, "profiles", A).avatar_url);
    expect(w.tables.upload_owners!.some((r) => r.owner_id === E)).toBe(false);
  });

  it("skips a table that is not there yet", async () => {
    const w = world();
    w.tables.trapeza_recipe_reviews = null;
    const { result, out } = await run(w, { apply: true });
    expect(result).toEqual({ ok: true, moved: 3, remaining: 0 });
    expect(out).toMatch(/kitchen reviews\s+table not there, skipped/);
  });

  it("still moves what metadata names where there is no picture of record yet", async () => {
    const w = world();
    w.pictureColumn = false;
    for (const profile of w.tables.profiles!) profile.avatar_url = null;
    const { result, out } = await run(w, { apply: true });
    expect(out).toMatch(/profiles\s+no picture column yet, skipped/);
    // Anna's current and older picture and Elle's: the three that an account
    // or a row names. Each copy is written down as its uploader's.
    expect(result).toEqual({ ok: true, moved: 3, remaining: 0 });
    expect(ownerOf(w, pathOf(user(w, A).user_metadata.avatar_url))).toBe(A);
    expect(w.tables.upload_owners!.some((r) => r.owner_id === C)).toBe(false);
    expect(references(w).filter((u) => u.includes("/avatars/u/"))).toEqual([]);
    expect(dangling(w)).toEqual([]);
  });

  it("moves no more than --limit", async () => {
    const w = world();
    const { result } = await run(w, { apply: true, limit: 1 });
    expect(result).toEqual({ ok: true, moved: 1, remaining: 2 });
    expect(dangling(w)).toEqual([]);
  });

  it("prints no email, id, URL or path", async () => {
    const w = world();
    const refused = world();
    refused.checkRelaxed = false;
    const absent = world();
    absent.tables.upload_owners = null;
    const outs = [
      (await run(world())).out,
      (await run(w, { apply: true })).out,
      (await run(refused, { apply: true })).out,
      (await run(absent, { apply: true })).out,
    ];
    for (const out of outs) {
      expect(out).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      expect(out).not.toContain("@");
      expect(out).not.toContain("/storage/v1/");
    }
  });
});

describe("redact", () => {
  it("takes out uuids and email addresses", () => {
    expect(redact(`no user ${A} for a@example.com`)).toBe("no user <id> for <email>");
  });
});
