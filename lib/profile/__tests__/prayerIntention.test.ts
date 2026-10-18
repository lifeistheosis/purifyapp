import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

/**
 * What a prayer request asks prayers for (1.7.1), run through the real
 * profile route against an in-memory database: the words go through the word
 * filter as a post's do, a moderator is handed what was masked, and before
 * docs/1.8-build/sql/prayer-request-intention.sql has run the request is the
 * one tap it always was.
 */

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  admin: null as unknown,
  user: null as null | { id: string; email: string; user_metadata: Record<string, unknown> },
  profiles: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
// The row a save starts from is a copy of the one in the database, as a read
// is; the profile it answers with is built from tables this suite does not
// model, so it is only the row.
vi.mock("@/lib/profile/server", async (original) => ({
  ...(await original<typeof import("@/lib/profile/server")>()),
  loadProfileRow: async (_admin: unknown, by: { id: string }) => {
    const row = state.profiles.find((p) => p.id === by.id);
    return row ? { ...row } : null;
  },
  buildMyProfile: async (_admin: unknown, row: Row) => ({ row }),
}));

import { PUT } from "@/app/api/profile/me/route";
import { forgetFilter } from "@/lib/moderation/server";
import { buildProfile, cleanIntention, PRAYER_INTENTION_MAX, type ProfileRow } from "@/lib/profile/server";

const ANNA = "11111111-1111-4111-8111-111111111111";
const LISTED = "zorbak";

let holds: Row[];

/** The database: Anna's profile, the holds, and one word on the team's list. `open` is whether the 1.8 SQL has run. */
function world({ open = true, request = null as string | null, words = null as string | null } = {}) {
  state.profiles = [
    {
      id: ANNA,
      handle: "anna",
      display_name: "Anna",
      prayer_request_at: request,
      ...(open ? { prayer_request_intention: words } : {}),
    },
  ];
  holds = [];
  state.admin = cappedApi(
    {
      profiles: state.profiles,
      community_text_holds: holds,
      community_filter_terms: [{ term: LISTED, scope: "text", whole_word: true }],
    },
    {},
    {
      // Before the SQL, reading the column fails as Postgres fails it.
      fail: ({ table }) => (!open && table === "profiles" ? { code: "42703", message: "column profiles.prayer_request_intention does not exist" } : null),
    },
  ).client as SupabaseClient;
  forgetFilter();
}

const anna = () => state.profiles[0];

async function save(body: Row) {
  const res = await PUT(
    new Request("https://purifyapp.net/api/profile/me", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, json: (await res.json()) as Row };
}

beforeEach(() => {
  state.user = { id: ANNA, email: "anna@example.com", user_metadata: {} };
  world();
});

describe("cleanIntention", () => {
  it("makes the words one line, cut to the column's limit, and nothing as null", () => {
    expect(cleanIntention("  For my   mother,\n\nwho is ill  ")).toBe("For my mother, who is ill");
    expect([...(cleanIntention("ж".repeat(500)) ?? "")].length).toBe(PRAYER_INTENTION_MAX);
    expect(cleanIntention("   ")).toBeNull();
    expect(cleanIntention(null)).toBeNull();
    expect(PRAYER_INTENTION_MAX).toBe(120);
  });
});

describe("asking for prayers, with what for", () => {
  it("keeps the request's own words with it", async () => {
    const { status } = await save({ prayerRequest: true, prayerIntention: "  For my   mother,\n who is ill " });
    expect(status).toBe(200);
    expect(typeof anna().prayer_request_at).toBe("string");
    expect(anna().prayer_request_intention).toBe("For my mother, who is ill");
    expect(holds).toEqual([]);
  });

  it("asks first when the word filter would mask some of them, and changes nothing", async () => {
    const { status, json } = await save({ prayerRequest: true, prayerIntention: `For my brother, a ${LISTED}` });
    expect(status).toBe(409);
    expect(json.code).toBe("filtered");
    expect(anna().prayer_request_at).toBeNull();
    expect(anna().prayer_request_intention).toBeNull();
    expect(holds).toEqual([]);
  });

  it("on the reader's yes, shows the words masked and hands a moderator what was written", async () => {
    const { status } = await save({ prayerRequest: true, prayerIntention: `For my brother, a ${LISTED}`, confirmFiltered: true });
    expect(status).toBe(200);
    expect(anna().prayer_request_intention).toBe("For my brother, a ******");
    expect(holds).toHaveLength(1);
    expect(holds[0]).toMatchObject({ profile_id: ANNA, original_body: `For my brother, a ${LISTED}`, hits: 1 });
    expect(holds[0]).not.toHaveProperty("post_id");
  });

  it("refuses a link, and changes nothing", async () => {
    const { status, json } = await save({ prayerRequest: true, prayerIntention: "Please pray, see example.com/help" });
    expect(status).toBe(400);
    expect(json.code).toBe("intention_link");
    expect(anna().prayer_request_at).toBeNull();
  });

  it("is still asking without words: a request may say nothing", async () => {
    const { status } = await save({ prayerRequest: true, prayerIntention: "   " });
    expect(status).toBe(200);
    expect(typeof anna().prayer_request_at).toBe("string");
    expect(anna().prayer_request_intention).toBeNull();
  });
});

describe("a request that is up", () => {
  const since = new Date(Date.now() - 3_600_000).toISOString();

  it("takes new words without starting its count again, and the old words' hold goes", async () => {
    world({ request: since, words: "For my brother, a ******" });
    holds.push({ id: "h1", profile_id: ANNA, original_body: `For my brother, a ${LISTED}`, hits: 1, status: "pending" });
    const { status } = await save({ prayerRequest: true, prayerIntention: "For my brother, who is ill" });
    expect(status).toBe(200);
    expect(anna().prayer_request_at).toBe(since);
    expect(anna().prayer_request_intention).toBe("For my brother, who is ill");
    expect(holds).toEqual([]);
  });

  it("keeps its words when the reader turns it on again from the editor, which sends none", async () => {
    world({ request: since, words: "For my brother" });
    await save({ prayerRequest: true });
    expect(anna().prayer_request_at).toBe(since);
    expect(anna().prayer_request_intention).toBe("For my brother");
  });

  it("comes down with its words, and their hold", async () => {
    world({ request: since, words: "For my brother, a ******" });
    holds.push({ id: "h1", profile_id: ANNA, original_body: `For my brother, a ${LISTED}`, hits: 1, status: "pending" });
    const { status } = await save({ prayerRequest: false });
    expect(status).toBe(200);
    expect(anna().prayer_request_at).toBeNull();
    expect(anna().prayer_request_intention).toBeNull();
    expect(holds).toEqual([]);
  });

  it("never brings a lapsed request's words back under a new one", async () => {
    world({ request: new Date(Date.now() - 20 * 86_400_000).toISOString(), words: "For last month" });
    await save({ prayerRequest: true });
    expect(Date.parse(String(anna().prayer_request_at))).toBeGreaterThan(Date.now() - 60_000);
    expect(anna().prayer_request_intention).toBeNull();
  });
});

describe("before the column exists", () => {
  it("asking is the one tap it was, and no words are read or written", async () => {
    world({ open: false });
    const { status } = await save({ prayerRequest: true, prayerIntention: `For my brother, a ${LISTED}` });
    expect(status).toBe(200);
    expect(typeof anna().prayer_request_at).toBe("string");
    expect(anna()).not.toHaveProperty("prayer_request_intention");
    expect(holds).toEqual([]);
  });
});

describe("the request on a profile", () => {
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const row = (extra: Partial<ProfileRow> = {}): ProfileRow => ({
    id: ANNA,
    handle: "anna",
    handle_changed_at: null,
    display_name: "Anna",
    joined_at: null,
    bio: null,
    status_text: null,
    favorite_verse: null,
    banner_color: null,
    banner_url: null,
    theme_primary: null,
    theme_accent: null,
    avatar_decoration: null,
    profile_effect: null,
    patron_saint: null,
    show_supporter_mark: null,
    prayer_request_at: since,
    ...extra,
  });
  const admin = (open: boolean) => {
    world({ open, request: since, words: "For my mother, who is ill" });
    const base = state.admin as SupabaseClient;
    return {
      ...base,
      from: base.from.bind(base),
      auth: { admin: { getUserById: async () => ({ data: { user: { id: ANNA, email: "anna@example.com", user_metadata: {} } } }) } },
    } as unknown as SupabaseClient;
  };

  it("says what it asks prayers for", async () => {
    const { profile } = await buildProfile(admin(true), row(), { posts: false });
    expect(profile.prayerRequest).toMatchObject({ since, intention: "For my mother, who is ill" });
  });

  it("says nothing of it on a private profile, and has no words before the column exists", async () => {
    expect((await buildProfile(admin(true), row({ profile_private: true }), { posts: false })).profile.prayerRequest).toBeNull();
    expect((await buildProfile(admin(false), row(), { posts: false })).profile.prayerRequest).toMatchObject({ since, intention: null });
  });
});
