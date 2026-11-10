// A test's counts, summed for the admin (1.9;
// docs/1.9-build/notes/onboarding-fable.md, 4.2). Pure, so the sums and the
// small-cell rule are tested directly (lib/ab/__tests__/summary.test.ts).
//
// Every number is a total of rows that hold no reader: an exposure
// (`ab_exposed`, once a device, when the screen that differs was really
// shown) and the outcome rows that carry the test's word.

import { abWord, type AbTest } from "./tests";

/**
 * A cell smaller than this is not shown. "Three readers in arm B came back"
 * is close to a description of three people, and is no finding either.
 */
export const SMALLEST_CELL = 20;

export type AbRow = { name: string; props: Record<string, unknown> };

export type ArmSummary = {
  arm: string;
  /** Devices shown this version, or null while the cell is too small to show. */
  exposed: number | null;
  /** Of them, how many reached the outcome; null while either cell is too small. */
  reached: number | null;
  /** reached / exposed, or null. */
  rate: number | null;
  /** Whether the arm has the readers the test said it needs. */
  enough: boolean;
};

/**
 * One test, arm by arm. `isOutcome` says which rows are the outcome the
 * test is judged by (a finish, a return on day 7), since the registry names
 * it in words for the owner and the caller knows the event.
 */
export function summarizeTest(test: AbTest, rows: readonly AbRow[], isOutcome: (row: AbRow) => boolean): ArmSummary[] {
  return test.arms.map((arm) => {
    const word = abWord(test, arm);
    let exposed = 0;
    let reached = 0;
    for (const row of rows) {
      if (row.name === "ab_exposed") {
        if (row.props.test === test.id && row.props.arm === arm) exposed++;
      } else if (row.props.ab === word && isOutcome(row)) reached++;
    }
    const shown = exposed >= SMALLEST_CELL;
    const both = shown && reached >= SMALLEST_CELL;
    return {
      arm,
      exposed: shown ? exposed : null,
      reached: both ? reached : null,
      rate: both ? reached / exposed : null,
      enough: exposed >= test.needs,
    };
  });
}

/** Whether a test may be read yet: its last day is past, and every arm has the readers it said it needs. */
export function readable(test: AbTest, arms: readonly ArmSummary[], today: string): boolean {
  return today > test.ends && arms.every((a) => a.enough);
}
