import { describe, expect, it } from "vitest";

import { addDays, createTrafficSeries, daysFrom, lastFinalDay, missingRuns, type DayPoint } from "../trafficSeries";

/**
 * Traffic's days, counted once (lib/admin/trafficSeries.ts). The fake read
 * stands in for analytics_daily_buckets: it answers every day it is asked
 * for, its figures made from the date, and counts what it was asked.
 */
function fakeRead() {
  const calls: { since: string; days: number }[] = [];
  let failNext = false;
  const read = async (sinceIso: string, days: number): Promise<DayPoint[]> => {
    calls.push({ since: sinceIso.slice(0, 10), days });
    if (failNext) {
      failNext = false;
      throw new Error("aggregation failed");
    }
    const out: DayPoint[] = [];
    for (let i = 0; i < days; i++) {
      const date = addDays(sinceIso.slice(0, 10), i);
      const n = Number(date.slice(8, 10));
      out.push({ date, visitors: n * 10, views: n * 50, signups: n });
    }
    return out;
  };
  return { read, calls, failOnce: () => (failNext = true) };
}

const at = (iso: string) => Date.parse(iso);

describe("the day rules", () => {
  it("keeps a day once a quarter of an hour has passed since it ended", () => {
    expect(lastFinalDay(at("2026-11-04T00:10:00Z"))).toBe("2026-11-02");
    expect(lastFinalDay(at("2026-11-04T00:20:00Z"))).toBe("2026-11-03");
    expect(lastFinalDay(at("2026-11-04T15:00:00Z"))).toBe("2026-11-03");
  });
  it("finds the runs of days not yet held", () => {
    const held = new Set(["2026-11-02", "2026-11-03"]);
    expect(missingRuns((d) => held.has(d), "2026-10-31", "2026-11-05")).toEqual([
      { from: "2026-10-31", days: 2 },
      { from: "2026-11-04", days: 2 },
    ]);
    expect(missingRuns(() => true, "2026-10-31", "2026-11-05")).toEqual([]);
    expect(missingRuns(() => false, "2026-11-05", "2026-11-04")).toEqual([]);
    expect(daysFrom("2026-10-31", "2026-11-05")).toBe(6);
  });
});

describe("createTrafficSeries", () => {
  it("counts the window once, then only today, and gives the same figures", async () => {
    const f = fakeRead();
    let now = at("2026-11-04T15:00:00Z");
    const s = createTrafficSeries(f.read, () => now);

    const one = await s.series(120, "now");
    expect(one.points).toHaveLength(120);
    expect(one.points[0].date).toBe("2026-07-08");
    expect(one.through).toBe("2026-11-04");
    expect(one.points.at(-1)).toEqual({ date: "2026-11-04", visitors: 40, views: 200, signups: 4 });
    expect(f.calls).toEqual([
      { since: "2026-07-08", days: 119 },
      { since: "2026-11-04", days: 1 },
    ]);

    // Another panel asks within half a minute: nothing is counted.
    now += 10_000;
    const two = await s.series(90, "now");
    expect(two.points).toHaveLength(90);
    expect(two.counted).toBe(0);
    expect(f.calls).toHaveLength(2);

    // Later the same day: today alone.
    now += 60_000;
    await s.series(120, "now");
    expect(f.calls.slice(2)).toEqual([{ since: "2026-11-04", days: 1 }]);
  });

  it("keeps yesterday once it is over, and counts only the new day", async () => {
    const f = fakeRead();
    let now = at("2026-11-04T15:00:00Z");
    const s = createTrafficSeries(f.read, () => now);
    await s.series(30, "now");
    f.calls.length = 0;

    // Just after midnight the day before is still running for a quarter hour.
    now = at("2026-11-05T00:05:00Z");
    await s.series(30, "now");
    expect(f.calls).toEqual([{ since: "2026-11-04", days: 2 }]);

    f.calls.length = 0;
    now = at("2026-11-05T00:20:00Z");
    const after = await s.series(30, "now");
    expect(f.calls).toEqual([
      { since: "2026-11-04", days: 1 },
      { since: "2026-11-05", days: 1 },
    ]);
    expect(after.points.at(-1)?.date).toBe("2026-11-05");
    expect(after.points.at(-2)).toEqual({ date: "2026-11-04", visitors: 40, views: 200, signups: 4 });
  });

  it("ends on last night for Last night, and counts nothing still running", async () => {
    const f = fakeRead();
    const s = createTrafficSeries(f.read, () => at("2026-11-04T15:00:00Z"));
    const r = await s.series(7, "complete");
    expect(r.through).toBe("2026-11-03");
    expect(r.points.map((p) => p.date)).toEqual([
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
    expect(f.calls).toEqual([{ since: "2026-10-28", days: 7 }]);
  });

  it("shares one count between panels that ask at the same moment", async () => {
    const f = fakeRead();
    const s = createTrafficSeries(f.read, () => at("2026-11-04T15:00:00Z"));
    await Promise.all([s.series(120, "now"), s.series(120, "now"), s.series(120, "now")]);
    expect(f.calls).toHaveLength(2);
  });

  it("keeps nothing from a failed count, so the next open asks again", async () => {
    const f = fakeRead();
    const s = createTrafficSeries(f.read, () => at("2026-11-04T15:00:00Z"));
    f.failOnce();
    await expect(s.series(14, "complete")).rejects.toThrow("aggregation failed");
    expect(s.keptDays()).toBe(0);
    const r = await s.series(14, "complete");
    expect(r.points).toHaveLength(14);
    expect(f.calls).toHaveLength(2);
  });
});
