import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { KATHISMATA, READING_PLANS, dayLabel, getPlan } from "../plans";
import { catchUp, nextDay, planStreak, type PlansState } from "../progress";

describe("the reading plans", () => {
  it("divide the Psalter into its twenty kathismata, 1 to 150, with nothing missed or doubled", () => {
    expect(KATHISMATA).toHaveLength(20);
    let expected = 1;
    for (const [from, to] of KATHISMATA) {
      expect(from).toBe(expected);
      expected = to + 1;
    }
    expect(expected).toBe(151);
    // Psalm 118 is a kathisma of its own (the seventeenth).
    expect(KATHISMATA[16]).toEqual([118, 118]);
  });

  it("read the four Gospels a chapter a day and Proverbs in a month", () => {
    expect(getPlan("gospels")?.days).toHaveLength(28 + 16 + 24 + 21);
    // John in 21 days (1.9): the Gospel of John, a chapter a day.
    expect(getPlan("john")?.days).toEqual(Array.from({ length: 21 }, (_, i) => [{ book: "john", chapter: i + 1 }]));
    expect(getPlan("proverbs")?.days).toHaveLength(31);
    expect(getPlan("psalter")?.days).toHaveLength(20);
  });

  it("only ever point at chapters the Bible has", () => {
    for (const plan of READING_PLANS) {
      for (const day of plan.days) {
        for (const r of day) {
          const file = path.join(process.cwd(), "data", "bible", r.book, `${r.chapter}.json`);
          expect(existsSync(file), `${plan.id}: ${r.book} ${r.chapter}`).toBe(true);
        }
      }
    }
  });

  it("name a day as one reference per book, with an en dash for a span", () => {
    const name = (s: string) => ({ psalms: "Psalms", matthew: "Matthew" })[s] ?? s;
    expect(dayLabel(getPlan("psalter")!.days[6], name)).toBe("Psalms 46–54");
    expect(dayLabel(getPlan("psalter")!.days[16], name)).toBe("Psalms 118");
    expect(dayLabel(getPlan("gospels")!.days[4], name)).toBe("Matthew 5");
  });
});

describe("progress and the streak", () => {
  it("goes on from the first day not yet read", () => {
    const plan = getPlan("proverbs")!;
    expect(nextDay(plan, undefined)).toBe(0);
    expect(nextDay(plan, { startedOn: "2026-09-01", done: { "0": "2026-09-01", "1": "2026-09-02" } })).toBe(2);
    const all = Object.fromEntries(plan.days.map((_, i) => [String(i), "2026-09-01"]));
    expect(nextDay(plan, { startedOn: "2026-09-01", done: all })).toBeNull();
  });

  it("counts days in a row, ending today or yesterday, across every plan", () => {
    const state: PlansState = {
      psalter: { startedOn: "2026-09-26", done: { "0": "2026-09-27", "1": "2026-09-28" } },
      gospels: { startedOn: "2026-09-29", done: { "0": "2026-09-29" } },
    };
    expect(planStreak(state, "2026-09-29")).toBe(3);
    expect(planStreak(state, "2026-09-30")).toBe(3);
    expect(planStreak(state, "2026-10-01")).toBe(0);
    expect(planStreak({}, "2026-09-30")).toBe(0);
  });
});

describe("John in 21 days (1.9)", () => {
  it("says around each day exactly what the Gospels plan says on that chapter of John", async () => {
    const guide = (await import("@/data/plans/guide/en.json")).default as Record<string, { pool: string[]; days: unknown[] }>;
    const cites = (await import("@/data/plans/guide/cites.json")).default as Record<string, Record<string, unknown>>;
    const sayings = (await import("@/data/plans/sayings.json")).default as Record<string, Record<string, unknown>>;
    const FIRST = 69; // John 1 in the Gospels plan: Matthew 28, Mark 16 and Luke 24 days before it
    expect(getPlan("gospels")?.days[FIRST - 1]).toEqual([{ book: "john", chapter: 1 }]);
    expect(guide.john.pool).toEqual(guide.gospels.pool);
    expect(guide.john.days).toEqual(guide.gospels.days.slice(FIRST - 1, FIRST - 1 + 21));
    for (let day = 1; day <= 21; day++) {
      expect(cites.john?.[String(day)], `cites, day ${day}`).toEqual(cites.gospels[String(FIRST + day - 1)]);
      expect(sayings.john?.[String(day)], `saying, day ${day}`).toEqual(sayings.gospels[String(FIRST + day - 1)]);
    }
  });
});

describe("a missed day (1.9, s4-05)", () => {
  const read = (...days: string[]): PlansState => ({
    gospels: { startedOn: days[0], done: Object.fromEntries(days.map((d, i) => [String(i), d])) },
  });

  it("is caught up by reading an extra day after it, and the days in a row go on", () => {
    // Mon read, Tue missed, Wed two days read.
    expect(planStreak(read("2026-11-02", "2026-11-04", "2026-11-04"), "2026-11-04")).toBe(3);
    // Two missed, three read the day after.
    expect(planStreak(read("2026-11-02", "2026-11-05", "2026-11-05", "2026-11-05"), "2026-11-05")).toBe(4);
  });

  it("breaks as before when it is not caught up", () => {
    expect(planStreak(read("2026-11-02", "2026-11-04"), "2026-11-04")).toBe(1);
    // Two missed, only two read after: one short.
    expect(planStreak(read("2026-11-02", "2026-11-05", "2026-11-05"), "2026-11-05")).toBe(1);
  });

  it("never counts days before the reader began", () => {
    expect(planStreak(read("2026-11-04", "2026-11-04", "2026-11-04"), "2026-11-04")).toBe(1);
  });

  it("is offered to catch up the day after, with the days in a row it keeps", () => {
    const state = read("2026-11-02", "2026-11-03");
    // Wednesday missed; on Thursday, nothing read yet.
    expect(planStreak(state, "2026-11-05")).toBe(0);
    expect(catchUp(state, "2026-11-05")).toBe(4);
    // One read on Thursday: still offered.
    expect(catchUp(read("2026-11-02", "2026-11-03", "2026-11-05"), "2026-11-05")).toBe(4);
    // Caught up: no offer, and the days in a row are there.
    const caught = read("2026-11-02", "2026-11-03", "2026-11-05", "2026-11-05");
    expect(catchUp(caught, "2026-11-05")).toBeNull();
    expect(planStreak(caught, "2026-11-05")).toBe(4);
  });

  it("offers nothing when yesterday was read, or nothing was read before it", () => {
    expect(catchUp(read("2026-11-04"), "2026-11-05")).toBeNull();
    expect(catchUp(read("2026-11-01"), "2026-11-05")).toBeNull();
    expect(catchUp({}, "2026-11-05")).toBeNull();
  });
});
