import { describe, expect, it } from "vitest";

import {
  computeStreak,
  dayNumber,
  keyFromNumber,
  nextMilestone,
  standing,
  topMilestone,
  weekStrip,
} from "../compute";

const TODAY = "2026-10-20";
/** The key `n` days before TODAY. */
const ago = (n: number) => keyFromNumber(dayNumber(TODAY) - n);
/** Keys for every day from `from` days ago to `to` days ago, inclusive. */
const span = (from: number, to: number) => {
  const out: string[] = [];
  for (let n = from; n >= to; n--) out.push(ago(n));
  return out;
};

describe("computeStreak", () => {
  it("has nothing to say before the first kept day", () => {
    const r = computeStreak([], TODAY);
    expect(r).toMatchObject({ current: 0, best: 0, lastKept: null, keptToday: false, lastSave: null });
  });

  it("counts today", () => {
    expect(computeStreak([TODAY], TODAY)).toMatchObject({ current: 1, keptToday: true, best: 1 });
  });

  it("keeps a streak alive through today while yesterday was kept", () => {
    const r = computeStreak(span(4, 1), TODAY);
    expect(r).toMatchObject({ current: 4, keptToday: false, lastSave: null });
  });

  it("spends the starting save on one missed day, and says so", () => {
    // Kept 4 to 2 days ago, missed yesterday, today not yet kept.
    const r = computeStreak(span(4, 2), TODAY);
    expect(r.current).toBe(3);
    expect(r.lastSave).toBe(ago(1));
  });

  it("does not count the saved day: kept 3, missed 1, kept 1 is 4", () => {
    const r = computeStreak([...span(4, 2), TODAY], TODAY);
    expect(r.current).toBe(4);
    expect(r.keptToday).toBe(true);
    expect(r.lastSave).toBe(ago(1));
  });

  it("ends when the gap is wider than the saves", () => {
    // One save to start, two days missed.
    const r = computeStreak(span(5, 3), TODAY);
    expect(r.current).toBe(0);
    expect(r.best).toBe(3);
    expect(r.lastSave).toBeNull();
  });

  it("starts again at 1 after an ended streak", () => {
    const r = computeStreak([...span(9, 7), TODAY], TODAY);
    expect(r.current).toBe(1);
    expect(r.best).toBe(3);
  });

  it("earns a save for every seven days kept in a row", () => {
    // Seven kept (1 + 1 = 2 saves), then two missed days, today pending.
    const r = computeStreak(span(9, 3), TODAY);
    expect(r.current).toBe(7);
    expect(r.saves).toBe(2);
    expect(r.lastSave).toBe(ago(1));
  });

  it("holds at three saves however long the streak", () => {
    const r = computeStreak(span(40, 0), TODAY);
    expect(r.current).toBe(41);
    expect(r.saves).toBe(3);
  });

  it("spends nothing on a gap it cannot save", () => {
    // Seven kept earns a second save; four missed is too wide, so both stay;
    // then a new run of two, then two missed days the two saves cover.
    const days = [...span(20, 14), ...span(9, 8)];
    days.push(ago(5));
    const r = computeStreak(days, ago(4));
    // From ago(8) to ago(5): two missed (ago 7, 6), both saves spent.
    expect(r.current).toBe(3);
    expect(r.saves).toBe(0);
  });

  it("marks the day each streak badge was first reached", () => {
    const r = computeStreak(span(45, 0), TODAY);
    expect(r.milestones[7]).toBe(ago(39));
    expect(r.milestones[40]).toBe(ago(6));
    expect(r.milestones[100]).toBeUndefined();
  });

  it("ignores days after today and malformed keys", () => {
    const r = computeStreak([TODAY, ago(-1), ago(-5), "2026-13-45", "yesterday"], TODAY);
    expect(r.current).toBe(1);
    expect(r.lastKept).toBe(TODAY);
  });

  it("treats duplicates as one day", () => {
    expect(computeStreak([TODAY, TODAY, ago(1), ago(1)], TODAY).current).toBe(2);
  });
});

describe("standing", () => {
  it("agrees with computeStreak on any later day, from the stored numbers alone", () => {
    const histories = [
      span(4, 1),
      span(4, 2),
      span(5, 3),
      span(9, 3),
      [...span(20, 14), ...span(9, 8), ago(5)],
      span(40, 0),
    ];
    for (const days of histories) {
      const stored = computeStreak(days, TODAY);
      for (let later = 0; later <= 6; later++) {
        const day = keyFromNumber(dayNumber(TODAY) + later);
        expect(standing({ run: stored.run, saves: stored.saves, lastKept: stored.lastKept }, day)).toBe(
          computeStreak(days, day).current,
        );
      }
    }
  });

  it("is 0 with nothing kept", () => {
    expect(standing({ run: 0, saves: 1, lastKept: null }, TODAY)).toBe(0);
  });
});

describe("milestones", () => {
  it("names the highest reached", () => {
    expect(topMilestone(6)).toBeNull();
    expect(topMilestone(7)).toBe(7);
    expect(topMilestone(99)).toBe(40);
    expect(topMilestone(250)).toBe(100);
  });

  it("names the next one and the days left", () => {
    expect(nextMilestone(0)).toEqual({ at: 7, left: 7 });
    expect(nextMilestone(7)).toEqual({ at: 40, left: 33 });
    expect(nextMilestone(100)).toBeNull();
  });
});

describe("weekStrip", () => {
  it("draws kept, saved, missed and today", () => {
    // Kept 6 to 3 days ago and 1 day ago; the starting save covers 2 days
    // ago; today is not kept yet.
    const strip = weekStrip([...span(6, 3), ago(1)], TODAY);
    expect(strip.map((d) => d.state)).toEqual(["kept", "kept", "kept", "kept", "saved", "kept", "today"]);
    expect(strip[6].date).toBe(TODAY);
  });

  it("shows a missed day the saves could not cover", () => {
    const strip = weekStrip([ago(6), ago(3)], TODAY);
    expect(strip.map((d) => d.state)).toEqual(["kept", "missed", "missed", "kept", "missed", "missed", "today"]);
  });
});
