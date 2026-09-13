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
// ── Every day, not every quarter ────────────────────────────────────────
//
// This queue used to treat a check as good for 90 days. In practice that read
// as "check each product once and it never comes back": a product left the
// list the moment it was ticked and did not return for a quarter, which is
// long enough to forget it exists. The owner's instruction on 2026-09-13 was
// that the check should show up every day it is needed.
//
// So a verified cost now counts for the CALENDAR DAY it was checked on, and the
// next morning the product is due again. A calendar day rather than a rolling
// 24 hours, because a rolling window makes products drift back into the list
// at whatever hour they were last ticked, and a checklist that refills itself
// through the afternoon is one nobody can finish. With a calendar day the whole
// list is waiting in the morning and it can be cleared by the evening.
//
// The day is the operator's, in RECHECK_TIME_ZONE, not UTC. The rest of the
// admin buckets days in UTC (lib/admin/dayWindow.ts says why), and that is
// right for charts drawn from UTC-keyed rows. It is wrong for a personal
// checklist: UTC midnight is early evening in the United States, so a price
// checked after dinner would count as "tomorrow" and silently skip the next
// morning's list.
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

/**
 * Whose calendar day a check counts for. The operator's machine runs on
 * Eastern time, so the list refills at Eastern midnight.
 */
export const RECHECK_TIME_ZONE = "America/New_York";

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

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

/** YYYY-MM-DD for an instant, as a wall calendar in `timeZone` shows it. */
export function localDayKey(ms: number, timeZone: string = RECHECK_TIME_ZONE): string {
  let f = dayFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dayFormatters.set(timeZone, f);
  }
  // formatToParts rather than format: the order and separators of a formatted
  // date depend on the locale data the runtime ships, the parts do not.
  const parts = f.formatToParts(ms);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/**
 * True when the last check happened on today's calendar day.
 *
 * A check stamped in the future by a skewed clock counts as today rather than
 * as tomorrow's work done early, so it cannot hide a product from tomorrow's
 * list.
 */
export function checkedToday(
  iso: string | null,
  now: number,
  timeZone: string = RECHECK_TIME_ZONE,
): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return localDayKey(Math.min(t, now), timeZone) === localDayKey(now, timeZone);
}

export type RecheckReason =
  | "never-checked"
  | "loss-making"
  | "thin-and-selling"
  | "due"
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
 * cases below come out in the right order relative to each other.
 */
export function rankRecheck(
  item: RecheckItem,
  now: number,
  fees?: FeeSchedule,
  timeZone: string = RECHECK_TIME_ZONE,
): RankedRecheck {
  const ageDays = daysSince(item.checkedAt, now);
  const econ = unitEconomics(item.priceCents, item.costCents, fees);
  const { band } = gradePrice(econ);

  // Nowhere to look is not the same as nothing to do: it still surfaces, so
  // the missing URL gets filled in, but it cannot outrank a check that can
  // actually be performed today.
  const blocked = !item.supplierUrl;

  // ORDER MATTERS. A loss-maker stays on the list even after today's check,
  // because the check is not what is wrong with it: it needs repricing. Every
  // other product clears for the rest of the day once it has been checked,
  // including a thin one that is selling. Under the old 90 day window a thin
  // seller was kept on the list regardless, as a way of checking it more often
  // than quarterly; with a daily cadence that exception only made it
  // impossible to finish the day's list, so it now labels a due product
  // rather than overriding a completed check.
  let reason: RecheckReason;
  if (band === "loss") reason = "loss-making";
  else if (!item.checkedAt) reason = "never-checked";
  else if (checkedToday(item.checkedAt, now, timeZone)) reason = "fresh";
  else if (band === "thin" && item.unitsSold > 0) reason = "thin-and-selling";
  else reason = "due";

  // Staleness in days, so 1.0 means one day's check has been missed.
  const staleness = ageDays;

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
  opts: {
    includeFresh?: boolean;
    limit?: number;
    fees?: FeeSchedule;
    timeZone?: string;
  } = {},
): RankedRecheck[] {
  const ranked = items.map((i) => rankRecheck(i, now, opts.fees, opts.timeZone));
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
      return `- ${r.title}: $${(r.priceCents / 100).toFixed(2)}, ${cost}, ${r.reason}, ${where}`;
    })
    .join("\n");
}
