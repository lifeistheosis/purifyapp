import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { allTimeDays } from "@/lib/admin/allTime";
import { parseChartRange } from "@/lib/admin/chartRangePreference";
import { daysSince, parseDaysWindow } from "@/lib/admin/dayWindow";
import { ALL_TIME_MONTHS, MONEY_PERIODS, moneyWindow, shopBuckets, type MoneyOrder } from "@/lib/admin/money";
import { DAILY_UP_TO, byWeek, trafficAllUrl } from "@/lib/admin/trafficChart";

// An "All time" choice on every admin chart's range picker (the owner,
// 2026-11-11: "real quick for the admin panel can you set up a all time option
// for the charts"). Each window is measured from the oldest row its read would
// count and capped (daysSince, ALL_TIME_MONTHS); the traffic chart draws weeks
// past DAILY_UP_TO days. Every case here fails on the code before it.

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const NOW = new Date("2026-11-11T18:00:00Z");

/** A stand-in for the Supabase query builder: every step returns itself, and awaiting it gives `rows`. */
function fakeDb(rows: Record<string, unknown>[]) {
  const asked: { table?: string; filters: [string, unknown][]; order?: string } = { filters: [] };
  const q = {
    select: () => q,
    order: (column: string) => {
      asked.order = column;
      return q;
    },
    limit: () => q,
    in: (column: string, values: unknown) => {
      asked.filters.push([column, values]);
      return q;
    },
    then: (done: (v: { data: Record<string, unknown>[] }) => unknown) => done({ data: rows }),
  };
  const db = {
    from: (table: string) => {
      asked.table = table;
      return q;
    },
  };
  return { db: db as unknown as Parameters<typeof allTimeDays>[0], asked };
}

describe("All time on the admin's charts", () => {
  it("is measured from the oldest row the read would count, narrowed to its events", async () => {
    const { db, asked } = fakeDb([{ ts: "2026-06-10T12:00:00Z" }]);
    expect(await allTimeDays(db, "analytics_events", "ts", ["lock_tap"], NOW)).toBe(daysSince("2026-06-10T12:00:00Z", NOW));
    expect(asked).toEqual({ table: "analytics_events", filters: [["name", ["lock_tap"]]], order: "ts" });
    // No row at all is one day, and a wrong timestamp is capped, never years of days.
    expect(await allTimeDays(fakeDb([]).db, "analytics_pageviews", "ts", undefined, NOW)).toBe(1);
    expect(await allTimeDays(fakeDb([{ first_seen: "1970-01-01T00:00:00Z" }]).db, "analytics_sessions", "first_seen", undefined, NOW)).toBe(730);
  });

  it("a route reads ?days=all as All time, and anything it does not offer as its default", () => {
    expect(parseDaysWindow("all", [7, 30, 90], 30)).toBe("all");
    expect(parseDaysWindow("7", [7, 30, 90], 30)).toBe(7);
    expect(parseDaysWindow("45", [7, 30, 90], 30)).toBe(30);
    expect(parseDaysWindow(null, [7, 30, 90], 30)).toBe(30);
  });

  it("the traffic chart offers All, remembers it, and reads it on its own", () => {
    expect(parseChartRange("all")).toBe("all");
    expect(parseChartRange("14")).toBe(14);
    expect(trafficAllUrl("complete")).toBe("/api/admin/traffic?range=all&latest=complete");
    const views = read("components/admin/tabs/TrafficViews.tsx");
    expect(views).toContain('["all", "All"]');
    expect(views).toMatch(/all \? trafficAllUrl\(latest\) : trafficUrl\(latest\)/);
  });

  it("past 180 days the chart draws weeks: a day's mean, counted back from the newest day", () => {
    const days = Array.from({ length: 10 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, "0")}`, visitors: i + 1, views: 2 * (i + 1), signups: i % 2 }));
    const weeks = byWeek(days);
    expect(weeks.map((w) => [w.date, w.days])).toEqual([
      ["2026-11-01", 3],
      ["2026-11-04", 7],
    ]);
    // Days 4 to 10: visitors 4..10, mean 7; views 8..20, mean 14; signups 1,0,1,0,1,0,1, mean 0.6.
    expect(weeks[1]).toMatchObject({ visitors: 7, views: 14, signups: 0.6 });
    expect(DAILY_UP_TO).toBe(180);
    expect(byWeek(Array.from({ length: 365 }, (_, i) => ({ date: String(i), visitors: 1, views: 1, signups: 0 }))).length).toBe(53);
  });

  it("every other range picker offers All time, and its route reads it", () => {
    for (const tab of ["LocksPanel", "OnboardingTab", "InUseTab", "ScreensTab", "SourcesTab"]) {
      expect(read(`components/admin/tabs/${tab}.tsx`), tab).toContain('["all", "All time"]');
    }
    for (const route of ["locks", "in-use", "onboarding", "screens"]) {
      const src = read(`app/api/admin/${route}/route.ts`);
      expect(src, route).toContain('parseDaysWindow(new URL(req.url).searchParams.get("days"), [7, 30, 90], 30)');
      expect(src, route).toMatch(/asked === "all" \? await allTimeDays\(/);
    }
    expect(read("app/api/admin/sources/route.ts")).toMatch(/range === "all" \? await allTimeDays\(supa, "analytics_sessions", "first_seen"\)/);
    expect(MONEY_PERIODS.map(([id]) => id)).toContain("all");
    expect(read("app/api/admin/money/route.ts")).toContain('"12m", "all"]');
  });

  it("Money's All time runs by month from the first paid order, with no period before it", () => {
    const w = moneyWindow("all", NOW, "2026-06-20T09:00:00Z");
    expect(w).toMatchObject({ since: "2026-06-01T00:00:00.000Z", beforeSince: "2026-06-01T00:00:00.000Z", months: 6, buckets: "month", beforeLabel: "" });
    // No order yet is this month alone; an order dated in 1970 is capped, as daysSince caps days.
    expect(moneyWindow("all", NOW, null).months).toBe(1);
    expect(moneyWindow("all", NOW, "1970-01-01T00:00:00Z").months).toBe(ALL_TIME_MONTHS);

    const order = (at: string, cents: number): MoneyOrder => ({ total_cents: cents, payment_status: "paid", created_at: at, paid_at: at });
    const buckets = shopBuckets([order("2026-06-20T09:00:00Z", 1000), order("2026-11-02T09:00:00Z", 500)], w, NOW);
    expect(buckets.current).toEqual([1000, 0, 0, 0, 0, 500]);
    expect(buckets.before).toEqual([]);
    // Twelve months keeps its twelve buckets and the twelve before them.
    const year = shopBuckets([], moneyWindow("12m", NOW), NOW);
    expect([year.current.length, year.before.length]).toEqual([12, 12]);
  });
});
