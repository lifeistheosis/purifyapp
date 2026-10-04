import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The window the Engagement and Content tabs ask the database to count, read
 * off the real handlers.
 *
 * It has to start at midnight UTC. admin_pageview_rollup answers such a
 * window from the days already counted
 * (supabase/migrations/20261009000000_analytics_daily.sql) and counts any
 * other row by row, which gives the same numbers several seconds later. And
 * the two tabs have to ask for the same 30 days: the Content tab used to
 * count 720 hours back from the instant it was opened, so a page had one
 * count on one tab and another on the next.
 */

const state = vi.hoisted(() => ({
  since: [] as string[],
  oldest: "2026-05-21T14:03:11.000Z",
  empty: {
    totals: { views: 0, visitors: 0 },
    sessions: { total: 0, returning: 0 },
    sections: [],
    topByVisitors: [],
    topByViews: [],
    revisited: [],
    slugs: [],
  },
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => ({ email: "owner@example.com" }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc(name: string, args: { p_since: string }) {
      if (name === "admin_pageview_rollup") state.since.push(args.p_since);
      return Promise.resolve({ data: state.empty, error: null });
    },
    from(table: string) {
      const query = {
        select: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: () =>
          Promise.resolve({ data: table === "analytics_sessions" ? { first_seen: state.oldest } : null, error: null }),
        then: <T>(resolve: (result: { data: unknown[]; count: number; error: null }) => T) =>
          Promise.resolve({ data: [], count: 0, error: null }).then(resolve),
      };
      return query;
    },
  }),
}));

import { GET as engagement } from "@/app/api/admin/engagement/route";
import { GET as content } from "@/app/api/admin/content/route";

const ask = (range: string) => engagement(new NextRequest(`http://test.local/api/admin/engagement?range=${range}`));

beforeEach(() => {
  state.since.length = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-04T15:30:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the window the page view tabs ask for", () => {
  it("starts at midnight UTC for every range on Engagement", async () => {
    for (const range of ["7d", "30d", "90d", "all"]) expect((await ask(range)).status).toBe(200);
    expect(state.since).toEqual([
      "2026-09-28T00:00:00.000Z",
      "2026-09-05T00:00:00.000Z",
      "2026-07-07T00:00:00.000Z",
      // "all" is from the day of the oldest session, not from a large constant.
      "2026-05-21T00:00:00.000Z",
    ]);
  });

  it("is the same 30 days on Content as on Engagement", async () => {
    expect((await content()).status).toBe(200);
    expect((await ask("30d")).status).toBe(200);
    expect(state.since).toEqual(["2026-09-05T00:00:00.000Z", "2026-09-05T00:00:00.000Z"]);
  });

  it("still starts at midnight a second before the day turns, and a second after", async () => {
    vi.setSystemTime(new Date("2026-10-04T23:59:59.000Z"));
    await content();
    vi.setSystemTime(new Date("2026-10-05T00:00:01.000Z"));
    await content();
    expect(state.since).toEqual(["2026-09-05T00:00:00.000Z", "2026-09-06T00:00:00.000Z"]);
  });
});
