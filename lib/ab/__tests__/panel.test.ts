import { describe, expect, it } from "vitest";

import { verdict, type ArmTally } from "../bandit";
import { SMALLEST_CELL, panelOf } from "../panel";
import { ACCOUNT_PLACE, type AbTest } from "../tests";

// What the admin sees of a test (1.9), and the rule that nothing small is shown.

const test: AbTest = { ...ACCOUNT_PLACE, begins: "2026-12-01", ends: "2027-02-23" };
const today = "2027-01-15";
const arm = (name: string, shown: number, matured: number, back: number, finished: number, account: number, plus: number): ArmTally => ({
  arm: name,
  shown,
  matured,
  reached: { back_week2: back, finished, account, plus_bought: plus },
});
const panel = (tallies: ArmTally[], running = true, day = today) => panelOf(test, tallies, verdict(test, tallies, day), running);

describe("a test, as the admin reads it", () => {
  it("says it is not running before release, and shows nothing", () => {
    const p = panel([], false);
    expect(p.state).toBe("off");
    expect(p.line).toBe("Not running. It starts when the revised onboarding is lit for readers, at release.");
    for (const a of p.arms) {
      expect(a).toMatchObject({ shown: null, matured: null, judge: null, weight: 0.5 });
      expect(a.guards.every((g) => g.cell === null)).toBe(true);
    }
  });

  it("gives each version its totals, the judge and the guards as counts and rates, and today's share", () => {
    const p = panel([arm("card", 400, 300, 78, 210, 45, 6), arm("end", 410, 300, 60, 200, 50, 5)]);
    const [card, end] = p.arms;
    expect(card).toMatchObject({ arm: "card", shown: 400, matured: 300, judge: { n: 78, rate: 0.26 } });
    expect(card.guards.map((g) => [g.what, g.cell?.n ?? null])).toEqual([
      ["finished", 210],
      ["account", 45],
      // Six subscriptions is a count too small to show.
      ["plus_bought", null],
    ]);
    expect(end.judge).toEqual({ n: 60, rate: 0.2 });
    expect(card.weight + end.weight).toBeCloseTo(1, 9);
    expect(card.weight).toBeGreaterThan(end.weight);
    expect(p.line).toBe('Leaning to "card". No version falls under 20% while the test runs.');
    expect(p.judge).toBe("came back in their second week");
  });

  it("never shows a count under twenty, or a rate built on one", () => {
    const p = panel([arm("card", SMALLEST_CELL - 1, 12, 3, 9, 2, 0), arm("end", 25, SMALLEST_CELL, SMALLEST_CELL - 1, SMALLEST_CELL, 4, 1)]);
    expect(p.arms[0]).toMatchObject({ shown: null, matured: null, judge: null });
    expect(p.arms[1]).toMatchObject({ shown: 25, matured: SMALLEST_CELL, judge: null });
    expect(p.arms[1].guards[0].cell).toEqual({ n: SMALLEST_CELL, rate: 1 });
    expect(p.arms[1].guards[1].cell).toBeNull();
    expect(JSON.stringify(p.arms)).not.toMatch(/"n":(\d|1\d)[,}]/);
  });

  it("says in one sentence where the test stands", () => {
    expect(panel([arm("card", 150, 100, 20, 70, 20, 2), arm("end", 150, 100, 22, 70, 20, 2)]).line).toBe(
      "Learning: too few yet. The shares stay equal until each version has 200 devices past their second week.",
    );
    expect(panel([arm("card", 300, 250, 50, 175, 50, 5), arm("end", 300, 250, 51, 175, 50, 5)]).line).toBe(
      "Learning: the versions are close, and the shares are near equal.",
    );
    expect(panel([arm("card", 600, 500, 100, 350, 100, 10), arm("end", 600, 500, 140, 170, 100, 10)]).line).toBe(
      'Held: "end" is clearly behind on finishing the questions, so it is not favoured, whatever it does for readers coming back.',
    );
    expect(panel([arm("card", 1300, 1100, 275, 770, 220, 22), arm("end", 1300, 1100, 220, 770, 220, 22)]).line).toBe(
      'Settled on "card". Every new device gets it. Making it permanent is your word.',
    );
    // The trade this test was built to show him: fewer accounts from the card, and the system says so.
    expect(panel([arm("card", 700, 600, 170, 420, 60, 10), arm("end", 700, 600, 120, 400, 150, 10)]).line).toBe(
      'Held: "card" is clearly behind on accounts, so it is not favoured, whatever it does for readers coming back.',
    );
    expect(panel([arm("card", 500, 400, 80, 280, 80, 8), arm("end", 500, 400, 90, 280, 80, 8)], false, "2027-03-01").line).toBe(
      'Ended on its last day unsettled. New devices are back on "card", the version that was built.',
    );
  });
});
