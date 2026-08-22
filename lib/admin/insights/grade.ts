import { windowValue } from "./ingest";
import {
  PERIOD_DAYS,
  PERIODS,
  type Dataset,
  type Goal,
  type GoalResult,
  type GradeLetter,
  type Period,
  type PeriodGrade,
  type Standing,
} from "./types";

/**
 * Measure the data against the goals and put a letter on it.
 *
 * The last stage of the chain. Pure: same dataset and same goals in, same
 * grades out, with no clock read and no state. That is what lets the store
 * recompute the whole thing on any change without caring which change it was.
 */

/**
 * The scale, written down rather than scattered through comparisons.
 *
 * Anchored at 1.0 = C, not A. Hitting the target exactly is meeting
 * expectations, and a system that awards an A for meeting expectations has
 * nothing left to say when something genuinely beats them. The owner asked for
 * "beating, meeting, or falling behind" and this is that, with resolution.
 */
const SCALE: { min: number; letter: GradeLetter }[] = [
  { min: 1.25, letter: "A" },
  { min: 1.05, letter: "B" },
  { min: 0.95, letter: "C" },
  { min: 0.75, letter: "D" },
  { min: 0, letter: "F" },
];

export function letterFor(ratio: number): GradeLetter {
  for (const s of SCALE) if (ratio >= s.min) return s.letter;
  return "F";
}

export function standingFor(ratio: number): Standing {
  if (ratio >= 1.05) return "ahead";
  if (ratio >= 0.95) return "onTrack";
  return "behind";
}

export const STANDING_LABEL: Record<Standing, string> = {
  ahead: "Beating target",
  onTrack: "Meeting target",
  behind: "Behind target",
};

/**
 * One goal, measured.
 *
 * A goal naming a series the dataset does not contain is reported as missing
 * rather than scored zero. Scoring it would fail the whole period grade on the
 * strength of a goal nothing measured, which reads as a business problem when
 * it is a data problem.
 */
export function evaluateGoal(goal: Goal, dataset: Dataset | null): GoalResult {
  const series = dataset?.series.find((s) => s.id === goal.seriesId) ?? null;

  if (!series) {
    return {
      goal,
      actual: 0,
      target: goal.target,
      ratio: null,
      letter: "F",
      standing: "behind",
      missing: true,
    };
  }

  const { value } = windowValue(series, PERIOD_DAYS[goal.period]);

  // A zero target has no ratio: everything divided by it is either undefined or
  // infinite. It is treated as met, because "I am not asking for any" is
  // satisfied by any amount including none.
  if (goal.target <= 0) {
    return {
      goal,
      actual: value,
      target: goal.target,
      ratio: null,
      letter: "C",
      standing: "onTrack",
      missing: false,
    };
  }

  const ratio = value / goal.target;
  return {
    goal,
    actual: value,
    target: goal.target,
    ratio,
    letter: letterFor(ratio),
    standing: standingFor(ratio),
    missing: false,
  };
}

/**
 * Every goal for one period, and the period's own grade.
 *
 * The period ratio is the MEAN of the contributing ratios, not the ratio of
 * the sums. Summing across goals would add impressions to installs and let one
 * large-numbered metric drown every other one; the mean weights each goal
 * equally, which is what a list of separate targets means.
 *
 * Each ratio is capped at 2 before averaging. Without the cap a single metric
 * at eight times target carries a period where everything else is failing, and
 * the grade stops describing the business.
 */
const RATIO_CAP = 2;

export function gradePeriod(
  period: Period,
  goals: Goal[],
  dataset: Dataset | null,
): PeriodGrade {
  const mine = goals.filter((g) => g.period === period && !g.paused);
  const results = mine.map((g) => evaluateGoal(g, dataset));

  const scoring = results.filter((r) => !r.missing && r.ratio !== null);
  if (scoring.length === 0) {
    return { period, results, ratio: null, letter: null, standing: null };
  }

  const mean =
    scoring.reduce((s, r) => s + Math.min(RATIO_CAP, r.ratio as number), 0) / scoring.length;

  return {
    period,
    results,
    ratio: mean,
    letter: letterFor(mean),
    standing: standingFor(mean),
  };
}

export function gradeAll(goals: Goal[], dataset: Dataset | null): Record<Period, PeriodGrade> {
  return {
    daily: gradePeriod("daily", goals, dataset),
    weekly: gradePeriod("weekly", goals, dataset),
    monthly: gradePeriod("monthly", goals, dataset),
  };
}

/**
 * The single headline grade.
 *
 * Weighted towards the longer window on purpose. One bad Tuesday should not
 * turn the whole panel red, and one good Tuesday should not turn it green. The
 * monthly view is the one that describes the business; the daily one is the
 * one that notices something today.
 */
const PERIOD_WEIGHT: Record<Period, number> = {
  daily: 1,
  weekly: 2,
  monthly: 3,
};

export function overallGrade(
  grades: Record<Period, PeriodGrade>,
): { ratio: number | null; letter: GradeLetter | null; standing: Standing | null } {
  let weighted = 0;
  let weight = 0;
  for (const p of PERIODS) {
    const g = grades[p];
    if (g.ratio === null) continue;
    weighted += g.ratio * PERIOD_WEIGHT[p];
    weight += PERIOD_WEIGHT[p];
  }
  if (weight === 0) return { ratio: null, letter: null, standing: null };
  const ratio = weighted / weight;
  return { ratio, letter: letterFor(ratio), standing: standingFor(ratio) };
}
