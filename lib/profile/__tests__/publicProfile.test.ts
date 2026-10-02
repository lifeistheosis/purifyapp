import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { excerptOf, verseRef } from "../publicProfile";
import { buildProfile, type ProfileRow } from "../server";

describe("verseRef", () => {
  const names = (slug: string) => ({ john: "John", psalms: "Psalms" })[slug] ?? null;

  it("turns a stored reference into a label and a link", () => {
    expect(verseRef("john/3/16", names)).toEqual({ ref: "john/3/16", label: "John 3:16", href: "/bible/john/3#v16" });
  });

  it("refuses a malformed reference or an unknown book", () => {
    expect(verseRef("john/3", names)).toBeNull();
    expect(verseRef("gospel-of-thomas/1/1", names)).toBeNull();
    expect(verseRef(null, names)).toBeNull();
  });
});

describe("excerptOf", () => {
  it("keeps short text whole and cuts long text at a word", () => {
    expect(excerptOf("  Lord,   have mercy.  ")).toBe("Lord, have mercy.");
    const long = "word ".repeat(80);
    const cut = excerptOf(long, 50);
    expect(cut.length).toBeLessThanOrEqual(51);
    expect(cut.endsWith("word…")).toBe(true);
  });
});

/**
 * What a public profile carries, end to end, from a service-role client
 * that has everything: the auth uuid, an email, subscription dates, a
 * granted badge's admin. None of that may come out.
 */
describe("the public profile", () => {
  const UID = "7d8a2a52-1d1e-4c55-9f0f-2f3c4d5e6f70";
  const EMAIL = "someone.private@example.com";

  function fakeAdmin(): SupabaseClient {
    const tables: Record<string, unknown> = {
      entitlements: { plus_until: "2999-01-01T00:00:00Z", pro_until: null },
      user_verification: { status: "verified" },
      ambassadors: null,
      user_badges: [{ badge: "beta_tester", granted_at: "2026-09-01T00:00:00Z", granted_by: "owner@purify" }],
      community_posts: [
        {
          id: "post-1",
          kind: "discussion",
          title: "On fasting",
          body: "A body",
          quote_text: null,
          quote_source: null,
          created_at: "2026-09-30T00:00:00Z",
          like_count: 2,
          reply_count: 1,
          user_id: UID,
        },
      ],
    };
    const from = (table: string) => {
      // Rows are filtered by the eq and in filters a query names, where the
      // rows carry that column, so each read gets what it asked for.
      const filters: [string, unknown[]][] = [];
      const answer = () => {
        const all = tables[table] ?? null;
        if (!Array.isArray(all)) return { data: all, error: null };
        const rows = all.filter((r) =>
          filters.every(([col, vals]) => !(col in (r as object)) || vals.includes((r as Record<string, unknown>)[col])),
        );
        return { data: rows, error: null };
      };
      const q: Record<string, unknown> = {};
      for (const m of ["select", "is", "order", "limit", "gte", "lt", "neq"]) q[m] = () => q;
      q.eq = (col: string, v: unknown) => (filters.push([col, [v]]), q);
      q.in = (col: string, vs: unknown[]) => (filters.push([col, vs]), q);
      q.maybeSingle = () => Promise.resolve(answer());
      q.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(answer()).then(ok, bad);
      return q;
    };
    return {
      from,
      auth: {
        admin: {
          getUserById: async () => ({
            data: { user: { id: UID, email: EMAIL, user_metadata: { display_name: "Maria", avatar_url: null } } },
          }),
        },
      },
    } as unknown as SupabaseClient;
  }

  const row: ProfileRow = {
    id: UID,
    handle: "maria",
    handle_changed_at: null,
    display_name: "Maria",
    joined_at: "2026-08-15T00:00:00Z",
    bio: "Lord, have mercy.",
    status_text: "Reading the Psalter",
    favorite_verse: "john/3/16",
    banner_color: "#1f3a6b",
    banner_url: null,
    theme_primary: "#1f3a6b",
    theme_accent: "#0b1424",
    avatar_decoration: "stars",
    profile_effect: "snowfall",
    patron_saint: null,
    show_supporter_mark: true,
  };

  it("carries no auth id, no email and no subscription date", async () => {
    const { profile } = await buildProfile(fakeAdmin(), row, { posts: true });
    const json = JSON.stringify(profile);
    expect(json).not.toContain(UID);
    expect(json).not.toContain(EMAIL);
    expect(json).not.toContain("2999");
    expect(json).not.toContain("owner@purify");
    expect(Object.keys(profile).sort()).toEqual(
      [
        "avatar",
        "badges",
        "bio",
        "cosmetics",
        "favoriteVerse",
        "handle",
        "joinedAt",
        "name",
        "nameDay",
        "nowReading",
        "parish",
        "patronSaint",
        "posts",
        "postsHidden",
        "prayerRequest",
        "private",
        "status",
        "tier",
        "verified",
      ].sort(),
    );
    expect(Object.keys(profile.posts[0]).sort()).toEqual(
      ["createdAt", "excerpt", "id", "kind", "likes", "quoteSource", "replies", "title"].sort(),
    );
  });

  it("shows the Plus cosmetics and badges of a live subscriber", async () => {
    const { profile, subscribed } = await buildProfile(fakeAdmin(), row, { posts: false });
    expect(subscribed).toBe(true);
    expect(profile.cosmetics.decoration).toBe("stars");
    expect(profile.badges.map((b) => b.id)).toEqual(["verified", "plus", "early_reader", "beta_tester"]);
    expect(profile.favoriteVerse?.label).toBe("John 3:16");
  });

  it("shows only name, picture and standing badges when private", async () => {
    const { profile } = await buildProfile(fakeAdmin(), { ...row, profile_private: true, parish: "St. Nicholas" }, { posts: true });
    expect(profile.private).toBe(true);
    expect(profile.bio).toBeNull();
    expect(profile.parish).toBeNull();
    expect(profile.posts).toEqual([]);
    expect(profile.badges.map((b) => b.id)).toEqual(["verified"]);
  });

  it("hides the Plus mark, not the cosmetics, when the reader turned the mark off", async () => {
    const { profile } = await buildProfile(fakeAdmin(), { ...row, show_supporter_mark: false }, { posts: false });
    expect(profile.tier).toBeNull();
    expect(profile.badges.map((b) => b.id)).not.toContain("plus");
    expect(profile.cosmetics.effect).toBe("snowfall");
  });
});
