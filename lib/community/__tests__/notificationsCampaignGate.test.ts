import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GET /api/community/notifications and the notices about prayer campaigns
 * (phase 4, 2026-11-10).
 *
 * What would go wrong if this broke: an app built before them (1.8, still on
 * readers' phones) is handed a notice it draws as "replied to your post", and
 * a tap opens a campaign's thread, which Community does not show; or it lights
 * an unread dot for a row it cannot see. Or a new inbox gets an update notice
 * with no campaign to open.
 */

const READER = "11111111-1111-4111-8111-111111111111";
const THREAD_POST = "22222222-2222-4222-8222-222222222222";
const CAMPAIGN = "33333333-3333-4333-8333-333333333333";

const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  unreadFilters: [] as string[],
  adminAsked: [] as string[][],
}));

vi.mock("@/lib/community/flags", () => ({ communityEnabled: () => true }));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "ip" }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: READER } } }) },
    from: (name: string) => {
      expect(name).toBe("community_notifications");
      return {
        select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.head) {
            // The unread count: everything unread, or, for an older app, all but the campaign notices.
            const unread = state.rows.filter((r) => !r.read_at);
            const counted = {
              neq: (col: string, val: string) => {
                state.unreadFilters.push(`${col}.neq.${val}`);
                return {
                  or: (filter: string) => {
                    state.unreadFilters.push(filter);
                    return Promise.resolve({ count: unread.filter((r) => r.target_kind !== "campaign" && r.kind !== "care").length, error: null });
                  },
                };
              },
              then: (resolve: (v: unknown) => unknown) => Promise.resolve({ count: unread.length, error: null }).then(resolve),
            };
            return { is: () => counted };
          }
          return { order: () => ({ limit: async () => ({ data: state.rows, error: null }) }) };
        },
      };
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (name: string) => {
      expect(name).toBe("community_posts");
      return {
        select: () => ({
          in: async (_col: string, ids: string[]) => {
            state.adminAsked.push(ids);
            return { data: ids.map((id) => ({ id, campaign_id: id === THREAD_POST ? CAMPAIGN : null })), error: null };
          },
        }),
      };
    },
  }),
}));

import { GET } from "@/app/api/community/notifications/route";

const reply = { id: "n1", kind: "reply", post_id: "p1", reply_id: "r1", actor_name: "Anna", excerpt: "A reply", read_at: null, created_at: "2026-11-10T20:00:00Z", target_kind: null };
const update = { id: "n2", kind: "reply", post_id: THREAD_POST, reply_id: "u1", actor_name: "Purify", excerpt: null, read_at: null, created_at: "2026-11-10T21:00:00Z", target_kind: "campaign" };
const approved = { id: "n3", kind: "approved", post_id: null, reply_id: null, actor_name: "Purify", excerpt: "For my mother", read_at: null, created_at: "2026-11-10T22:00:00Z", target_kind: "campaign" };
const care = { id: "n4", kind: "care", post_id: null, reply_id: null, actor_name: "Purify", excerpt: null, read_at: null, created_at: "2026-11-10T23:00:00Z", target_kind: null };

const get = async (query: string) => {
  const res = await GET(new Request(`https://purifyapp.net/api/community/notifications${query}`));
  return (await res.json()) as { notifications: Record<string, unknown>[]; unread: number };
};

beforeEach(() => {
  state.rows = [care, approved, update, reply];
  state.unreadFilters = [];
  state.adminAsked = [];
});

describe("the notices 1.9 added: a prayer campaign's and the care note", () => {
  it("are never handed to an inbox that does not ask for them, nor counted in its unread", async () => {
    const body = await get("");
    expect(body.notifications.map((n) => n.id)).toEqual(["n1"]);
    expect(body.unread).toBe(1);
    expect(state.unreadFilters).toEqual(["kind.neq.care", "target_kind.is.null,target_kind.neq.campaign"]);
    expect(state.adminAsked).toEqual([]);
  });

  it("are not handed on the old name of the question either", async () => {
    const body = await get("?campaigns=1");
    expect(body.notifications.map((n) => n.id)).toEqual(["n1"]);
  });

  it("are handed to the inbox that asks, the update with its campaign, and counted", async () => {
    const body = await get("?inbox=2");
    expect(body.notifications.map((n) => n.id)).toEqual(["n4", "n3", "n2", "n1"]);
    expect(body.notifications.find((n) => n.id === "n2")?.campaign_id).toBe(CAMPAIGN);
    // The approval names no post, so it has no campaign to read; it opens Your campaigns.
    expect(body.notifications.find((n) => n.id === "n3")?.campaign_id).toBeNull();
    // Every other notice is untouched.
    expect(body.notifications.find((n) => n.id === "n1")).not.toHaveProperty("campaign_id");
    expect(body.unread).toBe(4);
    expect(state.unreadFilters).toEqual([]);
  });

  it("asks the service role only for the posts this reader's own notices name", async () => {
    await get("?inbox=2");
    expect(state.adminAsked).toEqual([[THREAD_POST]]);
  });
});
