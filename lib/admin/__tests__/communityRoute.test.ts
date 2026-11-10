import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/admin/community, run for real with the session, the database and the
 * moderation helpers stood in for. What only the handler can get wrong
 * (his pick A for Community on r3-17):
 *
 *   - who may ask or act at all;
 *   - the count the rail wears is the queue's rows, held posts included,
 *     one per post however many reports name it;
 *   - Dismiss keeps a record: a campaign report the route deletes is
 *     written to the moderation log, with its words, first.
 *
 * Run with prayer campaigns closed, the position these cases were written
 * for and the one the main web is in until 1.9 merges: July's report table
 * keeps no state, so a report set aside is deleted, and the rail counts
 * every row of it. The branch's switch has said "testers" since 2026-11-10
 * (lib/campaigns/flags.ts), so the position is set here and not assumed.
 *
 * NOT HELD HERE, AND NOT YET ANYWHERE: this handler in a build that has the
 * rework. There it hands a campaign decision to lib/campaigns/moderation.ts
 * and reads the open reports alone; that library is held by
 * lib/campaigns/__tests__/moderating.test.ts, but no test runs this handler
 * in that position.
 */

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  admin: { id: "u-owner", email: "owner@example.com" } as { id: string; email: string } | null,
  tables: {} as Record<string, Record<string, unknown>[]>,
  deleted: [] as { table: string; id: unknown }[],
  logged: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/community/moderation", () => ({
  moderatorFor: async () => ({ id: "u-owner", name: "Owner", email: "owner@example.com", admin: true }),
  logMod: async (_admin: unknown, _actor: unknown, entry: Record<string, unknown>) => {
    state.logged.push(entry);
  },
  readOpenReports: async () => [],
  runModAction: async () => ({ ok: true }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const tests: ((r: Row) => boolean)[] = [];
      let single = false;
      const rows = () => (state.tables[table] ?? []).filter((r) => tests.every((t) => t(r)));
      const query = {
        select: () => query,
        eq: (c: string, v: unknown) => (tests.push((r) => r[c] === v), query),
        is: () => query,
        not: () => query,
        in: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: () => ((single = true), query),
        delete: () => ({
          eq: async (_c: string, v: unknown) => {
            state.deleted.push({ table, id: v });
            return { error: null };
          },
        }),
        then: <T>(resolve: (r: { data: unknown; error: null }) => T) =>
          Promise.resolve({ data: single ? (rows()[0] ?? null) : rows(), error: null }).then(resolve),
      };
      return query;
    },
  }),
}));

import { GET, POST } from "@/app/api/admin/community/route";
import { CAMPAIGNS_OPENING, __setCampaignsOpening } from "@/lib/campaigns/flags";

const summary = () => GET(new Request("https://purifyapp.net/api/admin/community?summary=1"));
const act = (body: unknown) =>
  POST(new Request("https://purifyapp.net/api/admin/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

const POST_ID = "11111111-1111-4111-8111-111111111111";
const REPORT_ID = "33333333-3333-4333-8333-333333333333";

afterEach(() => {
  __setCampaignsOpening(CAMPAIGNS_OPENING);
});

beforeEach(() => {
  __setCampaignsOpening("closed");
  state.admin = { id: "u-owner", email: "owner@example.com" };
  state.deleted = [];
  state.logged = [];
  state.tables = {
    trapeza_recipes: [{ id: "rec-1", status: "pending" }],
    prayer_campaign_reports: [{ id: REPORT_ID, campaign_id: "camp-1", reason: "Not a prayer", campaign: { title: "A campaign" } }],
    trapeza_recipe_reports: [],
    community_reports: [
      { id: "r1", post_id: POST_ID, reply_id: null, profile_id: null, status: "open" },
      { id: "r2", post_id: POST_ID, reply_id: null, profile_id: null, status: "open" },
      { id: "r3", post_id: POST_ID, reply_id: null, profile_id: null, status: "open" },
    ],
    community_text_holds: [
      { id: "h1", post_id: POST_ID, reply_id: null, status: "pending" },
      { id: "h2", post_id: null, reply_id: "reply-9", status: "pending" },
    ],
  };
});

describe("/api/admin/community", () => {
  it("answers 403 to anyone who is not an admin, for reads and for actions", async () => {
    state.admin = null;
    expect((await summary()).status).toBe(403);
    expect((await act({ action: "dismiss_campaign_report", id: REPORT_ID })).status).toBe(403);
    expect(state.deleted).toEqual([]);
  });

  it("counts the queue's rows for the rail: held posts in, one per post", async () => {
    const body = (await (await summary()).json()) as Record<string, number>;
    // The post held and reported three times is one row; the held reply is
    // another; the recipe sent in and the campaign report one each.
    expect(body.waiting).toBe(4);
    expect(body.held).toBe(2);
    expect(body.reports).toBe(4);
    expect(body.recipes).toBe(1);
  });

  it("counts a reported shared journal page as one row, until it is kept or hidden (admin A1)", async () => {
    const page = (over: Record<string, unknown>) => ({
      id: "p1",
      title: "",
      body: "",
      created_at: "2026-11-01T10:00:00Z",
      withdrawn_at: null,
      hidden_at: null,
      reviewed_at: null,
      reports: [
        { reason: "Not kind", created_at: "2026-11-02T10:00:00Z" },
        { reason: "Not kind", created_at: "2026-11-03T10:00:00Z" },
      ],
      ...over,
    });
    state.tables.shared_pages = [
      page({}),
      page({ id: "p2", reviewed_at: "2026-11-04T10:00:00Z" }),
      page({ id: "p3", hidden_at: "2026-11-04T10:00:00Z" }),
      page({ id: "p4", reviewed_at: "2026-11-02T12:00:00Z" }),
    ];
    const body = (await (await summary()).json()) as Record<string, number>;
    // p1 never kept; p4 reported again after it was kept. p2 kept since, p3 hidden.
    expect(body.waiting).toBe(6);
  });

  it("writes a dismissed campaign report to the moderation log, with its words, before deleting it", async () => {
    const res = await act({ action: "dismiss_campaign_report", id: REPORT_ID });
    expect(res.status).toBe(200);
    expect(state.deleted).toEqual([{ table: "prayer_campaign_reports", id: REPORT_ID }]);
    expect(state.logged).toEqual([
      { action: "dismiss_campaign_report", target: "report", targetId: REPORT_ID, summary: "A report on A campaign: Not a prayer" },
    ]);
  });
});
