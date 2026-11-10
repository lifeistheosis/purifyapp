import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

/**
 * Asking for prayers on a profile, after it went (1.9), run through the real
 * profile route against an in-memory database. His word of 2026-11-10: "I'd
 * say remove the prayer wall and just keep the prayer campaigns", and then
 * "wall B": the wall, the line on a profile and its switch, I prayed and its
 * notice. The one way to ask for prayer in Purify is a prayer campaign.
 *
 * An app of 1.8 can still send what it always sent. What would go wrong if
 * these broke: a request made from an old app that no screen shows and no
 * moderator reads; a reader's words through the word filter and into a hold
 * for a feature that is gone; a profile save that fails whole because an old
 * editor still sends the switch; a reader unable to take their own request
 * down; a profile still showing a request, and how many prayed.
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
import { buildProfile, profileSettings, type ProfileRow } from "@/lib/profile/server";

const ANNA = "11111111-1111-4111-8111-111111111111";
const LISTED = "zorbak";

let holds: Row[];
/** Every read the route made, by table. */
let reads: { table: string }[];

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
  const api = cappedApi(
    {
      profiles: state.profiles,
      community_text_holds: holds,
      community_filter_terms: [{ term: LISTED, scope: "text", whole_word: true }],
      profile_prayers: [{ owner_id: ANNA, prayer_id: "22222222-2222-4222-8222-222222222222", request_at: request }],
    },
    {},
    {
      // Before the SQL, reading the column fails as Postgres fails it.
      fail: ({ table }) => (!open && table === "profiles" ? { code: "42703", message: "column profiles.prayer_request_intention does not exist" } : null),
    },
  );
  state.admin = api.client as SupabaseClient;
  reads = api.requests;
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

describe("no request can be made any more", () => {
  it("refuses one sent by itself, as the wall's button in an app of 1.8 sends it, and writes nothing", async () => {
    for (const body of [{ prayerRequest: true }, { prayerRequest: true, prayerIntention: "For my mother, who is ill" }, { prayerRequest: true, prayerIntention: "For my mother", confirmFiltered: true }]) {
      const { status, json } = await save(body);
      expect(status, JSON.stringify(body)).toBe(410);
      expect(json.code).toBe("request_closed");
      expect(anna().prayer_request_at).toBeNull();
      expect(anna().prayer_request_intention).toBeNull();
      expect(holds).toEqual([]);
    }
  });

  it("reads no words of it: not through the word filter, not for a link, and nothing waits for a moderator", async () => {
    // Before 1.9 these words were masked, asked about, and held as written.
    const filtered = await save({ prayerRequest: true, prayerIntention: `For my brother, a ${LISTED}` });
    expect(filtered.status).toBe(410);
    expect(filtered.json.code).toBe("request_closed");
    const linked = await save({ prayerRequest: true, prayerIntention: "Please pray, see example.com/help", confirmFiltered: true });
    expect(linked.json.code).toBe("request_closed");
    // Neither was asked about (409, "filtered") nor refused for its link (400): the words are not looked at.
    expect(holds).toEqual([]);
    expect(anna().prayer_request_intention).toBeNull();
  });

  it("passes it over when it comes among other changes, as the profile's editor in an app of 1.8 sends it, and saves the rest", async () => {
    const { status } = await save({ prayerRequest: true, bio: "A reader in Athens" });
    expect(status).toBe(200);
    expect(anna().bio).toBe("A reader in Athens");
    expect(anna().prayer_request_at).toBeNull();
    expect(anna().prayer_request_intention).toBeNull();
    expect(holds).toEqual([]);
  });

  it("does not bring an old request back to life: one that stands is neither renewed nor given new words", async () => {
    const since = new Date(Date.now() - 3_600_000).toISOString();
    world({ request: since, words: "For my brother" });
    expect((await save({ prayerRequest: true, prayerIntention: "New words" })).status).toBe(410);
    await save({ prayerRequest: true, bio: "A reader in Athens" });
    expect(anna().prayer_request_at).toBe(since);
    expect(anna().prayer_request_intention).toBe("For my brother");
  });
});

describe("a request can still be taken down by the reader who made it", () => {
  const since = new Date(Date.now() - 3_600_000).toISOString();

  it("comes down with its words, and their hold", async () => {
    world({ request: since, words: "For my brother, a ******" });
    holds.push({ id: "h1", profile_id: ANNA, original_body: `For my brother, a ${LISTED}`, hits: 1, status: "pending" });
    const { status } = await save({ prayerRequest: false });
    expect(status).toBe(200);
    expect(anna().prayer_request_at).toBeNull();
    expect(anna().prayer_request_intention).toBeNull();
    expect(holds).toEqual([]);
  });

  it("words left behind by a request that lapsed come down too", async () => {
    // Before 1.9 a lapsed request's words stayed in the database, unseen.
    world({ request: null, words: "For last month" });
    expect((await save({ prayerRequest: false })).status).toBe(200);
    expect(anna().prayer_request_intention).toBeNull();
  });

  it("changes nothing where nothing stands, and leaves another matter's hold alone", async () => {
    holds.push({ id: "h2", profile_id: ANNA, original_body: "A bio's words", hits: 1, status: "pending" });
    const before = structuredClone(anna());
    expect((await save({ prayerRequest: false })).status).toBe(200);
    expect(anna()).toEqual(before);
    expect(holds).toHaveLength(1);
  });

  it("before the words' column exists, the time comes down alone", async () => {
    world({ open: false, request: since });
    expect((await save({ prayerRequest: false })).status).toBe(200);
    expect(anna().prayer_request_at).toBeNull();
    expect(anna()).not.toHaveProperty("prayer_request_intention");
  });
});

describe("a profile shows no request", () => {
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

  it("shows none, though one still stands in the database with its words", async () => {
    const { profile } = await buildProfile(admin(true), row(), { posts: false });
    expect(profile.prayerRequest).toBeNull();
    expect(JSON.stringify(profile)).not.toContain("mother");
  });

  it("counts nobody: who prayed is not read, and neither are the request's words", async () => {
    const client = admin(true);
    await buildProfile(client, row(), { posts: false });
    expect(reads.map((r) => r.table)).not.toContain("profile_prayers");
    // The profile's own row is handed in; nothing reads profiles again for a request's words.
    expect(reads.filter((r) => r.table === "profiles")).toEqual([]);
  });

  it("the same on a private profile and before the words' column exists", async () => {
    expect((await buildProfile(admin(true), row({ profile_private: true }), { posts: false })).profile.prayerRequest).toBeNull();
    expect((await buildProfile(admin(false), row(), { posts: false })).profile.prayerRequest).toBeNull();
  });

  it("its settings say no request, whatever stands, for the editor of an app of 1.8", () => {
    expect(profileSettings(row()).prayerRequest).toBe(false);
    expect(profileSettings(row({ prayer_request_at: null })).prayerRequest).toBe(false);
  });
});
