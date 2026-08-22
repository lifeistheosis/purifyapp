/**
 * The vocabulary the whole insights engine shares.
 *
 * One file, no logic, so the chain
 *   CSV -> dataset -> forecast -> goals -> grades
 * has a single set of nouns and nothing downstream has to guess what an
 * upstream stage meant.
 */

/**
 * Whether a number is a level or a rate.
 *
 * This distinction is the one that decides every aggregation in the engine and
 * it is invisible in the CSV itself. "Installed audience" is a STOCK: 932 on
 * the 18th means 932 devices have the app, and summing a month of it produces
 * a number with no meaning. "Device impressions" is a FLOW: 106 on the 18th
 * means 106 impressions happened that day, and a month of it sums correctly.
 *
 * Get this wrong and a monthly installed-audience figure reads about 25,000
 * against a real one of 932, which would then be graded against a goal and
 * reported as spectacular success.
 */
export type SeriesKind = "stock" | "flow";

export type Point = {
  /** YYYY-MM-DD, UTC. */
  day: string;
  /** null means "not measured", which is not the same as 0. */
  value: number | null;
};

export type Series = {
  id: string;
  label: string;
  kind: SeriesKind;
  points: Point[];
  /** Where this came from, shown so a number can always be traced. */
  source: string;
};

export type Dataset = {
  /** Stable id so a re-import of the same report replaces it. */
  id: string;
  label: string;
  series: Series[];
  /** ISO timestamp of the import, stamped by the caller. */
  importedAt: string;
  rowCount: number;
  firstDay: string | null;
  lastDay: string | null;
  warnings: string[];
};

/** The three windows every grade is computed over. */
export type Period = "daily" | "weekly" | "monthly";

export const PERIODS: readonly Period[] = ["daily", "weekly", "monthly"];

export const PERIOD_DAYS: Record<Period, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

export const PERIOD_LABEL: Record<Period, string> = {
  daily: "Today",
  weekly: "This week",
  monthly: "This month",
};

export type Goal = {
  id: string;
  /** Which series this measures. */
  seriesId: string;
  label: string;
  period: Period;
  /** The number to beat, in the series' own unit. */
  target: number;
  /**
   * Paused goals keep their settings and stop affecting any grade. Deleting
   * would lose the target; setting it to zero would read as "met", which is
   * the opposite of "not being measured".
   */
  paused: boolean;
  createdAt: string;
};

export type GradeLetter = "A" | "B" | "C" | "D" | "F";

export type Standing = "ahead" | "onTrack" | "behind";

export type GoalResult = {
  goal: Goal;
  /** What the data actually says for this goal's window. */
  actual: number;
  target: number;
  /** actual / target. Infinity is impossible; a zero target yields null. */
  ratio: number | null;
  letter: GradeLetter;
  standing: Standing;
  /** True when the series named by the goal is not in the dataset. */
  missing: boolean;
};

export type PeriodGrade = {
  period: Period;
  results: GoalResult[];
  /** Mean ratio across contributing goals, or null when none contribute. */
  ratio: number | null;
  letter: GradeLetter | null;
  standing: Standing | null;
};

export type Forecast = {
  seriesId: string;
  /** Projected points beyond the last measured day. */
  points: Point[];
  /** Units per day. Positive is growth. */
  slopePerDay: number;
  /**
   * How well the straight line fits, 0 to 1. Reported rather than hidden
   * because a projection off a poor fit is a guess wearing a number's clothes,
   * and the UI refuses to state a figure below the floor.
   */
  fit: number;
  /** Days of real data the fit was computed from. */
  basisDays: number;
};
