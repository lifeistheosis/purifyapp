import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, PROJECT, publicUrl, world, type Row, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * The profile banner, run for real against an in-memory Supabase: the upload
 * and removal route, and the moderators' "clear profile".
 *
 * These cannot be walked in a browser without signing in to, and writing to,
 * the production project. What is pinned: a banner file is deleted only for
 * the reader the server's record gives it to, whatever a profile row names.
 *
 * Until this rule, all three deleted whatever b/<uuid> file the row's
 * banner_url named, on any host. Readers could write that column themselves
 * before 20261003000000_profile_pictures.sql, so a row could name another
 * reader's banner: point yours at theirs, then remove it, upload over it, or
 * get reported and cleared. `oldRule` is that rule, kept as the positive
 * control, so each case shows the file WOULD have gone.
 */

const state = vi.hoisted(() => ({
  admin: null as unknown,
  user: null as null | { id: string; email: string; user_metadata: Record<string, unknown> },
  profiles: (): Record<string, unknown>[] => [],
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
// The profile the editor gets back is built from a dozen tables this suite
// does not model; the row it starts from is a copy of the one in the world,
// as a read is.
vi.mock("@/lib/profile/server", async (original) => ({
  ...(await original<typeof import("@/lib/profile/server")>()),
  loadProfileRow: async (_admin: unknown, by: { id: string }) => {
    const row = state.profiles().find((p) => p.id === by.id);
    return row ? { ...row } : null;
  },
  buildMyProfile: async (_admin: unknown, row: { banner_url: string | null }) => ({ saved: { bannerUrl: row.banner_url } }),
}));

import { DELETE as removeBanner, POST as uploadBanner } from "@/app/api/profile/banner/route";
import { runModAction, type ModActor } from "@/lib/community/moderation";

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const REPORT = "44444444-4444-4444-8444-444444444444";
const ANNAS = "b/9a8b7c6d-1e2f-4a3b-8c4d-5e6f7a8b9c0d.jpg";
const BENS = "b/3f2b8c1e-5a4d-4e6f-8a9b-0c1d2e3f4a5b.png";
const RANDOM = /^b\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const SITE = "https://purifyapp.net";
const MODERATOR: ModActor = { id: null, name: "Moderator", email: "team@example.com", admin: true };

function oldRule(url: string | null): string | null {
  if (!url) return null;
  const m = /\/storage\/v1\/object\/public\/avatars\/(b\/[0-9a-f-]{36}\.(?:jpg|png|webp))$/.exec(url);
  return m ? m[1] : null;
}

let w: World;

const url = (path: string) => publicUrl("avatars", path);
const profile = (id: string) => w.tables.profiles!.find((p) => p.id === id)!;
const owners = () => w.tables.upload_owners!.map((r) => `${r.owner_id === ANNA ? "anna" : "ben"}:${r.path}`).sort();
const stored = () => [...w.objects].sort();

function signIn(id: string | null) {
  state.user = id ? { id, email: `${id.slice(0, 4)}@example.com`, user_metadata: {} } : null;
}

/** A banner as the upload route leaves it: the file, the record, the row. */
function give(owner: string, path: string, { recorded = true } = {}) {
  w.objects.add(`avatars/${path}`);
  if (recorded) w.tables.upload_owners!.push({ bucket: "avatars", path, owner_id: owner, created_at: "2026-10-03T00:00:00Z" });
  profile(owner).banner_url = url(path);
}

beforeEach(() => {
  w = world();
  w.users = new Set([ANNA, BEN]);
  const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const row = (id: string, handle: string): Row => ({
    id, handle, display_name: handle, bio: "hello", status_text: "here", parish: null, social_links: [], banner_url: null, avatar_url: null,
  });
  w.tables.profiles = [row(ANNA, "anna"), row(BEN, "ben")];
  w.tables.entitlements = [ANNA, BEN].map((user_id) => ({ user_id, plus_until: future, pro_until: null }));
  w.tables.community_reports = [{ id: REPORT, profile_id: BEN, post_id: null, reply_id: null, status: "open" }];
  w.tables.community_mod_log = [];
  state.admin = client(w);
  state.profiles = () => w.tables.profiles!;
  signIn(BEN);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", PROJECT);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function upload(type = "image/png") {
  const form = new FormData();
  form.append("file", new File([new Uint8Array([1, 2, 3])], "banner", { type }));
  return uploadBanner(new Request(`${SITE}/api/profile/banner`, { method: "POST", body: form }));
}
const remove = () => removeBanner(new Request(`${SITE}/api/profile/banner`, { method: "DELETE" }));
const clear = () => runModAction(state.admin as SupabaseClient, MODERATOR, "clear_profile", REPORT);

describe("uploading a banner", () => {
  it("stores it on a random path, writes down whose it is, and shows it", async () => {
    const res = await upload();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; url: string; profile: { saved: { bannerUrl: string } } };
    const path = body.url.slice(url("").length);
    expect(path).toMatch(RANDOM);
    expect(body.url).not.toContain(BEN);
    expect(stored()).toEqual([`avatars/${path}`]);
    expect(owners()).toEqual([`ben:${path}`]);
    expect(profile(BEN).banner_url).toBe(body.url);
    expect(body.profile.saved.bannerUrl).toBe(body.url);
  });

  it("is for Plus: without it nothing is stored or written down", async () => {
    w.tables.entitlements = [];
    const res = await upload();
    expect(res.status).toBe(403);
    expect(stored()).toEqual([]);
    expect(owners()).toEqual([]);
  });

  it("stores nothing while the owners table is not there, or when the owner cannot be written down", async () => {
    w.tables.upload_owners = null;
    expect((await upload()).status).toBe(503);
    expect(w.calls.upload).toBe(0);

    w.tables.upload_owners = [];
    w.fail.insert = "upload_owners";
    expect((await upload()).status).toBe(500);
    expect(w.calls.upload).toBe(0);
    expect(profile(BEN).banner_url).toBeNull();
  });

  it("forgets the record when the file could not be stored", async () => {
    w.fail.upload = true;
    expect((await upload()).status).toBe(500);
    expect(owners()).toEqual([]);
    expect(profile(BEN).banner_url).toBeNull();
  });

  it("takes the new file back when the row cannot be written, and the old banner still stands", async () => {
    give(BEN, BENS);
    w.fail.update = "profiles";
    expect((await upload()).status).toBe(500);
    expect(stored()).toEqual([`avatars/${BENS}`]);
    expect(owners()).toEqual([`ben:${BENS}`]);
    expect(profile(BEN).banner_url).toBe(url(BENS));
  });

  it("deletes the banner it replaces, and its record, and nothing else", async () => {
    give(ANNA, ANNAS);
    give(BEN, BENS);
    expect((await upload()).status).toBe(200);
    const mine = stored().filter((f) => f !== `avatars/${ANNAS}`);
    expect(mine).toHaveLength(1);
    expect(mine[0]).not.toBe(`avatars/${BENS}`);
    expect(owners()).toEqual([`anna:${ANNAS}`, `ben:${mine[0].slice("avatars/".length)}`].sort());
    expect(profile(ANNA).banner_url).toBe(url(ANNAS));
  });

  it("leaves another upload of theirs that is still on its way", async () => {
    give(BEN, BENS);
    // A second request has stored its file and not yet reached the row.
    const onItsWay = "b/0f1e2d3c-4b5a-4697-8887-766554433221.webp";
    w.objects.add(`avatars/${onItsWay}`);
    w.tables.upload_owners!.push({ bucket: "avatars", path: onItsWay, owner_id: BEN });
    expect((await upload()).status).toBe(200);
    expect(w.objects.has(`avatars/${onItsWay}`)).toBe(true);
    expect(w.objects.has(`avatars/${BENS}`)).toBe(false);
  });
});

describe("removing a banner", () => {
  it("empties the row, deletes the file and forgets the record", async () => {
    give(BEN, BENS);
    const res = await remove();
    expect(res.status).toBe(200);
    expect(profile(BEN).banner_url).toBeNull();
    expect(stored()).toEqual([]);
    expect(owners()).toEqual([]);
  });

  it("takes every banner file the record gives them, not only the one showing", async () => {
    give(BEN, BENS);
    const left = "b/0f1e2d3c-4b5a-4697-8887-766554433221.webp";
    w.objects.add(`avatars/${left}`);
    w.tables.upload_owners!.push({ bucket: "avatars", path: left, owner_id: BEN });
    expect((await remove()).status).toBe(200);
    expect(stored()).toEqual([]);
    expect(owners()).toEqual([]);
  });

  it("deletes nothing when the row could not be emptied", async () => {
    give(BEN, BENS);
    w.fail.update = "profiles";
    expect((await remove()).status).toBe(500);
    expect(stored()).toEqual([`avatars/${BENS}`]);
    expect(owners()).toEqual([`ben:${BENS}`]);
  });

  it("keeps the record when the file could not be deleted, so the next change tries again", async () => {
    give(BEN, BENS);
    w.fail.remove = "avatars";
    expect((await remove()).status).toBe(200);
    expect(stored()).toEqual([`avatars/${BENS}`]);
    expect(owners()).toEqual([`ben:${BENS}`]);
  });

  it("turns away a reader who is not signed in", async () => {
    give(BEN, BENS);
    signIn(null);
    expect((await remove()).status).toBe(401);
    expect((await upload()).status).toBe(401);
    expect(stored()).toEqual([`avatars/${BENS}`]);
  });
});

describe("a row that names another reader's banner", () => {
  beforeEach(() => {
    give(ANNA, ANNAS);
    give(BEN, BENS);
    // What a reader could do to their own row before the grants were taken back.
    profile(BEN).banner_url = url(ANNAS);
  });

  it("would have deleted it under the old rule (the positive control)", () => {
    expect(oldRule(profile(BEN).banner_url as string)).toBe(ANNAS);
  });

  it("cannot delete it by removing their own banner", async () => {
    expect((await remove()).status).toBe(200);
    expect(stored()).toEqual([`avatars/${ANNAS}`]);
    expect(owners()).toEqual([`anna:${ANNAS}`]);
    expect(profile(ANNA).banner_url).toBe(url(ANNAS));
  });

  it("cannot delete it by uploading a new banner over it", async () => {
    expect((await upload()).status).toBe(200);
    expect(w.objects.has(`avatars/${ANNAS}`)).toBe(true);
    expect(owners()).toContain(`anna:${ANNAS}`);
  });

  it("cannot have a moderator delete it by getting their profile cleared", async () => {
    expect(await clear()).toEqual({ ok: true });
    expect(w.objects.has(`avatars/${ANNAS}`)).toBe(true);
    expect(profile(BEN)).toMatchObject({ bio: null, status_text: null, banner_url: null });
    // Their own banner goes, and the report is answered and logged.
    expect(w.objects.has(`avatars/${BENS}`)).toBe(false);
    expect(w.tables.community_reports![0].status).toBe("actioned");
    expect(w.tables.community_mod_log!).toMatchObject([{ action: "clear_profile", target_kind: "profile" }]);
  });

  it("is refused on a lookalike host too, which the old rule read a path out of", async () => {
    const lookalike = `https://evil.example/storage/v1/object/public/avatars/${ANNAS}`;
    profile(BEN).banner_url = lookalike;
    expect(oldRule(lookalike)).toBe(ANNAS);
    expect((await remove()).status).toBe(200);
    expect(w.objects.has(`avatars/${ANNAS}`)).toBe(true);
  });

  it("leaves the banner's real owner able to remove it", async () => {
    signIn(ANNA);
    expect((await remove()).status).toBe(200);
    expect(w.objects.has(`avatars/${ANNAS}`)).toBe(false);
    expect(owners()).toEqual([`ben:${BENS}`]);
  });
});

describe("a banner from before the record existed", () => {
  it("is still its reader's to remove while no other profile names it", async () => {
    give(BEN, BENS, { recorded: false });
    expect((await remove()).status).toBe(200);
    expect(stored()).toEqual([]);
  });

  it("is still deleted for its reader when a moderator clears their profile", async () => {
    give(BEN, BENS, { recorded: false });
    expect(await clear()).toEqual({ ok: true });
    expect(stored()).toEqual([]);
  });

  it("is kept while another profile names the same file, for either of them", async () => {
    give(ANNA, ANNAS, { recorded: false });
    profile(BEN).banner_url = url(ANNAS);
    expect((await remove()).status).toBe(200);
    expect(stored()).toEqual([`avatars/${ANNAS}`]);
  });

  it("is kept when the record cannot be read", async () => {
    give(BEN, BENS, { recorded: false });
    const admin = state.admin as { from: (t: string) => unknown };
    const real = admin.from.bind(admin);
    vi.spyOn(admin, "from").mockImplementation((table: string) =>
      table === "upload_owners"
        ? { select: () => ({ eq: () => ({ eq: () => ({ like: async () => ({ data: null, error: { message: "boom" } }), in: async () => ({ data: null, error: { message: "boom" } }), limit: async () => ({ data: null, error: { message: "boom" } }) }) }) }) }
        : real(table),
    );
    expect((await remove()).status).toBe(200);
    expect(stored()).toEqual([`avatars/${BENS}`]);
  });
});

describe("who picks a banner file to delete", () => {
  const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

  it("is bannerFile alone: the route and the moderators' action read no address and delete no banner themselves", () => {
    const why = "banner files are deleted by lib/profile/bannerFile.ts only";
    for (const file of ["app/api/profile/banner/route.ts", "lib/community/moderation.ts"]) {
      const src = read(file);
      expect(src, `${file}: ${why}`).toContain("deleteBannerFiles(");
      expect(src, `${file}: ${why}`).not.toContain("storage/v1/object/public");
    }
    expect(read("app/api/profile/banner/route.ts"), why).not.toContain(".remove(");
    expect(read("lib/community/moderation.ts"), why).not.toMatch(/storage\s*\.from\(\s*(["'`]avatars["'`]|BANNER_BUCKET)/);
  });
});
