// Which DAY the app thinks it is.
//
// Two separate faults were fixed together in Beta 2.7, and this file pins the
// second one. The first was that the day was computed in a server component
// under output:"export", so it froze at build time; that is structural and is
// guarded by the export check in the release ritual. The second is here: the
// app resolved the day in UTC, which runs ahead of local time for the whole
// Western hemisphere, so a reader in the United States was shown tomorrow's
// commemoration and tomorrow's fasting rule from roughly 7pm onward.
//
// These tests fix the process timezone rather than trusting the machine's,
// so they fail on a US-configured laptop and on a UTC CI runner alike.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startOfDayLocal, startOfDayUtc } from "@/lib/calendar/orthodox";

const ORIGINAL_TZ = process.env.TZ;

/** The UTC calendar day of a Date, as "YYYY-MM-DD". */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

describe("startOfDayLocal vs startOfDayUtc", () => {
  beforeAll(() => {
    // America/New_York: UTC-4 in July. 8pm local on the 31st is already
    // 00:00 UTC on August 1, which is the exact moment the old code started
    // showing readers the wrong day.
    process.env.TZ = "America/New_York";
  });

  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  it("agrees with UTC during the local morning", () => {
    // 2026-07-31 09:00 in New York is 13:00 UTC. Same calendar day both ways.
    const t = new Date("2026-07-31T13:00:00Z");
    expect(dayKey(startOfDayLocal(t))).toBe("2026-07-31");
    expect(dayKey(startOfDayUtc(t))).toBe("2026-07-31");
  });

  it("holds the local day in the evening, where UTC has already rolled over", () => {
    // 2026-07-31 20:00 in New York is 2026-08-01 00:00 UTC. This is the bug:
    // it is still Friday evening for the reader, and the app was showing them
    // Saturday's saint and Saturday's fast.
    const t = new Date("2026-08-01T00:00:00Z");
    expect(dayKey(startOfDayLocal(t))).toBe("2026-07-31");
    expect(dayKey(startOfDayUtc(t))).toBe("2026-08-01");
  });

  it("still rolls over at the reader's own midnight", () => {
    // 2026-08-01 00:30 in New York is 04:30 UTC. Now it really is August.
    const t = new Date("2026-08-01T04:30:00Z");
    expect(dayKey(startOfDayLocal(t))).toBe("2026-08-01");
  });

  it("normalises to UTC noon, which is the frame the lookups expect", () => {
    // fastingStatus and the feast constants are built on Date.UTC(..., 12).
    // Anchoring at noon is what keeps a DST shift from moving the day.
    const t = new Date("2026-08-01T00:00:00Z");
    expect(startOfDayLocal(t).getUTCHours()).toBe(12);
  });
});

describe("startOfDayLocal ahead of UTC", () => {
  beforeAll(() => {
    // Asia/Tokyo is UTC+9: the mirror case, where the reader's day is ahead
    // of UTC rather than behind it.
    process.env.TZ = "Asia/Tokyo";
  });

  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  it("holds the local day in the early morning, where UTC is still yesterday", () => {
    // 2026-08-01 07:00 in Tokyo is 2026-07-31 22:00 UTC.
    const t = new Date("2026-07-31T22:00:00Z");
    expect(dayKey(startOfDayLocal(t))).toBe("2026-08-01");
    expect(dayKey(startOfDayUtc(t))).toBe("2026-07-31");
  });
});
