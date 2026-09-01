// Which supplier prices to go and check, and in what order.
//
// ── Why a queue and not a cron ──────────────────────────────────────────
//
// Supplier costs go stale silently. A price rises, the margin quietly inverts,
// and nothing anywhere says so: the product keeps selling at a number that was
// right in March. There is no API that will tell us, and CLAUDE.md rule 8 is
// explicit that internal tooling does not get paid APIs, that for these tools
// the agent IS the pipeline. So this does not fetch anything. It decides what
// is worth a human or an agent going and LOOKING at, and puts the most
// valuable checks first.
//
// ── Staleness alone is the wrong order ─────────────────────────────────
//
// The oldest check is not the most urgent one. A product nobody buys, sitting
// on a comfortable margin, can go a year without hurting anyone. A thin-margin
// product selling every week can invert into a loss in a fortnight and each
// sale after that costs money.
//
// So priority is staleness weighted by STAKE: how much a wrong cost would
// cost. That is what makes a short queue worth working rather than a long one
// worth ignoring.
//
// Pure and synchronous, so the ordering can be tested without a database. The
// reading and writing is app/api/admin/shop/sourcing.

import { gradePrice, unitEconomics, type FeeSchedule, type PriceBand } from "./pricing";

export type RecheckItem = {
  productId: string;
  title: string;
  priceCents: number;
  /** Null when nothing has ever been sourced. */
  costCents: number | null;
  /** ISO timestamp of the last verified cost check, or null for never. */
  checkedAt: string | null;
  /** Where to go and look. Null means the check cannot be done yet. */
  supplierUrl: string | null;
  supplierName: string | null;
  /** Units sold in the recent window. Drives stake. */
  unitsSold: number;
  /** Whether the product is actually on sale. Drafts are not urgent. */
  published: boolean;
};

/** How old a check may get before it counts as stale, in days. */
export const STALE_AFTER_DAYS = 90;

/** Never checked is treated as this old, so it outranks anything merely old. */
const NEVER_CHECKED_DAYS = 3650;

export function daysSince(iso: string | null, now: number): number {
  if (!iso) return NEVER_CHECKED_DAYS;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return NEVER_CHECKED_DAYS;
  // Clamped at zero: a timestamp in the future, which a clock skew can
  // produce, must not read as negatively stale and sort to the very top.
  return Math.max(0, (now - t) / 86_400_000);
}

export type RecheckReason =
  | "never-checked"
  | "loss-making"
  | "thin-and-selling"
  | "stale"
  | "fresh";

export type RankedRecheck = RecheckItem & {
  ageDays: number;
  band: PriceBand;
  reason: RecheckReason;
  /** Higher goes first. Unitless; only the ordering means anything. */
  priority: number;
  /** True when there is nowhere to go and look. */
  blocked: boolean;
};

/**
 * Score one product for rechecking.
 *
 * The weights are deliberately coarse. This orders a worklist; it is not a
 * model, and pretending to three significant figures of precision about how
 * urgent a price check is would be false confidence. What matters is that the
 * four cases below come out in the right order relative to each other.
 */
export function rankRecheck(
  item: RecheckItem,
  now: number,
  fees?: FeeSchedule,
): RankedRecheck {
  const ageDays = daysSince(item.checkedAt, now);
  const econ = unitEconomics(item.priceCents, item.costCents, fees);
  const { band } = gradePrice(econ);

  // Nowhere to look is not the same as nothing to do: it still surfaces, so
  // the missing URL gets filled in, but it cannot outrank a check that can
  // actually be performed today.
  const blocked = !item.supplierUrl;

  let reason: RecheckReason = "fresh";
  if (band === "loss") reason = "loss-making";
  else if (!item.checkedAt) reason = "never-checked";
  else if (band === "thin" && item.unitsSold > 0) reason = "thin-and-selling";
  else if (ageDays >= STALE_AFTER_DAYS) reason = "stale";

  // Staleness, in units of the stale threshold, so 1.0 means "just due".
  const staleness = ageDays / STALE_AFTER_DAYS;

  // Stake: what a wrong cost costs. A loss-maker is already bleeding, so it
  // leads regardless of age. Thin margins are next, and volume multiplies
  // both because every sale repeats the error.
  const bandWeight =
    band === "loss" ? 6 : band === "thin" ? 3 : band === "unknown" ? 2 : 1;
  const volume = 1 + Math.min(item.unitsSold, 50) / 10;

  let priority = staleness * bandWeight * volume;
  // A draft nobody can buy is real work, but not urgent work.
  if (!item.published) priority *= 0.3;
  // Blocked items sink below anything actionable without disappearing.
  if (blocked) priority *= 0.25;

  return { ...item, ageDays, band, reason, priority, blocked };
}

/**
 * The worklist, most valuable check first.
 *
 * `includeFresh` defaults to false because a queue that lists everything is a
 * catalogue, not a queue: the point is to be short enough to finish. A
 * loss-making product is never filtered out as fresh, however recently it was
 * checked, because the check is not what is wrong with it.
 */
export function recheckQueue(
  items: RecheckItem[],
  now: number,
  opts: { includeFresh?: boolean; limit?: number; fees?: FeeSchedule } = {},
): RankedRecheck[] {
  const ranked = items.map((i) => rankRecheck(i, now, opts.fees));
  const kept = opts.includeFresh
    ? ranked
    : ranked.filter((r) => r.reason !== "fresh");
  kept.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    // Stable and total: equal priority falls back to age, then to id, so the
    // queue does not reshuffle between loads and lose the operator's place.
    if (b.ageDays !== a.ageDays) return b.ageDays - a.ageDays;
    return a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0;
  });
  return typeof opts.limit === "number" ? kept.slice(0, opts.limit) : kept;
}

/** One line per row, for handing the queue to whoever is doing the looking. */
export function queueAsChecklist(rows: RankedRecheck[]): string {
  if (rows.length === 0) return "Nothing to recheck.";
  return rows
    .map((r) => {
      const cost =
        r.costCents === null ? "cost unknown" : `cost $${(r.costCents / 100).toFixed(2)}`;
      const where = r.supplierUrl ?? "NO SUPPLIER URL";
      return `- ${r.title} — $${(r.priceCents / 100).toFixed(2)}, ${cost}, ${r.reason} — ${where}`;
    })
    .join("\n");
}
