import { describe, expect, it } from "vitest";

import {
  bucketByDay,
  dayKey,
  dayKeys,
  daysSince,
  emptyBuckets,
  isPartial,
  windowStart,
} from "../dayWindow";

/**
 * The admin charts stopped at yesterday. These pin the fix.
 *
 * The failure was an off-by-one that reads as correct: a window starting at
 * midnight thirty days ago, iterated thirty times, lands on YESTERDAY. The
 * shape that works iterates i = N-1 down to 0 off `now`. Both are three lines
 * and look equally reasonable, so the difference is asserted here rather than
 * left to whoever writes the next chart.
 *
 * `now` is pinned to a fixed instant in every test. A date helper tested
 * against the real clock passes at 3pm and fails at midnight.
 */

// Mid-afternoon UTC, so "today" is unambiguously in progress.
const NOW = new Date("2026-08-26T15:30:00.000Z");

describe("dayKeys", () => {
  it("ENDS ON TODAY, which is the whole point", () => {
    const keys = dayKeys(30, NOW);
    expect(keys[keys.length - 1]).toBe("2026-08-26");
  });

  it("returns exactly N buckets", () => {
    expect(dayKeys(30, NOW)).toHaveLength(30);
    expect(dayKeys(7, NOW)).toHaveLength(7);
    expect(dayKeys(1, NOW)).toHaveLength(1);
  });

  it("starts N-1 days back, so 30 days means today and the 29 before it", () => {
    const keys = dayKeys(30, NOW);
    expect(keys[0]).toBe("2026-07-28");
    expect(keys[29]).toBe("2026-08-26");
  });

  it("is oldest first, which is the order a chart draws", () => {
    const keys = dayKeys(5, NOW);
    expect(keys).toEqual([...keys].sort());
  });

  it("has no gaps and no repeats", () => {
    const keys = dayKeys(45, NOW);
    expect(new Set(keys).size).toBe(45);
    for (let i = 1; i < keys.length; i++) {
      const prev = new Date(keys[i - 1] + "T00:00:00Z").getTime();
      const cur = new Date(keys[i] + "T00:00:00Z").getTime();
      expect(cur - prev).toBe(86_400_000);
    }
  });

  it("crosses a month boundary correctly", () => {
    // 1 September looking back 3 days must reach into August.
    expect(dayKeys(3, new Date("2026-09-01T09:00:00.000Z"))).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
    ]);
  });

  it("crosses a year boundary correctly", () => {
    expect(dayKeys(3, new Date("2027-01-01T00:30:00.000Z"))).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
    ]);
  });

  it("handles a leap day", () => {
    expect(dayKeys(3, new Date("2028-03-01T12:00:00.000Z"))).toEqual([
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
    ]);
  });

  it("still includes today one minute before midnight, and one minute after", () => {
    // The bug class lives at the edges of the day, so both are pinned.
    expect(dayKeys(2, new Date("2026-08-26T23:59:00.000Z"))[1]).toBe("2026-08-26");
    expect(dayKeys(2, new Date("2026-08-27T00:01:00.000Z"))[1]).toBe("2026-08-27");
  });

  it("never returns zero buckets", () => {
    expect(dayKeys(0, NOW)).toHaveLength(1);
    expect(dayKeys(-5, NOW)).toHaveLength(1);
  });
});

describe("windowStart", () => {
  it("is midnight of the OLDEST bucket, not the current time minus N days", () => {
    // Unsnapped, the query would drop everything that happened on the oldest
    // day before 15:30, quietly truncating the first bar of the chart.
    expect(windowStart(30, NOW)).toBe("2026-07-28T00:00:00.000Z");
  });

  it("lines up exactly with the first key dayKeys returns", () => {
    for (const days of [1, 7, 30, 90]) {
      expect(windowStart(days, NOW).slice(0, 10)).toBe(dayKeys(days, NOW)[0]);
    }
  });
});

describe("bucketByDay", () => {
  const rows = [
    { at: "2026-08-26T09:00:00.000Z" }, // today
    { at: "2026-08-26T14:00:00.000Z" }, // today
    { at: "2026-08-25T23:00:00.000Z" }, // yesterday
    { at: "2026-07-01T10:00:00.000Z" }, // long before the window
    { at: null },
  ];

  it("counts today, which is the bug being fixed", () => {
    const out = bucketByDay(rows, (r) => r.at, 30, NOW);
    expect(out[out.length - 1]).toEqual({ date: "2026-08-26", count: 2 });
  });

  it("counts yesterday in its own bucket", () => {
    const out = bucketByDay(rows, (r) => r.at, 30, NOW);
    expect(out.find((b) => b.date === "2026-08-25")?.count).toBe(1);
  });

  it("DROPS rows outside the window instead of clamping them into the end", () => {
    // Clamping is the subtle version of this bug: one stray old row silently
    // inflates the oldest bar and the chart looks like a spike that year.
    const out = bucketByDay(rows, (r) => r.at, 30, NOW);
    const total = out.reduce((a, b) => a + b.count, 0);
    expect(total).toBe(3);
    expect(out[0].count).toBe(0);
  });

  it("ignores rows with no date rather than throwing", () => {
    expect(() => bucketByDay(rows, (r) => r.at, 30, NOW)).not.toThrow();
  });

  it("accepts a Date as well as an ISO string", () => {
    const out = bucketByDay(
      [{ at: new Date("2026-08-26T01:00:00.000Z") }],
      (r) => r.at,
      7,
      NOW,
    );
    expect(out[out.length - 1].count).toBe(1);
  });

  it("returns every bucket, including the empty ones", () => {
    // A chart that omits empty days draws a misleading continuous line.
    expect(bucketByDay([], () => null, 30, NOW)).toHaveLength(30);
  });
});

describe("emptyBuckets and isPartial", () => {
  it("emptyBuckets is zeroed and in chart order", () => {
    const b = emptyBuckets(5, NOW);
    expect([...b.keys()]).toEqual(dayKeys(5, NOW));
    expect([...b.values()].every((v) => v === 0)).toBe(true);
  });

  it("isPartial is true only for today", () => {
    expect(isPartial("2026-08-26", NOW)).toBe(true);
    expect(isPartial("2026-08-25", NOW)).toBe(false);
  });

  it("the last bucket is always the partial one", () => {
    const keys = dayKeys(30, NOW);
    expect(isPartial(keys[keys.length - 1], NOW)).toBe(true);
    expect(keys.slice(0, -1).some((k) => isPartial(k, NOW))).toBe(false);
  });
});

describe("dayKey", () => {
  it("is the UTC date, not the local one", () => {
    // 23:30 UTC is already the next day in much of Europe. The rows are keyed
    // in UTC, so the buckets must be too or one end gains a phantom day.
    expect(dayKey(new Date("2026-08-26T23:30:00.000Z"))).toBe("2026-08-26");
    expect(dayKey("2026-08-26T00:30:00.000Z")).toBe("2026-08-26");
  });
});

describe("daysSince, for the All time range", () => {
  it("counts both ends, so the same day is one bucket", () => {
    expect(daysSince("2026-08-26T01:00:00.000Z", NOW)).toBe(1);
  });

  it("ignores the time of day at either end", () => {
    // A record at 23:00 and one at 01:00 on the same day must agree, or the
    // chart's length would depend on when the operator opened it.
    expect(daysSince("2026-08-20T23:59:00.000Z", NOW)).toBe(
      daysSince("2026-08-20T00:01:00.000Z", NOW),
    );
    expect(daysSince("2026-08-20T23:59:00.000Z", NOW)).toBe(7);
  });

  it("spans months and years correctly", () => {
    expect(daysSince("2026-07-28T00:00:00.000Z", NOW)).toBe(30);
    expect(daysSince("2025-08-26T00:00:00.000Z", NOW)).toBe(366);
  });

  it("CAPS a wild timestamp instead of asking for twenty thousand buckets", () => {
    // One bad import or a device with a 1970 clock would otherwise generate a
    // decade of empty rows in Postgres and a payload to match.
    expect(daysSince("1970-01-01T00:00:00.000Z", NOW)).toBe(730);
    expect(daysSince("1970-01-01T00:00:00.000Z", NOW, 365)).toBe(365);
  });

  it("never returns zero or negative", () => {
    expect(daysSince(null, NOW)).toBe(1);
    expect(daysSince(undefined, NOW)).toBe(1);
    expect(daysSince("not a date", NOW)).toBe(1);
    // A timestamp in the future is not a negative window.
    expect(daysSince("2027-01-01T00:00:00.000Z", NOW)).toBe(1);
  });

  it("hands dayKeys a window that still ends on today", () => {
    const days = daysSince("2026-08-20T10:00:00.000Z", NOW);
    const keys = dayKeys(days, NOW);
    expect(keys[0]).toBe("2026-08-20");
    expect(keys[keys.length - 1]).toBe("2026-08-26");
  });
});
