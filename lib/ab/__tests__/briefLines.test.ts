import { describe, expect, it } from "vitest";

import type { AbRow } from "../bandit";
import { testLines, wordOf } from "../briefLines";
import type { AbTest } from "../tests";

/**
 * The weekly brief's line for each test (docs/plans/onboarding-2.0.md, section
 * 6: every running test says each week: wait, a version, or stop). Every row
 * below is made up for the test.
 */

const TEST: AbTest = {
  id: "day1-guided",
  surface: "onboarding",
  asks: "Does a guided first day keep more readers?",
  arms: ["plain", "guided"],
  share: 1,
  begins: "2026-01-05",
  ends: "2026-03-29",
  judge: "back_week2",
  guards: ["finished"],
  needs: 300,
  warmup: 100,
  floor: 0.1,
};
const LIT = { roads: true, plusIntro: true, plusOrder: true };

/** `shown` devices of an arm on a day, `back` of them reaching the judge. */
function devices(arm: string, shown: number, back: number, day = "2026-01-06"): AbRow[] {
  const rows: AbRow[] = [];
  for (let i = 0; i < shown; i++) {
    rows.push({ name: "ab_exposed", props: { test: TEST.id, arm, shown: day }, ts: `${day}T10:00:00Z` });
    rows.push({ name: "ab_reached", props: { test: TEST.id, arm, shown: day, what: "finished" }, ts: `${day}T10:01:00Z` });
    if (i < back) rows.push({ name: "ab_reached", props: { test: TEST.id, arm, shown: day, what: "back_week2" }, ts: `${day}T10:02:00Z` });
  }
  return rows;
}

describe("the one word", () => {
  it("names the version when a test has settled, and waits or stops otherwise", () => {
    expect(wordOf({ state: "settled", leader: "guided" })).toBe('"guided"');
    expect(wordOf({ state: "ended", leader: "guided" })).toBe("Stop");
    for (const state of ["waiting", "learning", "leaning", "held"] as const) expect(wordOf({ state, leader: "guided" })).toBe("Wait");
  });
});

describe("the brief's lines", () => {
  it("lists a running test with Wait while it has too few, and shows no small count", () => {
    const rows = [...devices("plain", 12, 3), ...devices("guided", 12, 4)];
    const lines = testLines([TEST], rows, { today: "2026-02-02", weekStart: "2026-01-26", lit: LIT });
    expect(lines).toHaveLength(1);
    expect(lines[0].word).toBe("Wait");
    expect(lines[0].needsHim).toBe(false);
    expect(lines[0].asks).toBe(TEST.asks);
    expect(lines[0].line).toMatch(/^Learning: too few yet/);
    expect(lines[0].progress).toBe("Its smallest version has fewer than 20 of the 300 devices it needs past their second week. Its last day is 29 March 2026.");
    expect(lines[0].progress).not.toMatch(/\b12\b/);
  });

  it("names the version once a test has settled, and marks it as his to act on", () => {
    const rows = [...devices("plain", 320, 64), ...devices("guided", 320, 160)];
    const [line] = testLines([TEST], rows, { today: "2026-02-02", weekStart: "2026-01-26", lit: LIT });
    expect(line.word).toBe('"guided"');
    expect(line.needsHim).toBe(true);
    expect(line.line).toMatch(/^Settled on "guided"/);
    expect(line.progress).toMatch(/^Its smallest version has 320 of the 300 devices/);
  });

  it("says Stop once, in the week a test ended unsettled, and nothing after", () => {
    const rows = [...devices("plain", 150, 30), ...devices("guided", 150, 33)];
    const inWeek = testLines([TEST], rows, { today: "2026-04-01", weekStart: "2026-03-25", lit: LIT });
    expect(inWeek).toHaveLength(1);
    expect(inWeek[0].word).toBe("Stop");
    expect(inWeek[0].needsHim).toBe(true);
    expect(inWeek[0].line).toMatch(/^Ended on its last day unsettled/);
    expect(inWeek[0].progress).toMatch(/Its last day was 29 March 2026\.$/);
    expect(testLines([TEST], rows, { today: "2026-04-08", weekStart: "2026-04-01", lit: LIT })).toEqual([]);
  });

  it("leaves out a test that has not begun, one whose gate is shut, and one nobody was shown", () => {
    const rows = devices("plain", 30, 5);
    expect(testLines([TEST], rows, { today: "2026-01-02", weekStart: "2025-12-26", lit: LIT })).toEqual([]);
    const gated: AbTest = { ...TEST, gate: "plusIntro" };
    expect(testLines([gated], rows, { today: "2026-02-02", weekStart: "2026-01-26", lit: { ...LIT, plusIntro: false } })).toEqual([]);
    expect(testLines([TEST], [], { today: "2026-04-01", weekStart: "2026-03-25", lit: LIT })).toEqual([]);
  });
});
