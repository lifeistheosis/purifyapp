import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

/**
 * The prayer wall's route (1.7.1): each request carries what it asks prayers
 * for, in the reader's own words, and says whether the server can keep words
 * at all yet, so the ask offers the field only once
 * docs/1.8-build/sql/prayer-request-intention.sql has run. What leaves is a
 * handle, a name, a picture, a count and those words: never an account id.
 */

type Row = Record<string, unknown>;

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";

const state = vi.hoisted(() => ({ admin: null as unknown, user: null as null | { id: string } }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
vi.mock("@/lib/community/social", () => ({ signedInUser: async () => state.user }));
vi.mock("@/lib/community/blocks", () => ({ hiddenAuthors: async () => ({ blocked: [], muted: [] }) }));

function world({ open = true } = {}) {
  const asked = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
  const profiles: Row[] = [
    { id: ANNA, handle: "anna", display_name: "Anna", avatar_url: null, prayer_request_at: asked(1), profile_private: false, prayer_request_intention: "For my mother, who is ill" },
    { id: BEN, handle: "ben", display_name: "Ben", avatar_url: null, prayer_request_at: asked(2), profile_private: false, prayer_request_intention: null },
  ];
  const { client } = cappedApi(
    { profiles, profile_prayers: [] },
    {},
    {
      // Before the SQL the first read names the column and fails as Postgres fails it.
      fail: ({ table, n }) => (!open && table === "profiles" && n === 1 ? { code: "42703", message: "column profiles.prayer_request_intention does not exist" } : null),
    },
  );
  state.admin = {
    ...client,
    from: client.from.bind(client),
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: { id, email: `${id.slice(0, 4)}@example.com`, user_metadata: {} } } }) } },
  } as unknown as SupabaseClient;
}

/** The route, fresh each time: it keeps the wall for a minute per server. */
async function wall() {
  vi.resetModules();
  const { GET } = await import("@/app/api/community/prayer-wall/route");
  const res = await GET(new Request("https://purifyapp.net/api/community/prayer-wall"));
  return { status: res.status, json: (await res.json()) as { requests: Row[]; intentions: boolean } };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_COMMUNITY_ENABLED = "1";
  state.user = null;
  world();
});

describe("the prayer wall", () => {
  it("carries each request's own words, and says the server can keep them", async () => {
    const { status, json } = await wall();
    expect(status).toBe(200);
    expect(json.intentions).toBe(true);
    expect(json.requests.map((r) => [r.handle, r.intention])).toEqual([
      ["anna", "For my mother, who is ill"],
      ["ben", null],
    ]);
    const text = JSON.stringify(json);
    expect(text).not.toContain(ANNA);
    expect(text).not.toContain(BEN);
  });

  it("shows the reader their own request as it is now, words and all", async () => {
    state.user = { id: ANNA };
    const { json } = await wall();
    expect(json.requests[0]).toMatchObject({ handle: "anna", mine: true, intention: "For my mother, who is ill" });
  });

  it("before the column exists, reads without it and says so", async () => {
    world({ open: false });
    const { status, json } = await wall();
    expect(status).toBe(200);
    expect(json.intentions).toBe(false);
    expect(json.requests.map((r) => r.handle)).toEqual(["anna", "ben"]);
  });
});
