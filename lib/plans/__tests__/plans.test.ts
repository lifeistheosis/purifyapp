import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { KATHISMATA, READING_PLANS, dayLabel, getPlan } from "../plans";
import { nextDay, planStreak, type PlansState } from "../progress";

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
