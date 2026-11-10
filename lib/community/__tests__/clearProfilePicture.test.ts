import fs from "node:fs";
import path from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, PROJECT, publicUrl, world, type Row, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * A moderator's "clear profile" takes the reader's picture down (1.9, the
 * Admin chat's find of 2026-11-10; the stores ask that reported content can
 * be acted on, Apple 1.2). Run for real against the in-memory Supabase.
 *
 * Before, the clear took the bio, the banner, the parish, the links and a
 * prayer request's words, and left the picture up: on the profile row, on
 * every post, reply and kitchen review that had copied it (the trigger that
 * follows the profile copies a new picture, never a removed one), and in the
 * reader's metadata, where every place that falls back to the sign-in's
 * picture found it again. A Google photo came back at each Google sign-in.
 */

import { runModAction, type ModActor } from "@/lib/community/moderation";
import { identity } from "@/lib/profile/server";
import { signInPicture } from "@/lib/profile/signInPicture";

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const REPORT = "44444444-4444-4444-8444-444444444444";
const BENS = "a/3f2b8c1e-5a4d-4e6f-8a9b-0c1d2e3f4a5b.png";
const ANNAS = "a/9a8b7c6d-1e2f-4a3b-8c4d-5e6f7a8b9c0d.jpg";
const GOOGLE = "https://lh3.googleusercontent.com/a/ben-photo=s96-c";
const MODERATOR: ModActor = { id: null, name: "Moderator", email: "team@example.com", admin: true };

let w: World;
const url = (p: string) => publicUrl("avatars", p);
const profile = (id: string) => w.tables.profiles!.find((p) => p.id === id)!;
const clear = () => runModAction(client(w) as unknown as SupabaseClient, MODERATOR, "clear_profile", REPORT);
const copies = (id: string) =>
  [
    ...w.tables.community_posts!.filter((r) => r.user_id === id),
    ...w.tables.community_post_replies!.filter((r) => r.user_id === id),
    ...w.tables.trapeza_recipe_reviews!.filter((r) => r.author_id === id),
  ].map((r) => r.author_avatar);
const signedIn = (id: string) => ({ user_metadata: w.metadata.get(id) ?? {}, app_metadata: w.appMetadata.get(id) ?? {} });

/** A picture as the avatar route leaves it: the file, the record, the row, the metadata, the copies. */
function give(owner: string, p: string, { recorded = true } = {}) {
  w.objects.add(`avatars/${p}`);
  if (recorded) w.tables.upload_owners!.push({ bucket: "avatars", path: p, owner_id: owner, created_at: "2026-10-08T00:00:00Z" });
  profile(owner).avatar_url = url(p);
  w.metadata.set(owner, { ...(w.metadata.get(owner) ?? {}), avatar_url: url(p) });
  copy(owner, url(p));
}
/** A post, a reply and a kitchen review of theirs, each with the picture it was written with. */
function copy(owner: string, picture: string | null) {
  w.tables.community_posts!.push({ id: `post-${owner}`, user_id: owner, author_avatar: picture, status: "visible" });
  w.tables.community_post_replies!.push({ id: `reply-${owner}`, post_id: `post-${owner}`, user_id: owner, author_avatar: picture, status: "visible" });
  w.tables.trapeza_recipe_reviews!.push({ id: `review-${owner}`, recipe_id: "r1", author_id: owner, author_avatar: picture, stars: 5 });
}

beforeEach(() => {
  w = world();
  w.users = new Set([ANNA, BEN]);
  const row = (id: string, handle: string): Row => ({
    id, handle, display_name: handle, bio: "hello", status_text: "here", parish: null, social_links: [], banner_url: null, avatar_url: null,
  });
  w.tables.profiles = [row(ANNA, "anna"), row(BEN, "ben")];
  w.tables.community_posts = [];
  w.tables.community_post_replies = [];
  w.tables.trapeza_recipe_reviews = [];
  w.tables.community_reports = [{ id: REPORT, profile_id: BEN, post_id: null, reply_id: null, status: "open" }];
  w.tables.community_mod_log = [];
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", PROJECT);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("a moderator's clear takes the reader's picture down", () => {
  it("off their profile, their posts, replies and reviews, their metadata, and the file itself", async () => {
    give(ANNA, ANNAS);
    give(BEN, BENS);
    expect(await clear()).toEqual({ ok: true });

    expect(profile(BEN).avatar_url).toBeNull();
    expect(copies(BEN)).toEqual([null, null, null]);
    expect(w.metadata.get(BEN)?.avatar_url).toBeUndefined();
    expect(w.objects.has(`avatars/${BENS}`)).toBe(false);
    expect(w.tables.upload_owners!.some((r) => r.path === BENS)).toBe(false);
    expect(typeof w.appMetadata.get(BEN)?.picture_cleared_at).toBe("string");
    // The rest of the clear is as it was, and the report is answered.
    expect(profile(BEN).bio).toBeNull();
    expect(w.tables.community_reports![0].status).toBe("actioned");
    // Nobody else's picture is touched.
    expect(profile(ANNA).avatar_url).toBe(url(ANNAS));
    expect(copies(ANNA)).toEqual([url(ANNAS), url(ANNAS), url(ANNAS)]);
    expect(w.objects.has(`avatars/${ANNAS}`)).toBe(true);
    expect(w.appMetadata.get(ANNA)).toBeUndefined();
  });

  it("deletes no file that is not provably theirs, whatever their row names", async () => {
    give(ANNA, ANNAS);
    // Ben's row and metadata name Anna's picture.
    profile(BEN).avatar_url = url(ANNAS);
    w.metadata.set(BEN, { avatar_url: url(ANNAS) });
    copy(BEN, url(ANNAS));
    expect(await clear()).toEqual({ ok: true });
    expect(profile(BEN).avatar_url).toBeNull();
    expect(copies(BEN)).toEqual([null, null, null]);
    expect(w.objects.has(`avatars/${ANNAS}`)).toBe(true);
    expect(profile(ANNA).avatar_url).toBe(url(ANNAS));
  });

  it("takes down a picture stored the old way, under their own id", async () => {
    const old = `u/${BEN}/1700000000000.png`;
    give(BEN, old, { recorded: false });
    expect(await clear()).toEqual({ ok: true });
    expect(w.objects.has(`avatars/${old}`)).toBe(false);
    expect(copies(BEN)).toEqual([null, null, null]);
  });

  it("keeps Google's photo down at their next sign-in; a picture they upload to us stands", async () => {
    w.metadata.set(BEN, { avatar_url: GOOGLE });
    w.metadata.set(ANNA, { avatar_url: GOOGLE.replace("ben", "anna") });
    copy(BEN, GOOGLE);
    expect(signInPicture(signedIn(BEN))).toBe(GOOGLE);
    expect(await clear()).toEqual({ ok: true });
    expect(copies(BEN)).toEqual([null, null, null]);

    // Google writes its photo into their metadata again when they sign in.
    w.metadata.set(BEN, { ...w.metadata.get(BEN), avatar_url: GOOGLE });
    expect(signInPicture(signedIn(BEN))).toBeNull();
    const shown = await identity(client(w) as unknown as SupabaseClient, { id: BEN, display_name: "ben", avatar_url: null });
    expect(shown.avatar).toBeNull();

    // A picture of their own, uploaded to us, is theirs again (and can be taken down again).
    w.metadata.set(BEN, { ...w.metadata.get(BEN), avatar_url: url(BENS) });
    expect(signInPicture(signedIn(BEN))).toBe(url(BENS));
    // Someone never cleared keeps their Google photo.
    expect(signInPicture(signedIn(ANNA))).toBe(GOOGLE.replace("ben", "anna"));
  });
});

describe("every place that falls back to the sign-in's picture asks signInPicture", () => {
  const ROOT = path.resolve(__dirname, "..", "..", "..");
  const SITES = [
    "lib/profile/server.ts",
    "lib/profile/myPicture.ts",
    "lib/campaigns/thread.ts",
    "app/api/community/posts/route.ts",
    "app/api/community/posts/[id]/replies/route.ts",
    "app/api/trapeza/[id]/reviews/route.ts",
  ];
  it.each(SITES)("%s", (file) => {
    const src = fs.readFileSync(path.join(ROOT, file), "utf8");
    expect(src).toMatch(/signInPicture\(/);
    // Its metadata picture, read straight: what let a cleared picture back in.
    expect(src).not.toMatch(/meta\.avatar_url/);
  });
});
