import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, PROJECT, publicUrl, world, type Row, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * The profile picture upload, run for real against an in-memory Supabase.
 *
 * It cannot be walked in a browser without signing in to, and writing to,
 * the production project. What is pinned:
 *
 *   - the picture goes to a random path that names nobody, and whose it is
 *     is written down before the file goes up;
 *   - nothing is kept that the row cannot hold or the record cannot name, so
 *     a deploy ahead of its migration stores nothing rather than a stray;
 *   - the picture it replaces is deleted only when it is provably the
 *     reader's own, whatever their metadata or their row names. Metadata is
 *     the reader's to rewrite with the public anon key, so an address there
 *     is a claim, never proof.
 */

const state = vi.hoisted(() => ({
  admin: null as unknown,
  user: null as null | { id: string; email: string; user_metadata: Record<string, unknown> },
  limited: false,
  limitKeys: [] as string[],
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));
vi.mock("@/lib/security/ratelimit", () => ({
  rateLimited: async (key: string) => {
    state.limitKeys.push(key);
    return state.limited;
  },
  ipKey: () => "test",
}));

import { POST as uploadAvatar } from "@/app/api/community/avatar/route";

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const ANNAS = "a/9a8b7c6d-1e2f-4a3b-8c4d-5e6f7a8b9c0d.jpg";
const BENS = "a/3f2b8c1e-5a4d-4e6f-8a9b-0c1d2e3f4a5b.png";
const ANNAS_OLD = `u/${ANNA}/1759400000000.jpg`;
const BENS_OLD = `u/${BEN}/1759400000001.jpg`;
const GOOGLE = "https://lh3.googleusercontent.com/a/ACg8ocJ-example";
const RANDOM = /^a\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const SITE = "https://purifyapp.net";
const NOT_OPEN = { error: "Profile pictures are not open yet.", code: "unavailable" };

let w: World;

const url = (path: string) => publicUrl("avatars", path);
const profile = (id: string) => w.tables.profiles!.find((p) => p.id === id)!;
const owners = () => w.tables.upload_owners!.map((r) => `${r.owner_id === ANNA ? "anna" : "ben"}:${r.path}`).sort();
const stored = () => [...w.objects].sort();
const metadata = (id: string) => w.metadata.get(id) ?? {};

/** Sign in, with the metadata the session carries and the account holds. */
function signIn(id: string | null, user_metadata: Record<string, unknown> = {}) {
  state.user = id ? { id, email: `${id.slice(0, 4)}@example.com`, user_metadata } : null;
  if (id) w.metadata.set(id, { ...user_metadata });
}

/**
 * A picture as an upload leaves it: the file, the record when the path is
 * random (an old path was never written down), and the profile row.
 */
function give(owner: string, path: string) {
  w.objects.add(`avatars/${path}`);
  if (path.startsWith("a/")) {
    w.tables.upload_owners!.push({ bucket: "avatars", path, owner_id: owner, created_at: "2026-10-03T00:00:00Z" });
  }
  profile(owner).avatar_url = url(path);
}

beforeEach(() => {
  w = world();
  w.users = new Set([ANNA, BEN]);
  const row = (id: string, handle: string): Row => ({ id, handle, display_name: handle, banner_url: null, avatar_url: null });
  w.tables.profiles = [row(ANNA, "anna"), row(BEN, "ben")];
  w.tables.community_posts = [];
  w.tables.community_post_replies = [];
  state.admin = client(w);
  state.limited = false;
  state.limitKeys = [];
  signIn(BEN);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", PROJECT);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function upload(type = "image/png", bytes = 3) {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(bytes)], "me", { type }));
  return uploadAvatar(new Request(`${SITE}/api/community/avatar`, { method: "POST", body: form }));
}

/** Upload, expect it saved, and answer the new picture's address and path. */
async function saved(type?: string) {
  const res = await upload(type);
  expect(res.status).toBe(200);
  const body = (await res.json()) as { ok: boolean; url: string };
  expect(body.ok).toBe(true);
  return { url: body.url, path: body.url.slice(url("").length) };
}

describe("uploading a profile picture", () => {
  it("stores it on a random path, writes down whose it is, and shows it", async () => {
    signIn(BEN, { display_name: "Ben", avatar_url: GOOGLE });
    const now = await saved();
    expect(now.path).toMatch(RANDOM);
    expect(now.url).not.toContain(BEN);
    expect(stored()).toEqual([`avatars/${now.path}`]);
    expect(owners()).toEqual([`ben:${now.path}`]);
    expect(profile(BEN).avatar_url).toBe(now.url);
    // Metadata follows, for app builds that read it, and keeps its other keys.
    expect(metadata(BEN)).toEqual({ display_name: "Ben", avatar_url: now.url });
    expect(profile(ANNA).avatar_url).toBeNull();
  });

  it("names the file by what was sent, and never the same twice", async () => {
    const paths = [
      (await saved("image/jpeg")).path,
      (await saved("image/png")).path,
      (await saved("image/webp")).path,
    ];
    expect(paths.map((p) => p.slice(p.lastIndexOf(".") + 1))).toEqual(["jpg", "png", "webp"]);
    expect(new Set(paths).size).toBe(3);
  });

  it("writes an address that 20261008000000_avatar_random_path.sql lets the column hold", async () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261008000000_avatar_random_path.sql"), "utf8");
    const shapes = [...sql.matchAll(/avatar_url ~ '([^']+)'/g)].map((m) => new RegExp(m[1]));
    expect(shapes).toHaveLength(2);
    const now = await saved("image/webp");
    expect(shapes[0].test(now.url)).toBe(true);
    expect(shapes[1].test(now.url)).toBe(false);
    // And the old shape still reads as the old shape, which stays allowed.
    expect(shapes[1].test(url(BENS_OLD))).toBe(true);
  });

  it("reaches their posts and replies, and their own kitchen reviews that showed the old picture", async () => {
    give(BEN, BENS);
    const old = url(BENS);
    w.tables.community_posts = [{ id: "p1", user_id: BEN, author_avatar: old }];
    w.tables.community_post_replies = [{ id: "r1", post_id: "p1", user_id: BEN, author_avatar: old }];
    w.tables.trapeza_recipe_reviews = [
      { id: "k1", recipe_id: "x", author_id: BEN, author_avatar: old },
      { id: "k2", recipe_id: "y", author_id: BEN, author_avatar: GOOGLE },
      { id: "k3", recipe_id: "x", author_id: ANNA, author_avatar: url(ANNAS) },
    ];
    const now = await saved();
    expect(w.tables.community_posts![0].author_avatar).toBe(now.url);
    expect(w.tables.community_post_replies![0].author_avatar).toBe(now.url);
    expect(w.tables.trapeza_recipe_reviews!.map((r) => r.author_avatar)).toEqual([now.url, GOOGLE, url(ANNAS)]);
  });

  it("is turned away without storing anything: signed out, the wrong kind of file, the wrong size", async () => {
    signIn(null);
    expect((await upload()).status).toBe(401);
    signIn(BEN);
    expect((await upload("image/gif")).status).toBe(400);
    expect((await upload("image/svg+xml")).status).toBe(400);
    expect((await upload("image/png", 0)).status).toBe(400);
    expect((await upload("image/png", 4 * 1024 * 1024 + 1)).status).toBe(400);
    const none = await uploadAvatar(new Request(`${SITE}/api/community/avatar`, { method: "POST", body: new FormData() }));
    expect(none.status).toBe(400);
    expect(stored()).toEqual([]);
    expect(owners()).toEqual([]);
    expect(w.calls.upload).toBe(0);
  });

  it("is limited per reader, not per address", async () => {
    state.limited = true;
    expect((await upload()).status).toBe(429);
    expect(state.limitKeys).toEqual([`community-avatar:${BEN}`]);
    expect(w.calls.upload).toBe(0);
    expect(owners()).toEqual([]);
  });
});

describe("what it will not keep", () => {
  it("stores nothing while the owners table is not there, or when the owner cannot be written down", async () => {
    w.tables.upload_owners = null;
    const res = await upload();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual(NOT_OPEN);
    expect(w.calls.upload).toBe(0);

    w.tables.upload_owners = [];
    w.fail.insert = "upload_owners";
    expect((await upload()).status).toBe(500);
    expect(w.calls.upload).toBe(0);
    expect(stored()).toEqual([]);
    expect(profile(BEN).avatar_url).toBeNull();
    expect(metadata(BEN)).toEqual({});
  });

  it("before the migration the column refuses a random path: nothing is left behind, the old picture stays", async () => {
    w.avatarCheck = "own_upload";
    w.objects.add(`avatars/${BENS_OLD}`);
    profile(BEN).avatar_url = url(BENS_OLD);
    signIn(BEN, { avatar_url: url(BENS_OLD) });

    const res = await upload();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual(NOT_OPEN);
    // The file did go up, and was taken back with its record.
    expect(w.calls.upload).toBe(1);
    expect(stored()).toEqual([`avatars/${BENS_OLD}`]);
    expect(owners()).toEqual([]);
    expect(profile(BEN).avatar_url).toBe(url(BENS_OLD));
    expect(metadata(BEN)).toEqual({ avatar_url: url(BENS_OLD) });

    // The same upload once the migration has run.
    w.avatarCheck = "shape";
    const now = await saved();
    expect(stored()).toEqual([`avatars/${now.path}`]);
  });

  it("takes the file and its record back when storage or the row fails", async () => {
    give(BEN, BENS);
    signIn(BEN, { avatar_url: url(BENS) });
    const before = { stored: stored(), owners: owners() };

    w.fail.upload = true;
    expect((await upload()).status).toBe(500);
    expect(stored()).toEqual(before.stored);
    expect(owners()).toEqual(before.owners);

    w.fail.upload = false;
    w.fail.update = "profiles";
    expect((await upload()).status).toBe(500);
    expect(w.calls.upload).toBe(2);
    expect(stored()).toEqual(before.stored);
    expect(owners()).toEqual(before.owners);
    expect(profile(BEN).avatar_url).toBe(url(BENS));
    expect(metadata(BEN)).toEqual({ avatar_url: url(BENS) });
  });

  it("keeps the new picture when only metadata could not be written, and the old one this once", async () => {
    give(BEN, BENS);
    signIn(BEN, { avatar_url: url(BENS) });
    w.fail.updateUser = true;
    const now = await saved();
    expect(profile(BEN).avatar_url).toBe(now.url);
    // Their metadata still names the old picture, so its file is left for it.
    expect(metadata(BEN)).toEqual({ avatar_url: url(BENS) });
    expect(stored()).toEqual([`avatars/${BENS}`, `avatars/${now.path}`].sort());
    expect(owners()).toEqual([`ben:${BENS}`, `ben:${now.path}`].sort());

    // The next upload that goes through takes both with it.
    w.fail.updateUser = false;
    const next = await saved();
    expect(stored()).toEqual([`avatars/${next.path}`]);
    expect(owners()).toEqual([`ben:${next.path}`]);
  });

  it("where profiles.avatar_url is not there yet, metadata is the whole save", async () => {
    w.missing = { profiles: ["avatar_url"] };
    for (const row of w.tables.profiles!) delete row.avatar_url;
    w.objects.add(`avatars/${BENS_OLD}`);
    signIn(BEN, { avatar_url: url(BENS_OLD) });

    const now = await saved();
    expect(metadata(BEN)).toEqual({ avatar_url: now.url });
    expect(stored()).toEqual([`avatars/${now.path}`]);
    expect(owners()).toEqual([`ben:${now.path}`]);

    // And with metadata failing too there is nowhere to save it: taken back.
    signIn(BEN, { avatar_url: now.url });
    w.fail.updateUser = true;
    expect((await upload()).status).toBe(500);
    expect(stored()).toEqual([`avatars/${now.path}`]);
    expect(owners()).toEqual([`ben:${now.path}`]);
  });
});

describe("the picture it replaces", () => {
  it("goes, file and record, once the new one is saved", async () => {
    give(BEN, BENS);
    signIn(BEN, { avatar_url: url(BENS) });
    const now = await saved();
    expect(stored()).toEqual([`avatars/${now.path}`]);
    expect(owners()).toEqual([`ben:${now.path}`]);
  });

  it("goes when it is on an old path too, which says whose it is by itself", async () => {
    w.objects.add(`avatars/${BENS_OLD}`);
    profile(BEN).avatar_url = url(BENS_OLD);
    // A row and metadata that name two different pictures of theirs: both go.
    give(BEN, BENS);
    signIn(BEN, { avatar_url: url(BENS_OLD) });
    const now = await saved();
    expect(stored()).toEqual([`avatars/${now.path}`]);
    expect(owners()).toEqual([`ben:${now.path}`]);
  });

  for (const [shape, hers] of [
    ["a random path", ANNAS],
    ["an old path", ANNAS_OLD],
  ] as const) {
    it(`stays when it is another reader's on ${shape}, whether metadata or the row names it`, async () => {
      give(ANNA, hers);
      const before = owners();

      // Metadata is Ben's to rewrite with the public anon key.
      give(BEN, BENS);
      signIn(BEN, { avatar_url: url(hers) });
      const first = await saved();
      expect(stored()).toContain(`avatars/${hers}`);
      // The control: his own picture, named by his row in the same request, did go.
      expect(stored()).not.toContain(`avatars/${BENS}`);

      // A row that names hers: no reader can write one now, but a row is not proof either.
      profile(BEN).avatar_url = url(hers);
      signIn(BEN, { avatar_url: first.url });
      const second = await saved();
      expect(stored()).toEqual([`avatars/${hers}`, `avatars/${second.path}`].sort());
      expect(owners()).toEqual([...before, `ben:${second.path}`].sort());
      expect(profile(ANNA).avatar_url).toBe(url(hers));
    });
  }

  it("stays when the address is not one of our profile pictures at all", async () => {
    const banner = "b/5d4c3b2a-1f0e-4d9c-8b7a-695847362514.jpg";
    w.objects.add(`avatars/${banner}`);
    w.tables.upload_owners!.push({ bucket: "avatars", path: banner, owner_id: BEN, created_at: "2026-10-03T00:00:00Z" });
    w.objects.add("kitchen/r/0b6c2f7e-3d1a-4c55-9e8f-12ab34cd56ef.jpg");
    for (const claimed of [
      url(banner),
      publicUrl("kitchen", "r/0b6c2f7e-3d1a-4c55-9e8f-12ab34cd56ef.jpg"),
      `https://evil.example/storage/v1/object/public/avatars/${BENS}`,
      `${url(ANNAS)}?x=1`,
      GOOGLE,
      42,
    ]) {
      signIn(BEN, { avatar_url: claimed });
      await saved();
    }
    expect(stored()).toContain(`avatars/${banner}`);
    expect(stored()).toContain("kitchen/r/0b6c2f7e-3d1a-4c55-9e8f-12ab34cd56ef.jpg");
    expect(owners()).toContain(`ben:${banner}`);
  });

  it("stays where a copy of its address could not be repointed, or its delete failed", async () => {
    give(BEN, BENS);
    signIn(BEN, { avatar_url: url(BENS) });
    w.tables.trapeza_recipe_reviews = [{ id: "k1", recipe_id: "x", author_id: BEN, author_avatar: url(BENS) }];
    w.fail.update = "trapeza_recipe_reviews";
    const first = await saved();
    expect(stored()).toEqual([`avatars/${BENS}`, `avatars/${first.path}`].sort());
    expect(owners()).toContain(`ben:${BENS}`);
    expect(w.tables.trapeza_recipe_reviews[0].author_avatar).toBe(url(BENS));

    w.fail.update = null;
    w.fail.remove = "avatars";
    signIn(BEN, { avatar_url: first.url });
    const second = await saved();
    // Not deleted, so still written down: the record is how it is found later.
    expect(stored()).toContain(`avatars/${first.path}`);
    expect(owners()).toEqual([`ben:${BENS}`, `ben:${first.path}`, `ben:${second.path}`].sort());
  });

  it("goes even where a table that would copy its address is not there yet", async () => {
    give(BEN, BENS);
    signIn(BEN, { avatar_url: url(BENS) });
    w.tables.trapeza_recipe_reviews = null;
    w.tables.community_post_replies = null;
    const now = await saved();
    expect(stored()).toEqual([`avatars/${now.path}`]);
  });
});

describe("the stand-in's column check", () => {
  const set = (id: string, picture: string | null) =>
    client(w).from("profiles").update({ avatar_url: picture }).eq("id", id);

  it("is the one each migration made", async () => {
    w.avatarCheck = "own_upload";
    expect((await set(BEN, url(BENS_OLD))).error).toBeNull();
    expect((await set(BEN, null)).error).toBeNull();
    expect((await set(BEN, url(ANNAS_OLD))).error?.code).toBe("23514");
    expect((await set(BEN, url(BENS))).error?.code).toBe("23514");

    w.avatarCheck = "shape";
    expect((await set(BEN, url(BENS))).error).toBeNull();
    expect((await set(BEN, url(BENS_OLD))).error).toBeNull();
    // Still only their own folder on the old shape, and still only our pictures.
    expect((await set(BEN, url(ANNAS_OLD))).error?.code).toBe("23514");
    expect((await set(BEN, url("b/5d4c3b2a-1f0e-4d9c-8b7a-695847362514.jpg"))).error?.code).toBe("23514");
    expect((await set(BEN, GOOGLE)).error?.code).toBe("23514");
    expect((await set(BEN, `https://evil.example/storage/v1/object/public/avatars/${BENS}`)).error?.code).toBe("23514");
  });
});
