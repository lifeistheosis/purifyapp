/**
 * Plus over time (1.9, admin item A2): what the kept RevenueCat events say,
 * week by week and day by day. The events are public.plus_events
 * (lib/billing/plusEvents.ts writes them; supabase/migrations/20261110002920_plus_events.sql).
 *
 * The words, as the admin shows them:
 *
 *   joined           began paying: a paid first purchase, or a free trial's
 *                    first charge (a trial that paid)
 *   trials           free trials begun
 *   trials paid      free trials that became a first charge
 *   trials ended     free trials that ran out without a charge
 *   left             a paid membership that ended
 *   renewal off      a member turned renewal off (they keep Plus to the end
 *                    of what they paid for)
 *   card failed      a renewal charge that failed (RevenueCat also sends a
 *                    cancel with BILLING_ERROR for it; only one is counted)
 *   refunds          a purchase given back
 *
 * Money is what members paid, in US dollars as RevenueCat converts it, less
 * refunds, and "after the store" is what reaches Purify: RevenueCat's own
 * take-home share for each Google Play or App Store purchase (its estimate
 * of the store's commission and the tax), or the stores' usual 15% where it
 * sent none. Plus bought on the website keeps its whole price here, because
 * its fees are Stripe's and Money takes them from Stripe's own ledger.
 *
 * Never counted: test money (a sandbox purchase, RevenueCat's Test Store) and
 * RevenueCat's promotional grants. Both are counted apart, so his own test
 * purchases can be seen to arrive and be set aside.
 *
 * Every day and week is UTC, as everywhere in the admin. Pure.
 */

import { STORE_CUT } from "./money";

/** A kept event, as the admin reads it back. */
export type PlusFact = {
  type: string;
  user_id: string | null;
  store: string | null;
  /** The store's product, read so Money's chart can tell Plus from the EIKON Box membership (planOf). */
  product_id?: string | null;
  environment: string | null;
  period_type: string | null;
  price_usd: number | null;
  takehome: number | null;
  trial_conversion: boolean | null;
  reason: string | null;
  event_at: string;
  expires_at: string | null;
};

/** The columns to read for it. */
export const PLUS_FACT_COLUMNS =
  "type, user_id, store, product_id, environment, period_type, price_usd, takehome, trial_conversion, reason, event_at, expires_at";

const DAY_MS = 86_400_000;

/** Test money: never income, never a member. */
export const isTestMoney = (f: PlusFact) => f.environment === "SANDBOX" || f.store === "TEST_STORE";

/** A grant from RevenueCat's dashboard: access nobody paid for. */
export const isGrant = (f: PlusFact) => f.store === "PROMOTIONAL" || f.period_type === "PROMOTIONAL";

/** Neither test money nor a grant: a real member's real event. */
export const counts = (f: PlusFact) => !isTestMoney(f) && !isGrant(f);

/** Bought on the website, whose fees Stripe's ledger holds. */
const WEB_STORES = new Set(["STRIPE", "RC_BILLING"]);
export const isWebStore = (store: string | null) => store !== null && WEB_STORES.has(store);

/**
 * Which plan a subscription paid for, read from the store's own product name:
 * "box" for Pro, the EIKON Box membership, "plus" for Plus, or null when the
 * name does not say. The webhook's event names its entitlement, but
 * plus_events has no column for it, so the kept product is the one record of
 * the plan. Its name is read word by word: a word that is exactly "pro" or
 * "plus" ("purify_pro:monthly" on Google Play,
 * "net.purifyapp.purify.pro.monthly", "Plus Annual"), never a word that only
 * contains one ("product", "promo"). A name with both words, or neither, is no
 * plan: Money's chart keeps that money apart, in its own ink, rather than
 * guess it into one.
 */
export function planOf(productId: string | null | undefined): "plus" | "box" | null {
  const words = new Set((productId ?? "").toLowerCase().split(/[^a-z]+/));
  const pro = words.has("pro");
  const plus = words.has("plus");
  return pro === plus ? null : pro ? "box" : "plus";
}

const MONEY_IN = new Set(["INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE"]);

/**
 * A purchase given back. RevenueCat sends a refund as a cancel with the reason
 * CUSTOMER_SUPPORT, with the price below zero; either is taken as a refund,
 * so neither alone can let one through.
 */
export const isRefund = (f: PlusFact) =>
  f.type !== "REFUND_REVERSED" && ((f.type === "CANCELLATION" && f.reason === "CUSTOMER_SUPPORT") || (f.price_usd ?? 0) < 0);

/** What one event moved, in cents, before the store's share: in, back out, or nothing. */
export function grossCents(f: PlusFact): number {
  if (!counts(f) || f.price_usd === null) return 0;
  const cents = Math.round(Math.abs(f.price_usd) * 100);
  if (isRefund(f)) return -cents;
  if (f.type === "REFUND_REVERSED") return cents;
  return MONEY_IN.has(f.type) && f.price_usd > 0 ? cents : 0;
}

/** What of it reaches Purify: the store's take-home share, or 85% without one; the website's whole. */
export function afterStoreCents(f: PlusFact): number {
  const gross = grossCents(f);
  if (gross === 0 || isWebStore(f.store)) return gross;
  const share = f.takehome !== null && f.takehome >= 0 && f.takehome <= 1 ? f.takehome : 1 - STORE_CUT;
  return Math.round(gross * share);
}

export type PlusTally = {
  joined: number;
  trials: number;
  trialsPaid: number;
  trialsEnded: number;
  left: number;
  renewalOff: number;
  cardFailed: number;
  refunds: number;
  /** What members paid, less refunds, in cents. */
  grossCents: number;
  /** What reached Purify of it, in cents. */
  afterStoreCents: number;
};

const empty = (): PlusTally => ({
  joined: 0,
  trials: 0,
  trialsPaid: 0,
  trialsEnded: 0,
  left: 0,
  renewalOff: 0,
  cardFailed: 0,
  refunds: 0,
  grossCents: 0,
  afterStoreCents: 0,
});

/** Adds one event to a tally. */
function add(t: PlusTally, f: PlusFact) {
  if (!counts(f)) return;
  const trial = f.period_type === "TRIAL";
  switch (f.type) {
    case "INITIAL_PURCHASE":
      if (trial) t.trials += 1;
      else t.joined += 1;
      break;
    case "RENEWAL":
      if (f.trial_conversion === true) {
        t.trialsPaid += 1;
        t.joined += 1;
      }
      break;
    case "EXPIRATION":
      if (trial) t.trialsEnded += 1;
      else t.left += 1;
      break;
    case "CANCELLATION":
      if (f.reason === "UNSUBSCRIBE") t.renewalOff += 1;
      break;
    case "BILLING_ISSUE":
      t.cardFailed += 1;
      break;
  }
  if (isRefund(f)) t.refunds += 1;
  t.grossCents += grossCents(f);
  t.afterStoreCents += afterStoreCents(f);
}

/** The tally of a set of events. */
export function tally(facts: readonly PlusFact[]): PlusTally {
  const t = empty();
  for (const f of facts) add(t, f);
  return t;
}

/** The UTC day of a moment, as YYYY-MM-DD, whatever offset the database wrote it with. */
export const utcDay = (iso: string) => new Date(iso).toISOString().slice(0, 10);

/** The UTC Monday that starts the week holding `iso`, as YYYY-MM-DD. */
export function weekOf(iso: string): string {
  const d = new Date(iso);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back)).toISOString().slice(0, 10);
}

/** The last `count` weeks, this one included, oldest first, each with its tally. */
export function byWeek(facts: readonly PlusFact[], now: Date, count = 12): ({ week: string } & PlusTally)[] {
  const thisWeek = weekOf(now.toISOString());
  const weeks = Array.from({ length: count }, (_, i) =>
    new Date(Date.parse(thisWeek) - (count - 1 - i) * 7 * DAY_MS).toISOString().slice(0, 10),
  );
  const at = new Map(weeks.map((w) => [w, empty()]));
  for (const f of facts) {
    const t = at.get(weekOf(f.event_at));
    if (t) add(t, f);
  }
  return weeks.map((week) => ({ week, ...(at.get(week) as PlusTally) }));
}

/**
 * The last `count` UTC days, today included, oldest first: what came in each
 * day after the store. `only` keeps some events and not others (Home counts
 * the app stores alone, because Stripe's ledger already holds the website's).
 */
export function byDay(
  facts: readonly PlusFact[],
  now: Date,
  count = 30,
  only: (f: PlusFact) => boolean = () => true,
): { day: string; grossCents: number; afterStoreCents: number }[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Array.from({ length: count }, (_, i) => new Date(today - (count - 1 - i) * DAY_MS).toISOString().slice(0, 10));
  const at = new Map(days.map((d) => [d, { grossCents: 0, afterStoreCents: 0 }]));
  for (const f of facts) {
    const d = at.get(utcDay(f.event_at));
    if (!d || !only(f)) continue;
    d.grossCents += grossCents(f);
    d.afterStoreCents += afterStoreCents(f);
  }
  return days.map((day) => ({ day, ...(at.get(day) as { grossCents: number; afterStoreCents: number }) }));
}

/**
 * The members in a free trial now: each member's latest real event is in a
 * trial period that has not run out. They have Plus and pay nothing yet, so
 * the admin stops counting them as paying (lib/entitlements/adminStats.ts).
 * A trial that was turned off is still a trial until it ends.
 */
export function inTrialNow(facts: readonly PlusFact[], now: Date): Set<string> {
  const latest = new Map<string, PlusFact>();
  for (const f of facts) {
    if (!f.user_id || !counts(f)) continue;
    const seen = latest.get(f.user_id);
    if (!seen || Date.parse(f.event_at) > Date.parse(seen.event_at)) latest.set(f.user_id, f);
  }
  const trial = new Set<string>();
  for (const [user, f] of latest) {
    if (f.period_type === "TRIAL" && f.type !== "EXPIRATION" && f.expires_at && Date.parse(f.expires_at) > now.getTime()) trial.add(user);
  }
  return trial;
}

/** Events set aside: test money and grants, so his own test purchases can be seen to arrive. */
export function setAside(facts: readonly PlusFact[]): { test: number; grants: number } {
  let test = 0;
  let grants = 0;
  for (const f of facts) {
    if (isTestMoney(f)) test += 1;
    else if (isGrant(f)) grants += 1;
  }
  return { test, grants };
}

/**
 * Home's daily takings with Plus from the app stores added (the overview
 * route): `series` is one figure a UTC day, oldest first, ending today, from
 * Stripe's ledger or the shop's books, neither of which holds Plus bought
 * through Google Play or the App Store. Each day from the first kept event on
 * gains that day's store Plus after the store's share; a day before it was
 * not kept and gains nothing. Website Plus is left out: Stripe's ledger has
 * it. Returns a new series and what was added.
 */
export function withStorePlus(
  series: readonly number[],
  facts: readonly PlusFact[],
  since: string,
  now: Date,
): { series: number[]; todayCents: number; addedCents: number } {
  const firstDay = utcDay(since);
  const days = byDay(facts, now, series.length, (f) => !isWebStore(f.store));
  let addedCents = 0;
  const out = series.map((v, i) => {
    const d = days[i];
    if (!d || d.day < firstDay) return v;
    addedCents += d.afterStoreCents;
    return v + d.afterStoreCents;
  });
  const last = days[days.length - 1];
  return { series: out, todayCents: last && last.day >= firstDay ? last.afterStoreCents : 0, addedCents };
}
