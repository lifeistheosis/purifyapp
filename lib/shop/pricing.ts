// What a sale is actually worth, and whether the price is any good.
//
// ── The thing this exists to stop ───────────────────────────────────────
//
// Margin is normally written (price - cost) / price, and on a shop selling
// $4 items that number is a lie. Card processing is 2.9% PLUS a flat 30c, and
// the flat part does not care how small the sale is:
//
//   a $3.00 sale pays 38.7c in fees, which is 12.9% of it
//   a $50.00 sale pays $1.75,        which is  3.5% of it
//
// So the same "50% margin" is a genuinely healthy sale at $50 and a marginal
// one at $3, and nothing in this codebase could previously tell them apart.
// Every figure here is computed AFTER fees, on the money that actually lands,
// and feeSharePct exists to make the regressive part visible rather than
// leaving it buried inside a single margin number.
//
// ── Rates are inputs, not constants ────────────────────────────────────
//
// STRIPE_STANDARD is a default and not a fact: rates differ by country, by
// card, and by whatever a processor negotiates. It is passed in everywhere so
// a wrong global cannot silently reprice the catalogue, and so a test can
// state a rate rather than inherit one.
//
// Pure and synchronous. The admin surfaces are in components/admin/tabs, the
// queue that decides WHAT to reprice is lib/shop/recheck.ts.

export type FeeSchedule = {
  /** Proportion of the sale, 0..1. 0.029 is Stripe's usual 2.9%. */
  rate: number;
  /** Flat cents per successful charge. */
  fixedCents: number;
};

/** Stripe's common online rate. A DEFAULT, not a promise: see the header. */
export const STRIPE_STANDARD: FeeSchedule = { rate: 0.029, fixedCents: 30 };

export type UnitEconomics = {
  priceCents: number;
  costCents: number;
  /** Processing on this one sale, rounded to whole cents as a processor does. */
  feeCents: number;
  /** What reaches the account: price minus fees. */
  netCents: number;
  /** net minus cost. What the sale actually adds, and the only honest one. */
  contributionCents: number;
  /** contribution / price, 0..1. Null when the price is 0 and it is undefined. */
  marginPct: number | null;
  /** fee / price. The regressive part, surfaced rather than hidden. */
  feeSharePct: number | null;
  /** price / cost. Null when the cost is unknown or zero. */
  markupMultiple: number | null;
  /** False when no supplier cost is recorded: everything below is a guess. */
  costKnown: boolean;
};

/**
 * The economics of one sale.
 *
 * A MISSING COST IS NOT A ZERO COST. A product with no sourcing row has an
 * unknown cost, and treating that as free would report a 97% margin on
 * everything unsourced, which is the most flattering possible lie. costKnown
 * is false in that case and contribution is computed as if cost were zero
 * only so the caller has a number to show, never so it can be graded: see
 * gradePrice, which refuses.
 */
export function unitEconomics(
  priceCents: number,
  costCents: number | null | undefined,
  fees: FeeSchedule = STRIPE_STANDARD,
): UnitEconomics {
  const price = Math.max(0, Math.round(priceCents || 0));
  const costKnown = typeof costCents === "number" && Number.isFinite(costCents);
  const cost = costKnown ? Math.max(0, Math.round(costCents as number)) : 0;

  // No charge means no fee. A free product is not billed 30c.
  const feeCents =
    price > 0 ? Math.round(price * fees.rate + fees.fixedCents) : 0;
  const netCents = price - feeCents;
  const contributionCents = netCents - cost;

  return {
    priceCents: price,
    costCents: cost,
    feeCents,
    netCents,
    contributionCents,
    marginPct: price > 0 ? contributionCents / price : null,
    feeSharePct: price > 0 ? feeCents / price : null,
    markupMultiple: costKnown && cost > 0 ? price / cost : null,
    costKnown,
  };
}

export type PriceBand = "unknown" | "loss" | "thin" | "healthy" | "strong";

export type PriceGrade = {
  band: PriceBand;
  /** One word for a badge. */
  label: string;
  /** A sentence naming the reason, for the operator who wants to know why. */
  reason: string;
};

/** Where the bands sit, as contribution margin. Exported so the UI can
 *  explain the scale rather than restating numbers that might drift. */
export const BANDS = { thin: 0.25, healthy: 0.5 } as const;

/**
 * Grade a price, and say why.
 *
 * IT REFUSES WITHOUT A COST. An ungraded product is a prompt to go and source
 * it; a product graded "strong" because nobody recorded what it cost is a
 * decision made on nothing. The band is "unknown" and the reason says so.
 *
 * The reason names the DOMINANT factor rather than restating the number,
 * because the action differs: fees eating the sale is fixed by raising the
 * price or bundling, a thin margin on a healthy-sized sale is fixed at the
 * supplier.
 */
export function gradePrice(e: UnitEconomics): PriceGrade {
  if (!e.costKnown) {
    return {
      band: "unknown",
      label: "No cost",
      reason:
        "No supplier cost recorded, so nothing here can say whether this price is any good.",
    };
  }
  if (e.priceCents === 0) {
    return {
      band: "unknown",
      label: "Free",
      reason: "Priced at zero, so there is no margin to grade.",
    };
  }
  if (e.contributionCents <= 0) {
    return {
      band: "loss",
      label: "Loses money",
      // WHICH loss this is, decided by whether the sale would still lose money
      // at zero cost. The first version asked `costCents > netCents`, which is
      // true for a cost of nothing against a negative net, so a 30c product
      // that cost us nothing was reported as "Costs $0.00 and nets -$0.01":
      // technically true, and it blames the supplier for a fee problem. The
      // two have opposite fixes, which is the whole reason the sentence
      // exists.
      reason:
        e.netCents <= 0
          ? "Fees alone take more than this sale brings in."
          : `Costs ${fmt(e.costCents)} and nets ${fmt(e.netCents)} after fees.`,
    };
  }
  const m = e.marginPct ?? 0;
  // Fees over a tenth of the sale is the regressive case worth naming: at that
  // point the price is small enough that the flat 30c is the problem.
  const feeHeavy = (e.feeSharePct ?? 0) > 0.1;
  if (m < BANDS.thin) {
    return {
      band: "thin",
      label: "Thin",
      reason: feeHeavy
        ? `Only ${pct(m)} after fees, and fees alone are ${pct(e.feeSharePct ?? 0)} of this price.`
        : `Only ${pct(m)} after fees. The supplier cost is most of the price.`,
    };
  }
  if (m < BANDS.healthy) {
    return {
      band: "healthy",
      label: "Healthy",
      reason: feeHeavy
        ? `${pct(m)} after fees, though fees take ${pct(e.feeSharePct ?? 0)} at this price.`
        : `${pct(m)} after fees.`,
    };
  }
  return {
    band: "strong",
    label: "Strong",
    reason: `${pct(m)} after fees, ${fmt(e.contributionCents)} a unit.`,
  };
}

/**
 * The price that would hit a target contribution margin.
 *
 * Solved, not searched. Wanting (price - fee(price) - cost) / price = target,
 * and fee(price) = price*rate + fixed:
 *
 *   price(1 - target - rate) = cost + fixed
 *   price = (cost + fixed) / (1 - target - rate)
 *
 * Returns null when the target is unreachable, which is a real case rather
 * than a guard: asking for a 98% margin at a 2.9% rate makes the denominator
 * negative, and the honest answer is that no price achieves it, not some
 * enormous number.
 */
export function priceForMargin(
  costCents: number,
  targetMargin: number,
  fees: FeeSchedule = STRIPE_STANDARD,
): number | null {
  const denom = 1 - targetMargin - fees.rate;
  if (denom <= 0) return null;
  const exact = (Math.max(0, costCents) + fees.fixedCents) / denom;
  if (!Number.isFinite(exact)) return null;

  // Up, always. Rounding down lands just under the target the caller asked
  // for, which is the one direction that makes the answer wrong.
  let price = Math.ceil(exact);

  // THEN CORRECT FOR THE FEE'S OWN ROUNDING. The solve above is exact
  // arithmetic; the fee actually charged is Math.round()ed to whole cents, so
  // a schedule that rounds a fraction of a cent UP eats into the margin and
  // the answer lands fractionally short. Caught by a round-trip test at
  // cost 99 and target 0.4, which came back at 39.8%.
  //
  // Bounded rather than while(true): each step gains roughly (1 - rate) of a
  // cent, so a handful always suffices, and a bound means a pathological
  // schedule cannot hang the request. If it somehow does not converge, the
  // best price found is still returned rather than null, because a price a
  // hair under target is more useful than no answer.
  for (let i = 0; i < 8; i++) {
    const achieved = unitEconomics(price, costCents, fees).marginPct;
    if (achieved !== null && achieved >= targetMargin) break;
    price += 1;
  }
  return price;
}

/** "$12.99". Local to this module: it formats cents for reasons, not for UI. */
function fmt(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
