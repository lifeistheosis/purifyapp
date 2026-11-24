import { PLAN_PRICE_CENTS } from "@/lib/premium/plans";

/**
 * Level 1, "Purify pays its own bills" (docs/plans/levels.md): how far net
 * Plus revenue covers the running costs, and what is left to go. The figure
 * Home leads with (docs/plans/admin-levels-rework.md, step 1).
 *
 * Net is list price less the stores' 15%, the rule every money figure in the
 * panel keeps (lib/admin/goals.ts). Costs are monthlyCosts: the bank's last
 * whole months once it holds one, his typed cost lines until then. Pure.
 */

/** What one more monthly member brings in a month, after the stores' cut. */
export const NET_PER_MEMBER_CENTS = Math.round(PLAN_PRICE_CENTS.plusMonthly * 0.85);

export type LevelInput = {
  netPlusCents: number;
  costsCents: number | null;
  costsFrom: "bank" | "lines" | null;
  paid: number;
  trials: number;
  cancelling: number;
  newWeek: number;
  newPrevWeek: number;
};

export type Level = LevelInput & {
  /** 0 to 100, whole; null while the costs are not read. */
  pct: number | null;
  reached: boolean;
  remainingCents: number | null;
  /** More monthly members to cover the rest, rounded up. */
  membersToGo: number | null;
  /** New accounts this week against last, in percent; null with no last week. */
  newChangePct: number | null;
};

export function levelOne(i: LevelInput): Level {
  const known = i.costsCents !== null && i.costsCents > 0;
  const remainingCents = known ? Math.max(0, (i.costsCents as number) - i.netPlusCents) : null;
  return {
    ...i,
    pct: known ? Math.min(100, Math.round((i.netPlusCents / (i.costsCents as number)) * 100)) : null,
    reached: known && remainingCents === 0,
    remainingCents,
    membersToGo: remainingCents === null ? null : Math.ceil(remainingCents / NET_PER_MEMBER_CENTS),
    newChangePct: i.newPrevWeek > 0 ? Math.round(((i.newWeek - i.newPrevWeek) / i.newPrevWeek) * 100) : null,
  };
}
