/**
 * What Purify actually keeps in a month.
 *
 * ── Why the panel could not answer this ─────────────────────────────────
 *
 * The Revenue tab shows income and the Costs tab shows spending, and nothing
 * subtracts one from the other. Worse, the two are not comparable as printed:
 *
 *   - Revenue is LIST PRICE. Nothing models the 15% the stores take, so
 *     $29.97 of subscriptions is really $25.47 arriving.
 *   - Costs is only what /support PUBLISHES. A line marked hidden is still
 *     money leaving the account, and one is: the Bible API licence at $29 a
 *     month. Published cost is $142; real cost is $171.
 *   - The EIKON Box is not in either. Every Pro member is owed a physical box
 *     every month and its cost appears nowhere.
 *
 * Read together those three make the picture look about $58 a month better
 * than it is, before a single box is posted.
 *
 * ── On honesty of the figure ────────────────────────────────────────────
 *
 * Shop income is realized: it comes from paid orders net of refunds.
 * Subscription income is ESTIMATED, because the RevenueCat webhook overwrites
 * one row and throws the billed amount away, so no ledger of what was actually
 * charged exists anywhere. Anything derived from it inherits that, which is why
 * the result carries `basis` and the caller must print it.
 */

export type ProfitInput = {
  /** Realized. Paid shop orders minus refunds, this month, in cents. */
  shopNetCents: number;
  /**
   * OWNER-ENTERED, AND DELIBERATELY NOT PART OF revenueCents.
   *
   * donations_monthly is a figure the owner types in, not a measured one. The
   * BMC cron that was meant to fill it needs CRON_SECRET and a Buy Me a Coffee
   * key, neither of which is set, so on production the table is empty and the
   * number in it is whatever was last entered by hand. The owner's own words:
   * the amount currently there is a placeholder, because the real total was
   * forgotten.
   *
   * A remembered-wrong figure must not move a profit line. It is carried
   * through so the panel can DISPLAY it, clearly labelled, and it is excluded
   * from every total. If donations are ever measured rather than recalled,
   * add them back deliberately and change the label at the same time.
   */
  donationsCents: number;
  /** ESTIMATED. Subscription MRR at list price, in cents. */
  subsGrossCents: number;
  /** The store's cut of subscription income, 0 to 1. */
  storeFeePct: number;
  /** EVERY active expense line, including ones hidden from /support. */
  fixedCostsCents: number;
  /** Everything spent on EIKON boxes this month: items, shipping, packaging. */
  boxCostsCents: number;
};

export type Profit = {
  subsNetCents: number;
  /** Passed straight through for display. Never added to revenueCents. */
  donationsCents: number;
  /**
   * Shop plus subscriptions, after the store's cut. NOT donations.
   *
   * See ProfitInput.donationsCents. It used to be in this sum, so a number
   * the owner had guessed was silently deciding whether the month showed a
   * profit, what the margin was, and how far off break-even the business was.
   */
  revenueCents: number;
  /** Fixed lines plus boxes. */
  costsCents: number;
  /** Revenue minus costs. Negative means the month lost money. */
  profitCents: number;
  /** profit / revenue. Null when there is no revenue to divide by. */
  margin: number | null;
  /** Revenue needed to break even, given the costs. */
  breakEvenGapCents: number;
  /** "estimated" whenever any subscription income is in the mix. */
  basis: "realized" | "estimated";
};

export function monthlyProfit(input: ProfitInput): Profit {
  const subsNetCents = Math.round(
    input.subsGrossCents * (1 - input.storeFeePct),
  );
  // donationsCents is NOT here. It is recalled, not measured, so it cannot be
  // allowed to move profit, margin or the break-even gap.
  const revenueCents = input.shopNetCents + subsNetCents;
  const costsCents = input.fixedCostsCents + input.boxCostsCents;
  const profitCents = revenueCents - costsCents;

  return {
    subsNetCents,
    donationsCents: input.donationsCents,
    revenueCents,
    costsCents,
    profitCents,
    margin: revenueCents === 0 ? null : profitCents / revenueCents,
    breakEvenGapCents: Math.max(0, costsCents - revenueCents),
    // A single cent of estimated subscription income makes the whole figure
    // estimated. Reporting a blended number as realized is the failure this
    // field exists to prevent.
    basis: input.subsGrossCents > 0 ? "estimated" : "realized",
  };
}

/**
 * How many more paying members it takes to break even.
 *
 * Rounded UP, because a fractional subscriber does not exist and rounding down
 * produces a target that does not actually clear the gap.
 */
export function membersToBreakEven(
  gapCents: number,
  perMemberNetCents: number,
): number {
  if (gapCents <= 0) return 0;
  if (perMemberNetCents <= 0) return Infinity;
  return Math.ceil(gapCents / perMemberNetCents);
}
