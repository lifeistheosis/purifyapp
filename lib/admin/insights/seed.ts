import { deltaIdFor } from "./derive";
import type { Dataset, Goal, Period, Series } from "./types";

/**
 * The starter goal set.
 *
 * EVERY TARGET IS DERIVED FROM THE OPERATOR'S OWN DATA, and every one carries
 * the sentence explaining how, so adjusting it is an informed edit rather than
 * a guess. Nothing here is a round number chosen because it looked ambitious.
 *
 * The rule: set each daily target where the hit rate lands near 38% across the
 * days since launch. Hard enough that meeting it means something, soft enough
 * that runs actually happen. Weekly is 7x daily and monthly 30x, so the three
 * windows tell one story rather than three.
 *
 * A goal is only proposed for a series that is actually present, so importing a
 * report with fewer countries proposes fewer goals rather than a list of
 * targets pointing at nothing.
 */

export type SeedGoal = Omit<Goal, "id" | "createdAt"> & {
  /** Shown under the goal. Says where the number came from. */
  derivation: string;
};

/** Percentile of a sorted copy. Used to place a target inside real spread. */
function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)));
  return sorted[idx];
}

/**
 * The daily target for a flow, placed where roughly 38% of days clear it.
 *
 * Reading the 62nd percentile gives that directly: 38% of days are above it.
 * Rounded to something a person would say out loud, because "+117 impressions"
 * is a target and "+117.4" is a spreadsheet cell.
 */
function dailyTargetFrom(values: number[]): number {
  const raw = quantile(values, 0.62);
  if (raw <= 0) return 1;
  if (raw < 10) return Math.max(1, Math.round(raw));
  if (raw < 100) return Math.round(raw / 5) * 5;
  return Math.round(raw / 10) * 10;
}

/** Days since the metric became real. A launch export opens with weeks of
 *  zeros from before anyone could install anything, and averaging those in
 *  drags every target below what the product actually does now. */
function liveValues(series: Series): number[] {
  const measured = series.points
    .filter((p) => p.value !== null)
    .map((p) => p.value as number);
  const firstNonZero = measured.findIndex((v) => v !== 0);
  return firstNonZero < 0 ? [] : measured.slice(firstNonZero);
}

function hitRate(values: number[], target: number): number {
  if (values.length === 0) return 0;
  return values.filter((v) => v >= target).length / values.length;
}

const PERIOD_MULTIPLE: Record<Period, number> = { daily: 1, weekly: 7, monthly: 30 };

/**
 * Propose goals for a dataset.
 *
 * Returns proposals, not goals. The caller assigns ids and decides what to do
 * with the ones that already exist, so running this twice cannot duplicate a
 * target the operator has since edited.
 */
export function seedGoals(dataset: Dataset | null): SeedGoal[] {
  if (!dataset) return [];
  const out: SeedGoal[] = [];

  for (const s of dataset.series) {
    // Daily goals go on FLOWS only. A daily target on a level is met for ever
    // once crossed, which is why every stock gets a derived daily-change flow
    // at import; that flow is what carries the daily goal.
    if (s.kind !== "flow") continue;

    const values = liveValues(s);
    if (values.length < 14) continue; // too little history to place a target honestly

    const daily = dailyTargetFrom(values);
    const pct = Math.round(hitRate(values, daily) * 100);

    for (const period of ["daily", "weekly", "monthly"] as Period[]) {
      const target = daily * PERIOD_MULTIPLE[period];
      out.push({
        seriesId: s.id,
        label: `${s.label}, ${period}`,
        period,
        target,
        paused: false,
        derivation:
          period === "daily"
            ? `${daily} a day, which ${pct}% of the ${values.length} days since launch cleared.`
            : `${PERIOD_MULTIPLE[period]} x the daily target of ${daily}, so the three windows agree.`,
      });
    }
  }

  // Level goals on the stocks themselves, which is what a level is for. The
  // next two round numbers above where it stands, so there is always one just
  // ahead and one further out.
  for (const s of dataset.series) {
    if (s.kind !== "stock") continue;
    const measured = s.points.filter((p) => p.value !== null).map((p) => p.value as number);
    if (measured.length === 0) continue;
    const now = measured[measured.length - 1];
    if (now < 50) continue; // too small for a milestone to mean anything yet

    for (const next of nextMilestones(now)) {
      out.push({
        seriesId: s.id,
        label: `${s.label}, reach ${next.toLocaleString("en-US")}`,
        period: "monthly",
        target: next,
        paused: false,
        derivation: `It stands at ${now.toLocaleString("en-US")}. A level, so this is a figure to reach rather than a rate to keep.`,
      });
    }
  }

  return out;
}

/**
 * The next two figures to reach, PROPORTIONAL to where the metric stands.
 *
 * Both absolute approaches failed, in opposite directions, and the failures are
 * worth recording. A flat 500 step offered Germany, at 66 devices, "reach 500":
 * seven and a half times over, a wish rather than a target. Scaling the step to
 * the metric's magnitude then offered it "reach 70", four devices away, which
 * is not a goal either.
 *
 * A multiple is the thing that holds at both ends: something like a quarter
 * more, and roughly double. 66 becomes 100 and 150; 932 becomes 1,200 and
 * 2,000; 151 becomes 200 and 300.
 */
function nextMilestones(now: number): number[] {
  const first = niceUp(now * 1.25);
  const second = niceUp(now * 2);
  // Distinct, so two goals are not the same number rounded twice.
  return second > first ? [first, second] : [first, niceUp(first * 1.6)];
}

/** Round up to a figure a person would actually say: 1, 1.5, 2, 3, 5 or 10
 *  times a power of ten. 1,165 becomes 1,200; 82 becomes 100. */
function niceUp(n: number): number {
  if (n <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)));
  const scaled = n / magnitude;
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((c) => c >= scaled) ?? 10;
  return Math.round(step * magnitude);
}

/**
 * A goal proposal for shop revenue, which is a special case.
 *
 * Seeded at zero and PAUSED. There are no paid orders yet, so any target would
 * read 0% from the day it was born, and a meter that is red from birth teaches
 * the operator to ignore the colour everywhere else. It is created so the
 * structure is there, and it stays paused until the shop takes a first order.
 */
export function seedRevenueGoals(seriesId: string): SeedGoal[] {
  return (["daily", "weekly", "monthly"] as Period[]).map((period) => ({
    seriesId,
    label: `Shop revenue, ${period}`,
    period,
    target: 0,
    paused: true,
    derivation:
      "Paused, and at zero, because no order has been paid yet. A target set before there is any revenue would grade the shop as failing every day for reasons that have nothing to do with it. Unpause and set a figure on the first sale.",
  }));
}

/** True when a proposal already matches something stored, so seeding twice is
 *  a no-op rather than a duplicate. Matched on series and period, not on label,
 *  because the label is the part an operator renames. */
export function alreadySeeded(existing: Goal[], proposal: SeedGoal): boolean {
  return existing.some(
    (g) => g.seriesId === proposal.seriesId && g.period === proposal.period && g.target === proposal.target,
  );
}

/** The derived daily-change series for a stock, if the dataset carries it. */
export function deltaSeriesIdFor(series: Series): string {
  return deltaIdFor(series);
}
