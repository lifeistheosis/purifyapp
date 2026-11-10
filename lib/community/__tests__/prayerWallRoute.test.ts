import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

/**
 * The prayer wall's routes after the wall (1.9). His word of 2026-11-10: "I'd
 * say remove the prayer wall and just keep the prayer campaigns", and then
 * "wall B": asking for prayers goes everywhere. From 1.9 no request is shown
 * to anyone.
 *
 * The two addresses stay for an app of 1.8, which still draws the wall and
 * may still hold an I prayed button. What would go wrong if these broke: a
 * reader's request, and the words of an illness in it, still handed to every
 * app that has not updated; an old app shown an error where its wall was; a
 * prayer recorded, and its asker notified, for a request nobody can see.
 */

type Row = Record<string, unknown>;

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";

const state = vi.hoisted(() => ({ admin: null as unknown, user: null as null | { id: string }, reads: [] as { table: string }[], writes: [] as unknown[] }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
vi.mock("@/lib/community/social", () => ({ signedInUser: async () => state.user, actorOf: async () => ({ name: "Ben", handle: "ben" }), handleFrom: (h: string) => h, notYet: () => false }));
vi.mock("@/lib/community/blocks", () => ({ hiddenAuthors: async () => ({ blocked: [], muted: [] }) }));
vi.mock("@/lib/community/notify", () => ({
  blockedBy: async () => new Set<string>(),
  insertNotifications: async (_admin: unknown, rows: unknown[]) => {
    state.writes.push(...rows);
  },
}));

/** Two readers who asked before 1.9, one with words, and a prayer already said for one of them. */
function world() {
  const asked = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
  const profiles: Row[] = [
    { id: ANNA, handle: "anna", display_name: "Anna", avatar_url: null, prayer_request_at: asked(1), profile_private: false, prayer_request_intention: "For my mother, who is ill" },
    { id: BEN, handle: "ben", display_name: "Ben", avatar_url: null, prayer_request_at: asked(2), profile_private: false, prayer_request_intention: null },
  ];
  const prayers: Row[] = [{ owner_id: ANNA, prayer_id: BEN, request_at: profiles[0].prayer_request_at }];
  const { client, requests } = cappedApi({ profiles, profile_prayers: prayers }, {}, {});
  state.reads = requests;
  state.writes = [];
  state.admin = {
    ...client,
    from: client.from.bind(client),
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: { id, email: `${id.slice(0, 4)}@example.com`, user_metadata: {} } } }) } },
  } as unknown as SupabaseClient;
  return { profiles, prayers };
}

async function wall() {
  vi.resetModules();
  const { GET } = await import("@/app/api/community/prayer-wall/route");
  const res = await GET(new Request("https://purifyapp.net/api/community/prayer-wall"));
  return { status: res.status, text: await res.clone().text(), json: (await res.json()) as { requests?: Row[]; intentions?: boolean } };
}

async function pray(handle: string) {
  vi.resetModules();
  const { POST } = await import("@/app/api/community/pray/route");
  const res = await POST(new Request("https://purifyapp.net/api/community/pray", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle }) }));
  return { status: res.status, json: (await res.json()) as { code?: string; ok?: boolean; count?: number } };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_COMMUNITY_ENABLED = "1";
  state.user = null;
  world();
});

describe("the prayer wall's address, after the wall", () => {
  it("answers with nobody on it, to a reader signed in or not, though requests still stand in the database", async () => {
    for (const user of [null, { id: BEN }, { id: ANNA }]) {
      state.user = user;
      const { status, json, text } = await wall();
      expect(status).toBe(200);
      expect(json).toEqual({ requests: [], intentions: false });
      expect(text).not.toContain("mother");
      expect(text).not.toContain("anna");
    }
  });

  it("reads nothing of anyone to say so: not a profile, not a prayer", async () => {
    state.user = { id: ANNA };
    await wall();
    expect(state.reads).toEqual([]);
  });

  it("says a request cannot carry words, so an app of 1.8 asks with its one tap, which the profile's route refuses", async () => {
    // With `intentions` true that app would open its sheet and let a reader write what they ask for.
    expect((await wall()).json.intentions).toBe(false);
  });

  it("is not found where Community is off, as before", async () => {
    process.env.NEXT_PUBLIC_COMMUNITY_ENABLED = "";
    expect((await wall()).status).toBe(404);
  });
});

describe("I prayed, after the wall", () => {
  it("is told nobody is asking, in the words an app of 1.8 already has, and records nothing and tells nobody", async () => {
    const { prayers } = world();
    state.user = { id: BEN };
    const before = structuredClone(prayers);
    // A button an app of 1.8 drew before the website changed.
    const { status, json } = await pray("anna");
    expect(status).toBe(409);
    expect(json.code).toBe("no_request");
    expect(json).not.toHaveProperty("count");
    expect(prayers).toEqual(before);
    expect(state.reads).toEqual([]);
    expect(state.writes).toEqual([]);
  });

  it("the same for a reader who is not signed in: no account is asked for, since there is nothing to do", async () => {
    expect((await pray("anna")).status).toBe(409);
    expect(state.reads).toEqual([]);
  });
});
