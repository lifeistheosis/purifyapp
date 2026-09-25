import {
  commemorationsOn,
  fastingStatus,
  shiftForStyle,
  type CalStyle,
  type FastKind,
} from "./orthodox";

/**
 * The liturgical mode of a day: the one fact the Domestic Church Matrix and
 * the Catechumen Corner colour themselves by (`data-mode` on a `.lit-surface`
 * root; the tokens live in app/globals.css). Spec:
 * docs/design/family-matrix-and-catechumen-corner.md, section 1.3.
 *
 * This module authors nothing. It reads the same two facts the month grid
 * already reads for every cell (`monthGrid` in ./orthodox.ts): whether the
 * day's data flags a feast, and how `fastingStatus` classifies the day. It
 * keeps the grid's precedence too (`toneFor` in ./tone.ts): a feast wins. So
 * the family screen and the calendar cannot disagree about a day, and a
 * correction to the engine reaches both at once.
 */
export type LiturgicalMode = "feast" | "fast" | "ordinary";

/**
 * Which of the engine's fasting kinds render as the fast mode.
 *
 * Every kind the engine describes as a fast day is "fast", including the two
 * relaxations (wine and oil, fish), which are still fast days in the
 * engine's own terms. A fast-free day and an unremarkable day are "ordinary":
 * the resolver claims a mode only when the data does, and a fast-free day
 * carries no feast flag of its own. To show fast-free days as feast instead,
 * change that one entry; the tests read this table, so they follow.
 */
export const MODE_BY_FAST_KIND: Readonly<Record<FastKind, LiturgicalMode>> = {
  strict: "fast",
  "wine-oil": "fast",
  fish: "fast",
  fast: "fast",
  "fast-free": "ordinary",
  normal: "ordinary",
};

/** The mode for facts the caller already has, e.g. a `MonthCell`. Pure. */
export function modeFor(opts: {
  hasFeast: boolean;
  fast: FastKind;
}): LiturgicalMode {
  if (opts.hasFeast) return "feast";
  return MODE_BY_FAST_KIND[opts.fast];
}

/**
 * The mode of a day in the reader's reckoning.
 *
 * `date` is in the UTC-noon frame every "today" surface passes around
 * (`useToday()`, `useChurchDay().day`, `startOfDayLocal`), not a wall-clock
 * Date; lib/rhythm/dayKey.ts explains why mixing the two is off by one day
 * for half the planet. The lookup is shifted for Old Calendar readers exactly
 * as the month grid shifts it, which lib/calendar/__tests__/oneReckoning.test.ts
 * requires of anything that calls `fastingStatus` or `commemorationsOn`.
 */
export function resolveMode(date: Date, style: CalStyle = "new"): LiturgicalMode {
  const lookup = shiftForStyle(date, style);
  return modeFor({
    hasFeast: commemorationsOn(lookup).some((c) => c.kind === "feast"),
    fast: fastingStatus(lookup).kind,
  });
}
