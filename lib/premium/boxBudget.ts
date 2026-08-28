/**
 * What a monthly EIKON Box is allowed to cost, and what is actually left over.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * Pro is $19.99 a month and it promises a physical box every month. The box is
 * sourced per drop, so its cost is not a subscription line: the items are
 * bought fresh each month and the price and the shipping both move. That makes
 * it the one cost that can quietly eat the tier it is funded by, and nothing in
 * the panel was watching it.
 *
 * ── The two corrections this module makes ───────────────────────────────
 *
 * 1. LIST PRICE IS NOT REVENUE. Every figure in the admin panel is list price.
 *    Nothing anywhere in the repo models the store's cut, so a Pro subscriber
 *    shows as $19.99 when $16.99 actually arrives. Budgeting a box against the
 *    list price overspends by the size of the store's cut, every month, on
 *    every box.
 *
 * 2. A YEARLY SUBSCRIBER FUNDS TWELVE BOXES, NOT ONE. Pro yearly is $199.00,
 *    which is $16.58 a month before the store's cut and $14.10 after it. Budget
 *    a yearly member's box off the monthly price and every box overspends by a
 *    fifth. The budget is always computed from the plan's monthly EQUIVALENT.
 *
 * ── The band ────────────────────────────────────────────────────────────
 *
 * The ceiling is the number that matters: it is what keeps the tier profitable
 * no matter what a given month's sourcing costs. The floor is a quality guard,
 * not an accounting one. A box that costs almost nothing is not a saving; it is
 * a member opening a padded envelope and deciding the tier is not worth $19.99.
 *
 * Both are deliberately hardcoded rather than configurable. This is a pricing
 * decision, and pricing is an owner stop condition, so it changes by editing
 * this file in a commit somebody can read, never from a form at 1am.
 */

import { PLAN_PRICE_CENTS } from "./plans";

/**
 * The store's cut of a subscription.
 *
 * 15% is the Google Play and App Store small business rate, which both stores
 * apply below $1,000,000 a year. Purify is far below it. If that ever changes
 * the rate becomes 30% and every budget in here halves in generosity, which is
 * exactly the kind of change that should break a test rather than pass quietly.
 *
 * Web checkout is not a store: Stripe takes 2.9% plus 30 cents, which is a
 * different shape entirely and is not modelled here because no subscription is
 * sold that way today.
 */
export const STORE_FEE_PCT = {
  play: 0.15,
  appStore: 0.15,
} as const;

export type Store = keyof typeof STORE_FEE_PCT;

/** The Pro plans a box can be funded by. */
export type ProPlan = "proMonthly" | "proYearly";

/**
 * The share of a member's NET monthly subscription revenue that may be spent
 * on their box, all in: items plus shipping plus packaging.
 *
 * 35% leaves a 65% gross margin on the tier, which is what has to cover the
 * $171 of fixed monthly cost the app carries before anyone is paid.
 */
export const BOX_COGS_MIN_PCT = 0.2;
export const BOX_COGS_MAX_PCT = 0.35;

/** Monthly-equivalent list price of a Pro plan, in cents. */
export function monthlyEquivalentCents(plan: ProPlan): number {
  return plan === "proYearly"
    ? Math.round(PLAN_PRICE_CENTS.proYearly / 12)
    : PLAN_PRICE_CENTS.proMonthly;
}

/** What actually arrives after the store takes its cut, per month, in cents. */
export function netMonthlyCents(plan: ProPlan, store: Store = "play"): number {
  return Math.round(monthlyEquivalentCents(plan) * (1 - STORE_FEE_PCT[store]));
}

export type BoxBudget = {
  /** Monthly-equivalent list price. What the panel shows today. */
  grossCents: number;
  /** What the store actually pays out. */
  netCents: number;
  /** Below this the box is too thin to be worth the tier. */
  minCents: number;
  /** Hard ceiling. Above this the tier stops paying for itself. */
  maxCents: number;
};

export function boxBudget(plan: ProPlan, store: Store = "play"): BoxBudget {
  const grossCents = monthlyEquivalentCents(plan);
  const netCents = netMonthlyCents(plan, store);
  return {
    grossCents,
    netCents,
    minCents: Math.round(netCents * BOX_COGS_MIN_PCT),
    maxCents: Math.round(netCents * BOX_COGS_MAX_PCT),
  };
}

export type SpendVerdict = {
  verdict: "under" | "within" | "over";
  /** Cents above the ceiling. 0 unless the verdict is "over". */
  overageCents: number;
  /** Share of net subscription revenue this spend consumes, 0 to 1+. */
  shareOfNet: number;
  /** What is left of that member's month after the box. */
  marginCents: number;
  /** Plain sentence for the admin panel. Never a bare number. */
  note: string;
};

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * Judge a proposed or actual spend for ONE member's box.
 *
 * `spentCents` is everything the box costs to put in a member's hands: the
 * items, the shipping paid to source them, and the packaging. Not a unit price.
 */
export function assessBoxSpend(
  spentCents: number,
  plan: ProPlan,
  store: Store = "play",
): SpendVerdict {
  const budget = boxBudget(plan, store);
  const shareOfNet = budget.netCents === 0 ? 0 : spentCents / budget.netCents;
  const marginCents = budget.netCents - spentCents;

  if (spentCents > budget.maxCents) {
    const overageCents = spentCents - budget.maxCents;
    return {
      verdict: "over",
      overageCents,
      shareOfNet,
      marginCents,
      note:
        `${usd(spentCents)} is ${usd(overageCents)} over the ${usd(budget.maxCents)} ceiling ` +
        `for this plan. It takes ${(shareOfNet * 100).toFixed(0)}% of the ${usd(budget.netCents)} ` +
        `that actually arrives, leaving ${usd(marginCents)}.`,
    };
  }

  if (spentCents < budget.minCents) {
    return {
      verdict: "under",
      overageCents: 0,
      shareOfNet,
      marginCents,
      note:
        `${usd(spentCents)} is below the ${usd(budget.minCents)} floor. That is not a saving: ` +
        `a box this thin is what makes somebody cancel a ${usd(budget.grossCents)} tier.`,
    };
  }

  return {
    verdict: "within",
    overageCents: 0,
    shareOfNet,
    marginCents,
    note:
      `${usd(spentCents)} sits inside the ${usd(budget.minCents)} to ${usd(budget.maxCents)} band ` +
      `and leaves ${usd(marginCents)} of the ${usd(budget.netCents)} that arrives.`,
  };
}
