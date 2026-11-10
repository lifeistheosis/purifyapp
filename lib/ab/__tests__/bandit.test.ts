import { describe, expect, it } from "vitest";

import { BEHIND, MATURE_DAYS, SURE, chanceBehind, chanceBest, daysBefore, shares, tally, verdict, type AbRow, type ArmTally } from "../bandit";
import { LAST_DAY, SECOND_WEEK, inWindow } from "../milestones";
import { readersPerArm } from "../size";
import { ACCOUNT_PLACE, type AbTest } from "../tests";

// How a test learns (1.9): the shares, the guardrails, and when it settles
// (docs/1.9-build/notes/onboarding-fable.md, section 10).

const test: AbTest = { ...ACCOUNT_PLACE, begins: "2026-12-01", ends: "2027-02-23" };
const arm = (name: string, matured: number, back: number, o: Partial<Record<"finished" | "account" | "plus_bought", number>> = {}): ArmTally => ({
  arm: name,
  shown: matured + 50,
  matured,
  reached: {
    back_week2: back,
    finished: o.finished ?? Math.round(matured * 0.7),
    account: o.account ?? Math.round(matured * 0.2),
    plus_bought: o.plus_bought ?? Math.round(matured * 0.02),
  },
});
const today = "2027-01-15";
const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);

describe("the chance a version is the best", () => {
  it("is even when nothing is known, or the counts are the same", () => {
    const [a, b] = chanceBest([{ hits: 0, of: 0 }, { hits: 0, of: 0 }]);
    expect(a).toBeCloseTo(0.5, 3);
    expect(b).toBeCloseTo(0.5, 3);
    const same = chanceBest([{ hits: 40, of: 200 }, { hits: 40, of: 200 }]);
    expect(same[0]).toBeCloseTo(0.5, 3);
  });

  it("follows the counts, and is surer the more there are", () => {
    const few = chanceBest([{ hits: 4, of: 20 }, { hits: 6, of: 20 }]);
    const many = chanceBest([{ hits: 200, of: 1000 }, { hits: 300, of: 1000 }]);
    expect(few[1]).toBeGreaterThan(0.5);
    expect(few[1]).toBeLessThan(0.9);
    expect(many[1]).toBeGreaterThan(0.999);
    expect(few[0] + few[1]).toBeCloseTo(1, 6);
  });

  it("matches a known value: 20 of 100 against 30 of 100", () => {
    // P(Beta(31,71) > Beta(21,81)), by simulation elsewhere: about 0.948.
    const [, b] = chanceBest([{ hits: 20, of: 100 }, { hits: 30, of: 100 }]);
    expect(b).toBeGreaterThan(0.94);
    expect(b).toBeLessThan(0.956);
  });

  it("shares the chance among three", () => {
    const p = chanceBest([{ hits: 20, of: 100 }, { hits: 20, of: 100 }, { hits: 20, of: 100 }]);
    for (const x of p) expect(x).toBeCloseTo(1 / 3, 2);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
});

describe("the chance a version is clearly behind", () => {
  it("is small for equal counts, and near certain for a rate half the other's on many readers", () => {
    expect(chanceBehind({ hits: 140, of: 200 }, { hits: 140, of: 200 })).toBeLessThan(0.01);
    expect(chanceBehind({ hits: 70, of: 400 }, { hits: 140, of: 400 })).toBeGreaterThan(SURE);
  });

  it("is not reached by a small gap: a fifth behind is the line", () => {
    // 63% against 70% is a tenth behind: worse, and not clearly so.
    expect(chanceBehind({ hits: 630, of: 1000 }, { hits: 700, of: 1000 })).toBeLessThan(0.05);
    // 50% against 70% is well past a fifth.
    expect(chanceBehind({ hits: 500, of: 1000 }, { hits: 700, of: 1000 })).toBeGreaterThan(SURE);
    expect(BEHIND).toBe(0.2);
  });
});

describe("shares within limits", () => {
  it("follow what is wanted, none under the floor", () => {
    expect(shares([0.5, 0.5], 0.2, [1, 1])).toEqual([0.5, 0.5]);
    const [a, b] = shares([0.97, 0.03], 0.2, [1, 1]);
    expect(b).toBeCloseTo(0.2, 9);
    expect(a).toBeCloseTo(0.8, 9);
    const three = shares([0.9, 0.08, 0.02], 0.2, [1, 1, 1]);
    expect(three.map((x) => +x.toFixed(6))).toEqual([0.6, 0.2, 0.2]);
  });

  it("never give a capped version more than its cap", () => {
    const [a, b] = shares([0.9, 0.1], 0.2, [0.5, 1]);
    expect(a).toBeCloseTo(0.5, 9);
    expect(b).toBeCloseTo(0.5, 9);
  });

  it("always sum to one", () => {
    for (const want of [[0.5, 0.5], [0.99, 0.01], [0.7, 0.2, 0.1], [0.25, 0.25, 0.25, 0.25], [1, 0, 0]]) {
      const w = shares(want, 0.2, want.map(() => 1));
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
      for (const x of w) expect(x).toBeGreaterThanOrEqual(Math.min(0.2, 1 / want.length) - 1e-9);
    }
  });
});

describe("what a test's totals say", () => {
  it("is equal shares, and nothing more, until every version has its warmup", () => {
    const v = verdict(test, [arm("card", 199, 60), arm("end", 400, 40)], today);
    expect(v).toEqual({ state: "waiting", weights: { card: 0.5, end: 0.5 }, leader: null, best: null, held: [] });
    // No rows at all yet.
    expect(verdict(test, [], today).state).toBe("waiting");
  });

  it("moves the shares toward the version more likely to be better", () => {
    const v = verdict(test, [arm("card", 300, 78), arm("end", 300, 60)], today);
    expect(v.leader).toBe("card");
    expect(v.weights.card).toBeGreaterThan(0.6);
    expect(v.weights.end).toBeGreaterThanOrEqual(0.2 - 1e-9);
    expect(sum(v.weights)).toBeCloseTo(1, 9);
    expect(v.state).toBe("leaning");
    expect(v.held).toEqual([]);
  });

  it("stays near equal while the counts say little", () => {
    const v = verdict(test, [arm("card", 250, 50), arm("end", 250, 51)], today);
    expect(v.state).toBe("learning");
    expect(Math.abs(v.weights.card - 0.5)).toBeLessThan(0.05);
  });

  it("never lets a version fall under the floor, however far behind", () => {
    const v = verdict(test, [arm("card", 600, 180), arm("end", 600, 60)], today);
    expect(v.weights.end).toBeCloseTo(0.2, 9);
    expect(v.weights.card).toBeCloseTo(0.8, 9);
    // Far ahead, and not settled: neither has the readers the test said it needs.
    expect(v.state).toBe("leaning");
  });

  it("holds a version that is clearly behind on a count that must not get worse, and never favours it", () => {
    // "end" brings more readers back, and half as many finish the questions.
    const v = verdict(test, [arm("card", 500, 100, { finished: 350 }), arm("end", 500, 140, { finished: 170 })], today);
    expect(v.leader).toBe("end");
    expect(v.held).toEqual([{ arm: "end", guard: "finished" }]);
    expect(v.weights.end).toBeLessThanOrEqual(0.5 + 1e-9);
    expect(v.state).toBe("held");
    // And it cannot settle on it, with any number of readers.
    const many = verdict(test, [arm("card", 3000, 600, { finished: 2100 }), arm("end", 3000, 840, { finished: 1000 })], today);
    expect(many.state).toBe("held");
    expect(many.weights.end).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it("settles when each version has its readers, one is ahead 19 chances in 20, and nothing holds it", () => {
    const v = verdict(test, [arm("card", 1100, 275), arm("end", 1100, 220)], today);
    expect(v.best!.card).toBeGreaterThanOrEqual(SURE);
    expect(v.state).toBe("settled");
    expect(v.weights).toEqual({ card: 1, end: 0 });
    // One short of its readers: still learning, the floor still kept.
    const short = verdict(test, [arm("card", 1099, 275), arm("end", 1100, 220)], today);
    expect(short.state).toBe("leaning");
    expect(short.weights.end).toBeCloseTo(0.2, 9);
  });

  it("does not settle on a difference the counts do not carry", () => {
    const v = verdict(test, [arm("card", 1500, 315), arm("end", 1500, 300)], today);
    expect(v.best!.card).toBeLessThan(SURE);
    expect(v.state).not.toBe("settled");
  });

  it("goes back to the version that was built when its last day passes unsettled", () => {
    const after = "2027-03-01";
    const v = verdict(test, [arm("card", 400, 80), arm("end", 400, 90)], after);
    expect(v.state).toBe("ended");
    expect(v.weights).toEqual({ card: 1, end: 0 });
    // Too few to say anything at all: the same.
    expect(verdict(test, [arm("card", 50, 10), arm("end", 50, 12)], after).weights).toEqual({ card: 1, end: 0 });
    // Settled stays settled past the last day, on the version that won.
    const won = verdict(test, [arm("card", 1100, 220), arm("end", 1100, 275)], after);
    expect(won.state).toBe("settled");
    expect(won.weights).toEqual({ card: 0, end: 1 });
  });

  it("gives the same shares for the same counts, every time", () => {
    const t = [arm("card", 317, 71), arm("end", 322, 64)];
    expect(verdict(test, t, today)).toEqual(verdict(test, t, today));
  });
});

describe("a test's totals, from its rows", () => {
  const row = (name: string, day: string, props: Record<string, unknown>): AbRow => ({ name, props: { test: test.id, ...props }, ts: `${day}T00:00:00+00:00` });
  const ripe = daysBefore(today, MATURE_DAYS);

  it("reads only the devices whose two weeks are behind them", () => {
    const rows = [
      row("ab_exposed", "2026-12-05", { arm: "card" }),
      row("ab_exposed", ripe, { arm: "card" }),
      row("ab_exposed", daysBefore(today, MATURE_DAYS - 1), { arm: "card" }),
      row("ab_exposed", today, { arm: "end" }),
      // A reached row is kept under the day its device was shown.
      row("ab_reached", "2026-12-05", { arm: "card", what: "back_week2" }),
      row("ab_reached", "2026-12-05", { arm: "card", what: "finished" }),
      row("ab_reached", daysBefore(today, 3), { arm: "card", what: "finished" }),
    ];
    const [card, end] = tally(test, rows, today);
    expect(card).toEqual({ arm: "card", shown: 3, matured: 2, reached: { back_week2: 1, finished: 1 } });
    expect(end).toEqual({ arm: "end", shown: 1, matured: 0, reached: {} });
  });

  it("reads only its own test, its own versions, and rows since its first day", () => {
    const rows = [
      row("ab_exposed", "2026-12-05", { arm: "card", test: "another" }),
      row("ab_exposed", "2026-12-05", { arm: "middle" }),
      row("ab_exposed", "2026-11-20", { arm: "card" }),
      row("onboarding_finished", "2026-12-05", { arm: "card" }),
    ];
    expect(tally(test, rows, today).map((t) => t.shown)).toEqual([0, 0]);
  });

  it("counts days back", () => {
    expect(daysBefore("2027-01-15", 14)).toBe("2027-01-01");
    expect(daysBefore("2027-01-01", 1)).toBe("2026-12-31");
  });
});

describe("a milestone's two weeks", () => {
  it("is from the day shown to the thirteenth after it, and coming back is the second week of them", () => {
    expect(inWindow("finished", 0)).toBe(true);
    expect(inWindow("plus_bought", LAST_DAY)).toBe(true);
    expect(inWindow("account", LAST_DAY + 1)).toBe(false);
    expect(inWindow("finished", -1)).toBe(false);
    expect(inWindow("back_week2", SECOND_WEEK - 1)).toBe(false);
    expect(inWindow("back_week2", SECOND_WEEK)).toBe(true);
    expect(inWindow("back_week2", LAST_DAY)).toBe(true);
    expect(inWindow("back_week2", LAST_DAY + 1)).toBe(false);
    // Nothing is read of a device until every day it could send on is behind it.
    expect(MATURE_DAYS).toBe(LAST_DAY + 1);
  });
});

describe("how many readers a test needs", () => {
  it("is about a thousand a version to see coming back move from 20% to 25%", () => {
    expect(readersPerArm(0.2, 0.25)).toBeGreaterThan(1050);
    expect(readersPerArm(0.2, 0.25)).toBeLessThan(1150);
    expect(ACCOUNT_PLACE.needs).toBeGreaterThanOrEqual(readersPerArm(0.2, 0.25));
  });

  it("is far more for a small difference, and for a rare outcome", () => {
    expect(readersPerArm(0.2, 0.23)).toBeGreaterThan(2800);
    expect(readersPerArm(0.02, 0.03)).toBeGreaterThan(3700);
    expect(readersPerArm(0.6, 0.7)).toBeLessThan(400);
  });

  it("has no answer for no difference", () => {
    expect(readersPerArm(0.2, 0.2)).toBe(Infinity);
    expect(readersPerArm(0, 0.2)).toBe(Infinity);
  });
});
