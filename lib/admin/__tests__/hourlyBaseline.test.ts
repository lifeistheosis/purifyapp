import { describe, expect, it } from "vitest";

import {
  BASELINE_WEEKS,
  DEFAULT_STRETCH,
  MIN_SAMPLES,
  autoTarget,
  baselineFor,
  median,
  sampleSlots,
  type HourSample,
} from "../hourlyBaseline";

const s = (weekday: number, hour: number, value: number): HourSample => ({
  weekday,
  hour,
  value,
});

describe("median", () => {
  it("takes the middle of an odd count", () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it("averages the two middle values of an even count", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("has no answer for nothing", () => {
    expect(median([])).toBeNull();
  });

  it("does not mutate the caller's array", () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe("baselineFor", () => {
  it("prefers the same weekday and hour", () => {
    // The whole point: Tuesday 14:00 is compared against other Tuesdays at
    // 14:00, not against the week in general.
    const samples = [
      s(2, 14, 10),
      s(2, 14, 12),
      s(2, 14, 14),
      s(5, 14, 90), // a Friday, deliberately huge
    ];
    const b = baselineFor(samples, 2, 14);
    expect(b.basis).toBe("weekday-hour");
    expect(b.value).toBe(12);
  });

  it("ignores a spike rather than chasing it", () => {
    // One post going around drags a mean up enough that every later week
    // looks like a failure. The median keeps describing the ordinary week.
    const samples = [s(2, 14, 10), s(2, 14, 11), s(2, 14, 12), s(2, 14, 400)];
    const b = baselineFor(samples, 2, 14);
    expect(b.value).toBe(11.5);
    const mean = (10 + 11 + 12 + 400) / 4;
    expect(b.value!).toBeLessThan(mean / 3);
  });

  it("widens to the same hour on any day when the weekday is thin", () => {
    const samples = [s(2, 14, 10), s(3, 14, 20), s(4, 14, 30)];
    const b = baselineFor(samples, 2, 14);
    expect(b.basis).toBe("hour-any-day");
    expect(b.value).toBe(20);
  });

  it("never widens to a different hour", () => {
    // Falling back to "any hour" would compare 3am against the evening peak,
    // which is wrong in the most misleading direction available.
    const samples = [s(2, 20, 500), s(3, 20, 480), s(4, 20, 520)];
    const b = baselineFor(samples, 2, 3);
    expect(b.basis).toBe("none");
    expect(b.value).toBeNull();
  });

  it("says it does not know rather than guessing", () => {
    expect(baselineFor([s(2, 14, 10)], 2, 14).value).toBeNull();
    expect(baselineFor([], 2, 14).basis).toBe("none");
  });

  it("needs exactly MIN_SAMPLES to commit", () => {
    const one = Array.from({ length: MIN_SAMPLES - 1 }, () => s(2, 14, 10));
    const enough = Array.from({ length: MIN_SAMPLES }, () => s(2, 14, 10));
    expect(baselineFor(one, 2, 14).basis).not.toBe("weekday-hour");
    expect(baselineFor(enough, 2, 14).basis).toBe("weekday-hour");
  });
});

describe("autoTarget", () => {
  it("asks for more than typical", () => {
    const b = baselineFor([s(2, 14, 20), s(2, 14, 20), s(2, 14, 20)], 2, 14);
    const t = autoTarget(b);
    expect(t.target).toBe(22);
    expect(t.explanation).toContain("Typically 20");
  });

  it("never sets a target that is met by doing exactly as badly as usual", () => {
    // THE FLOOR. A stretch of 1.1 on a typical value of 1 rounds back to 1, so
    // the quiet hours would set goals met by changing nothing.
    const b = baselineFor([s(2, 3, 1), s(2, 3, 1), s(2, 3, 1)], 2, 3);
    const t = autoTarget(b);
    expect(t.target).toBeGreaterThan(1);
  });

  it("scales with the stretch", () => {
    const b = baselineFor([s(2, 14, 100), s(2, 14, 100)], 2, 14);
    expect(autoTarget(b, 1.5).target).toBe(150);
    expect(autoTarget(b, 1.1).target).toBe(110);
  });

  it("refuses a stretch below 1, which would be a target under typical", () => {
    const b = baselineFor([s(2, 14, 100), s(2, 14, 100)], 2, 14);
    expect(autoTarget(b, 0.5).target).toBeGreaterThanOrEqual(100);
  });

  it("returns no target, and says why, when the baseline is unknown", () => {
    const none = autoTarget(baselineFor([], 2, 14));
    expect(none.target).toBeNull();
    expect(none.explanation).toMatch(/no history/i);

    const thin = autoTarget(baselineFor([s(2, 14, 5)], 2, 14));
    expect(thin.target).toBeNull();
    expect(thin.explanation).toMatch(/not enough/i);
  });

  it("skips the count floor for money", () => {
    // A one-cent floor is meaningless; the ceiling is stretch enough at that
    // resolution.
    const b = baselineFor([s(2, 14, 100), s(2, 14, 100)], 2, 14);
    expect(autoTarget(b, 1.0, { isMoney: true }).target).toBe(100);
  });

  it("explains which basis it used", () => {
    const weekday = autoTarget(baselineFor([s(2, 14, 10), s(2, 14, 10)], 2, 14));
    expect(weekday.explanation).toContain("this weekday");
    const anyDay = autoTarget(baselineFor([s(1, 14, 10), s(3, 14, 10)], 2, 14));
    expect(anyDay.explanation).toContain("across the last");
  });
});

describe("sampleSlots", () => {
  const at = new Date("2026-09-01T14:00:00Z"); // a Tuesday

  it("returns one slot per week back", () => {
    expect(sampleSlots(at)).toHaveLength(BASELINE_WEEKS);
  });

  it("lands on the same weekday and hour every time", () => {
    for (const slot of sampleSlots(at)) {
      expect(slot.start.getUTCDay()).toBe(at.getUTCDay());
      expect(slot.start.getUTCHours()).toBe(14);
    }
  });

  it("excludes the hour being targeted", () => {
    // Including it would compare an hour against itself and guarantee the
    // goal is met.
    for (const slot of sampleSlots(at)) {
      expect(slot.start.getTime()).toBeLessThan(at.getTime());
    }
  });

  it("covers exactly one hour each", () => {
    for (const slot of sampleSlots(at)) {
      expect(slot.end.getTime() - slot.start.getTime()).toBe(3_600_000);
    }
  });

  it("uses a sane default stretch", () => {
    expect(DEFAULT_STRETCH).toBeGreaterThan(1);
    expect(DEFAULT_STRETCH).toBeLessThan(1.35);
  });
});
