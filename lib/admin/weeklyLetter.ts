import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { adminEmails } from "@/lib/admin/access";
import { withoutOwnTestOrders } from "@/lib/admin/testOrders";
import { isLetterDay, lastWeek, letterHtml, letterSubject, type Pair, type WeekFigures, type WeekWindow } from "@/lib/admin/weekly";
import { LOCK_EVENTS, LOCK_LABELS, summarizeLocks, type LockEventRow } from "@/lib/analytics/lockCounting";
import { getProjectMetrics, getRevenueBetween } from "@/lib/billing/revenuecatMetrics";
import { subscriptionStats } from "@/lib/entitlements/adminStats";
import { emailLayout } from "@/lib/email/layout";
import { sendEmailOnce } from "@/lib/email/ledger";
import { estimatedMrrCents } from "@/lib/premium/mrr";
import { keptCents, paidTotals, refundsByOrder } from "@/lib/shop/partialRefunds";
import { SITE_URL } from "@/lib/site";
import { pageAllSettled } from "@/lib/supabase/pageAll";

/**
 * Reads last week's figures and sends the Monday email (lib/admin/weekly.ts
 * says what it is and why). Called by the maintenance heartbeat
 * (lib/ops/maintenance.ts) on Mondays from the morning email's hour; keyed
 * `weekly_letter:<Monday>` in the email log, so it goes once a week however
 * often the heartbeat calls.
 *
 * Every read stands alone: one that fails leaves its figure "not read" and
 * the letter goes with the rest. Only a failure of the email itself is a
 * failure here.
 */

type DayRow = { day: string; visitors: number | string; views: number | string; signups: number | string };

const sum = (rows: DayRow[], from: string, through: string, k: "visitors" | "views" | "signups") =>
  rows.filter((r) => {
    const d = String(r.day).slice(0, 10);
    return d >= from && d <= through;
  }).reduce((a, r) => a + (Number(r[k]) || 0), 0);

/** Visitors, page views and accounts, both weeks, from the same function Traffic counts with. */
async function readTraffic(admin: SupabaseClient, w: WeekWindow): Promise<Pick<WeekFigures, "visitors" | "views" | "signups">> {
  try {
    const { data, error } = await admin.rpc("analytics_daily_buckets", {
      p_since: `${w.priorStart}T00:00:00.000Z`,
      p_days: 14,
    });
    if (error || !Array.isArray(data)) return { visitors: null, views: null, signups: null };
    const rows = data as DayRow[];
    const pair = (k: "visitors" | "views" | "signups"): Pair => ({
      now: sum(rows, w.start, w.end, k),
      before: sum(rows, w.priorStart, w.priorEnd, k),
    });
    return { visitors: pair("visitors"), views: pair("views"), signups: pair("signups") };
  } catch {
    return { visitors: null, views: null, signups: null };
  }
}

type OrderRow = { id: string; email: string | null; total_cents: number; payment_status: string; created_at: string; paid_at: string | null };

/** The shop, both weeks: paid orders on the day their money landed, less refunds. */
async function readShop(admin: SupabaseClient, w: WeekWindow): Promise<WeekFigures["shop"]> {
  const from = `${w.priorStart}T00:00:00.000Z`;
  const to = `${w.next}T00:00:00.000Z`;
  const res = await pageAllSettled((a, b) =>
    admin
      .from("shop_orders")
      .select("id, email, total_cents, payment_status, created_at, paid_at")
      .in("payment_status", ["paid", "refunded"])
      .or(`and(paid_at.gte."${from}",paid_at.lt."${to}"),and(paid_at.is.null,created_at.gte."${from}",created_at.lt."${to}")`)
      .order("id")
      .range(a, b),
  );
  if (res.error) return null;
  // His own test orders are no sale (his item 54, lib/admin/testOrders.ts).
  const orders = withoutOwnTestOrders(res.data as OrderRow[]);
  const refunds = await refundsByOrder(admin, paidTotals(orders));
  if (!refunds) return null;
  const inWeek = (o: OrderRow, start: string, end: string) => {
    const d = (o.paid_at ?? o.created_at).slice(0, 10);
    return d >= start && d <= end;
  };
  const tally = (start: string, end: string) => {
    const these = orders.filter((o) => inWeek(o, start, end));
    return {
      cents: these.reduce((a, o) => a + keptCents(o, refunds), 0),
      orders: these.filter((o) => o.payment_status === "paid").length,
    };
  };
  const now = tally(w.start, w.end);
  const before = tally(w.priorStart, w.priorEnd);
  return { cents: { now: now.cents, before: before.cents }, orders: { now: now.orders, before: before.orders } };
}

/** Plus: RevenueCat's revenue and counts when it answers; members at list price otherwise. */
async function readPlus(admin: SupabaseClient, w: WeekWindow): Promise<WeekFigures["plus"]> {
  const [real, thisWeek, weekBefore, stats] = await Promise.all([
    getProjectMetrics(),
    getRevenueBetween(w.start, w.end),
    getRevenueBetween(w.priorStart, w.priorEnd),
    subscriptionStats(admin).catch(() => null),
  ]);
  if (!real && !stats) return null;
  return {
    paidCents:
      thisWeek && weekBefore
        ? { now: Math.round(thisWeek.value * 100), before: Math.round(weekBefore.value * 100) }
        : null,
    paying: real ? real.activeSubscriptions : stats ? stats.paidPlus : null,
    trials: real ? real.activeTrials : null,
    mrrCents: real ? Math.round(real.mrr * 100) : stats ? estimatedMrrCents(stats.paidCounts) : null,
    source: real ? "revenuecat" : "estimate",
  };
}

/** The locks met in the week and the purchases that followed (lib/analytics/lockCounting.ts). */
async function readLocks(admin: SupabaseClient, w: WeekWindow): Promise<WeekFigures["locks"]> {
  const res = await pageAllSettled((a, b) =>
    admin
      .from("analytics_events")
      .select("name, props")
      .in("name", [...LOCK_EVENTS])
      .gte("ts", `${w.start}T00:00:00.000Z`)
      .lt("ts", `${w.next}T00:00:00.000Z`)
      .order("ts", { ascending: true })
      .order("id", { ascending: true })
      .range(a, b),
  );
  if (res.error) return null;
  const s = summarizeLocks(res.data as LockEventRow[]);
  const top = [...s.locks]
    .sort((a, b) => b.taps - a.taps || b.bought - a.bought)
    .filter((r) => r.taps > 0)
    .slice(0, 3)
    .map((r) => ({ name: LOCK_LABELS[r.lock], taps: r.taps, bought: r.bought }));
  return { top, taps: s.taps, bought: s.bought };
}

/** A HEAD count, or null when it could not be taken. */
async function headCount(q: PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> {
  try {
    const { count, error } = await q;
    return error ? null : (count ?? 0);
  } catch {
    return null;
  }
}

/** Orders paid and not yet on their way: every stage before shipped. */
const TO_POST = [
  "pending",
  "supplier_order_needed",
  "supplier_order_placed",
  "inbound_to_eikon",
  "received_for_inspection",
  "packaged",
];

async function readWaiting(admin: SupabaseClient): Promise<WeekFigures["waiting"]> {
  const [messages, refunds, toPost] = await Promise.all([
    headCount(admin.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open")),
    headCount(admin.from("shop_refund_requests").select("id", { count: "exact", head: true }).eq("status", "requested")),
    headCount(
      admin
        .from("shop_orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "paid")
        .in("fulfillment_status", TO_POST),
    ),
  ]);
  return { messages, refunds, toPost };
}

/** Every figure for the week, each read on its own. Exported for the tests. */
export async function readWeek(admin: SupabaseClient, w: WeekWindow): Promise<WeekFigures> {
  const [traffic, shop, plus, locks, waiting] = await Promise.all([
    readTraffic(admin, w),
    readShop(admin, w).catch(() => null),
    readPlus(admin, w).catch(() => null),
    readLocks(admin, w).catch(() => null),
    readWaiting(admin),
  ]);
  return { ...traffic, shop, plus, locks, waiting };
}

export type WeeklyLetterResult = { sent: boolean; reason: string; week?: string };

/**
 * Sends last week's letter when today is Monday (UTC) and it has not gone yet.
 * `force` skips the Monday check, for a send from the admin by hand; the email
 * log still lets each week's letter go once.
 */
export async function sendWeeklyLetter(
  admin: SupabaseClient,
  now: Date = new Date(),
  opts: { force?: boolean } = {},
): Promise<WeeklyLetterResult> {
  if (!opts.force && !isLetterDay(now)) return { sent: false, reason: "not Monday" };
  const to = adminEmails()[0];
  if (!to) return { sent: false, reason: "ADMIN_EMAILS unset" };

  const w = lastWeek(now);
  const figures = await readWeek(admin, w);
  const result = await sendEmailOnce(admin, {
    dedupeKey: `weekly_letter:${w.next}`,
    kind: "weekly_letter",
    userId: null,
    to,
    subject: letterSubject(w, figures),
    html: emailLayout({
      heading: "Your week",
      deck: w.label,
      bodyHtml: letterHtml(w, figures, `${SITE_URL}/admin`),
      eyebrow: "Purify",
      footer: "You are getting this because your address is first in ADMIN_EMAILS. It comes on Mondays.",
    }),
  });
  return { sent: result.status === "sent", reason: result.status, week: w.label };
}
