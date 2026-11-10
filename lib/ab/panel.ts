// What the admin sees of a test (1.9): its totals, its shares and where it
// stands, in plain words. Pure, so the small-cell rule is tested directly
// (lib/ab/__tests__/panel.test.ts).
//
// Every number is a total of rows that hold no reader. And none is shown
// while it is small: "three readers of the second version came back" is
// close to a description of three people, and is no finding either.

import { MATURE_DAYS, type ArmTally, type Verdict } from "./bandit";
import type { Milestone } from "./milestones";
import type { AbTest } from "./tests";

/** A count under this is not shown. */
export const SMALLEST_CELL = 20;

/** A milestone in the admin's words. */
export const MILESTONE_WORDS: Record<Milestone, string> = {
  finished: "finished the questions",
  account: "made an account",
  first_step: "opened their first step",
  back_week2: "came back in their second week",
  plus_bought: "bought Plus",
};
/** The same, as the thing a version can be behind on. */
const BEHIND_ON: Record<Milestone, string> = {
  finished: "finishing the questions",
  account: "accounts",
  first_step: "first steps opened",
  back_week2: "readers coming back",
  plus_bought: "Plus bought",
};

export type PanelCell = { n: number; rate: number | null } | null;

export type ArmPanel = {
  arm: string;
  /** Devices shown this version, or null while too few to show. */
  shown: number | null;
  /** Of them, those past their two weeks, or null while too few. */
  matured: number | null;
  /** The judge and each guard, of the matured: null while the count is too small. */
  judge: PanelCell;
  guards: { what: Milestone; words: string; cell: PanelCell }[];
  /** Today's share of new devices, 0 to 1. */
  weight: number;
};

export type TestPanel = {
  id: string;
  asks: string;
  judge: string;
  begins: string;
  ends: string;
  running: boolean;
  state: Verdict["state"] | "off";
  /** Where the test stands, in one sentence. */
  line: string;
  arms: ArmPanel[];
};

const shown = (n: number) => (n >= SMALLEST_CELL ? n : null);

function cell(hits: number, of: number): PanelCell {
  // The count and what it is of must both be large enough to show.
  if (hits < SMALLEST_CELL || of < SMALLEST_CELL) return null;
  return { n: hits, rate: hits / of };
}

function line(test: AbTest, v: Verdict, running: boolean, began: boolean): string {
  if (!running && !began) {
    return test.gate === "plusIntro"
      ? "Not running. Built and shut: it starts once you have seen the card and said yes, on the days set then."
      : "Not running. It starts when the revised onboarding is lit for readers, at release.";
  }
  switch (v.state) {
    case "waiting":
      return `Learning: too few yet. The shares stay equal until each version has ${test.warmup} devices past their second week.`;
    case "learning":
      return "Learning: the versions are close, and the shares are near equal.";
    case "leaning":
      return `Leaning to "${v.leader}". No version falls under ${Math.round(test.floor * 100)}% while the test runs.`;
    case "held": {
      const h = v.held[0];
      return `Held: "${h.arm}" is clearly behind on ${BEHIND_ON[h.guard]}, so it is not favoured, whatever it does for ${BEHIND_ON[test.judge]}.`;
    }
    case "settled":
      return `Settled on "${v.leader}". Every new device gets it. Making it permanent is your word.`;
    case "ended":
      return `Ended on its last day unsettled. New devices are back on "${test.arms[0]}", the version that was built.`;
  }
}

/** One test, as the admin reads it. `running` is whether it is open today; `today` YYYY-MM-DD. */
export function panelOf(test: AbTest, tallies: readonly ArmTally[], v: Verdict, running: boolean): TestPanel {
  const began = tallies.some((t) => t.shown > 0);
  return {
    id: test.id,
    asks: test.asks,
    judge: MILESTONE_WORDS[test.judge],
    begins: test.begins,
    ends: test.ends,
    running,
    state: !running && !began ? "off" : v.state,
    line: line(test, v, running, began),
    arms: test.arms.map((arm) => {
      const t = tallies.find((x) => x.arm === arm) ?? { arm, shown: 0, matured: 0, reached: {} };
      return {
        arm,
        shown: shown(t.shown),
        matured: shown(t.matured),
        judge: cell(t.reached[test.judge] ?? 0, t.matured),
        guards: test.guards.map((what) => ({ what, words: MILESTONE_WORDS[what], cell: cell(t.reached[what] ?? 0, t.matured) })),
        weight: v.weights[arm] ?? 0,
      };
    }),
  };
}

/** How long a device waits before it is read, for the panel's own note. */
export const WAIT_DAYS = MATURE_DAYS;
