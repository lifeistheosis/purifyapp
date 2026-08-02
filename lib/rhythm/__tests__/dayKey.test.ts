// The dateline test. This is the reason lib/rhythm/dayKey.ts exists.
//
// `useToday()` hands every Today surface a UTC-noon Date carrying the reader's
// LOCAL day. Reading that with local getters (which is what all four existing
// `YYYY-MM-DD` helpers in this repo do) returns the wrong day wherever the UTC
// offset is large enough to push noon-UTC across midnight. At UTC+13/+14 that
// is a mark landing on a day that has not happened yet.
//
// Every case below asserts the same invariant from two directions:
//
//   keyOf(startOfDayLocal(now))  ===  ymd(now)      // agrees with storage.ts
//   todayKey(now)                ===  ymd(now)
//
// where `ymd` is a local copy of the private helper in lib/prayers/storage.ts.
// If someone changes that helper, this test still pins the contract that the
// two must agree, because a divergence silently splits a reader's history
// across two keys.

import { afterEach, describe, expect, it } from "vitest";

import { startOfDayLocal } from "@/lib/calendar/orthodox";
import { keyOf, keysEndingAt, todayKey } from "../dayKey";

/** Verbatim copy of the private `ymd` in lib/prayers/storage.ts. */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const ORIGINAL_TZ = process.env.TZ;

/**
 * Node reads TZ per Date construction, so setting it between constructions is
 * enough. Vitest runs this file in a node environment (see vitest.config.ts).
 */
function withZone(tz: string, fn: () => void) {
  process.env.TZ = tz;
  try {
    fn();
  } finally {
    process.env.TZ = ORIGINAL_TZ;
  }
}

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

// Both extremes of the dateline, one half-hour offset, and the identity case.
const ZONES = [
  "Pacific/Kiritimati", // UTC+14, the furthest ahead on earth
  "Pacific/Niue", // UTC-11, the furthest behind
  "Asia/Kathmandu", // UTC+05:45, a non-hour offset
  "UTC",
];

// Instants chosen to sit either side of local midnight and either side of
// noon UTC, which is where the frame confusion actually bites.
const INSTANTS = [
  "2026-08-02T00:30:00Z",
  "2026-08-02T09:00:00Z",
  "2026-08-02T11:59:00Z",
  "2026-08-02T12:01:00Z",
  "2026-08-02T13:00:00Z",
  "2026-08-02T23:45:00Z",
  "2026-12-31T23:59:00Z", // year boundary
  "2027-01-01T00:01:00Z",
];

describe("dayKey", () => {
  for (const tz of ZONES) {
    describe(tz, () => {
      it("keyOf on the UTC-noon frame equals storage.ts's local ymd", () => {
        withZone(tz, () => {
          for (const iso of INSTANTS) {
            const now = new Date(iso);
            expect(keyOf(startOfDayLocal(now)), `${tz} @ ${iso}`).toBe(
              ymd(now),
            );
          }
        });
      });

      it("todayKey equals storage.ts's local ymd", () => {
        withZone(tz, () => {
          for (const iso of INSTANTS) {
            const now = new Date(iso);
            expect(todayKey(now), `${tz} @ ${iso}`).toBe(ymd(now));
          }
        });
      });
    });
  }

  it("reading the UTC-noon frame with LOCAL getters is what we are avoiding", () => {
    // Not a style preference. This pins the actual failure so nobody
    // "simplifies" keyOf back to local getters without the test going red.
    withZone("Pacific/Kiritimati", () => {
      const now = new Date("2026-08-02T11:00:00Z"); // 2026-08-03 01:00 local
      const frame = startOfDayLocal(now);
      expect(ymd(now)).toBe("2026-08-03"); // the reader's real day
      expect(keyOf(frame)).toBe("2026-08-03"); // what we store
      expect(ymd(frame)).toBe("2026-08-04"); // the bug: a day early
    });
  });

  it("keysEndingAt walks whole days without skipping or repeating", () => {
    const day = startOfDayLocal(new Date("2026-03-10T12:00:00Z"));
    const keys = keysEndingAt(day, 14);
    expect(keys).toHaveLength(14);
    expect(new Set(keys).size).toBe(14);
    expect(keys[13]).toBe(keyOf(day));
    expect(keys[0]).toBe("2026-02-25");
  });

  it("crosses a US spring-forward DST boundary without losing a day", () => {
    // 2026-03-08 is the US DST jump. `setDate` on a local Date can land on
    // the same wall-clock day twice here; stepping UTC dates cannot.
    withZone("America/New_York", () => {
      const day = startOfDayLocal(new Date("2026-03-10T15:00:00Z"));
      const keys = keysEndingAt(day, 5);
      expect(keys).toEqual([
        "2026-03-06",
        "2026-03-07",
        "2026-03-08",
        "2026-03-09",
        "2026-03-10",
      ]);
    });
  });
});
