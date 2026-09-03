import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { staleCounts } from "@/lib/admin/attentionOrders";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscriptionStats } from "@/lib/entitlements/adminStats";

export const dynamic = "force-dynamic";

/**
 * Commerce-first overview: the money and account KPIs the owner wants at a
 * glance. Revenue is realized shop revenue (paid, net of refunds); the
 * traffic sparkline comes from /api/admin/traffic (the client already has
 * it). Subscriptions reuse lib/entitlements/adminStats.
 */
/** One page of rows. Supabase caps a single request well below a busy month. */
const PAGE = 1000;
/** A backstop so a pathological range cannot loop for ever. 50k orders. */
const MAX_PAGES = 50;

type OrderRow = {
  id: string;
  total_cents: number;
  payment_status: string;
  email: string | null;
  created_at: string;
};

/**
 * Every order in the window, not the first thousand.
 *
 * Returns the same { data } shape the destructured Promise.all expects, so the
 * call site reads identically to the other queries beside it.
 */
async function pageOrders(
  admin: ReturnType<typeof createAdminClient>,
  since: string,
): Promise<{ data: OrderRow[]; failed: boolean }> {
  const out: OrderRow[] = [];
  // FAILURE IS REPORTED, NOT MERGED INTO "EMPTY". The break below treated a
  // PostgREST error on page 0 exactly like an empty table, so the route went
  // on to publish $0 revenue and a flat 30-day sparkline at HTTP 200, under a
  // banner that reads "Every number in this row is measured, never modelled."
  //
  // A whole-database failure already takes this route to a 500, because
  // subscriptionStats() throws by design in the same Promise.all. What was
  // left uncovered is a shop_orders-specific failure, where zero is a claim
  // rather than a measurement.
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await admin
      .from("shop_orders")
      .select("id, total_cents, payment_status, email, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) {
      console.warn("[admin/overview] shop_orders read failed", error.message);
      return { data: out, failed: true };
    }
    if (!data || data.length === 0) break;
    out.push(...(data as OrderRow[]));
    if (data.length < PAGE) break;
  }
  return { data: out, failed: false };
}

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const now = new Date();
  const dayMs = 86_400_000;
  const since30 = new Date(now.getTime() - 30 * dayMs).toISOString();
  const startOfTodayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();

  const orderCount = (status?: string) => {
    let q = admin.from("shop_orders").select("id", { count: "exact", head: true });
    if (status) q = q.eq("payment_status", status);
    return q;
  };

  const [
    recentOrdersRes,
    counts,
    paidCount,
    pendingCount,
    cancelledCount,
    newUsers,
    subs,
    lastHookRes,
    lastReconcileRes,
  ] = await Promise.all([
    // Orders in the last 30d for the revenue series + recent strip.
    //
    // PAGED, not capped. This was .limit(1000) newest-first, which is the worst
    // possible truncation for a daily series: the rows dropped are the OLDEST,
    // so the earliest days of the window quietly read zero and render as real
    // days on which nothing sold. A cap that loses the newest rows would at
    // least look wrong; this one looked like a bad fortnight.
    //
    // Ascending here so a partial read, if one ever happened, would lose the
    // most recent days rather than the oldest, which is the failure an operator
    // would actually notice.
    pageOrders(admin, since30),
    orderCount(),
    orderCount("paid"),
    orderCount("pending"),
    orderCount("cancelled"),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("joined_at", since30),
    subscriptionStats(admin),
    // WHEN DID STRIPE LAST CALL, and when did a reconcile last run.
    //
    // These two answers are what turn "31 pending orders" from a queue into a
    // question. A pending order older than Stripe's 24h session lifetime is
    // paid-and-unrecorded or abandoned, never mid-checkout; which of the two
    // depends on whether the webhook has been arriving, and whether anyone
    // has asked Stripe since. lib/admin/attentionOrders.ts does the counting
    // and lib/admin/attention.ts the judging; this route only supplies the
    // two timestamps, from data it did not previously read.
    //
    // Both limit 1. The webhook read is fully index-covered by
    // admin_activity_log_actor_idx (actor_email, created_at desc). The
    // reconcile read is NOT: admin_activity_log_entity_idx is (entity_type,
    // entity_id, created_at desc), and with entity_id unpinned the index
    // cannot serve ORDER BY created_at, so Postgres scans the shop_orders
    // rows under that prefix (every webhook delivery is one) and sorts. At
    // this shop's volume that is hundreds of rows on a 30s poll, which is
    // fine; the durable fix is an (action, created_at desc) index, which is a
    // migration and therefore the owner's call:
    //
    //   create index if not exists admin_activity_log_action_idx
    //     on public.admin_activity_log (action, created_at desc);
    //
    // Note the cadence: this hook asks for 60s, but two other subscribers ask
    // for 30s and the store runs at the shortest, so 30s is what these cost.
    //
    // They resolve rather than reject on an absent table (42P01), which is
    // the state production was in on 2026-09-01, so the destructure below
    // carries the error rather than letting a missing log look like a silent
    // Stripe.
    admin
      .from("admin_activity_log")
      .select("created_at")
      .eq("actor_email", "stripe-webhook")
      .eq("action", "shop.webhook")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ created_at: string }>(),
    admin
      .from("admin_activity_log")
      .select("created_at")
      .eq("entity_type", "shop_orders")
      .eq("action", "shop.reconcile")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ created_at: string }>(),
  ]);

  const orders30 = (recentOrdersRes.data ?? []) as {
    id: string;
    total_cents: number;
    payment_status: "pending" | "paid" | "refunded" | "cancelled";
    email: string | null;
    created_at: string;
  }[];

  // The webhook log, read honestly. An error here is "cannot tell", never
  // "Stripe never called": the reconcile card learned that the hard way when
  // an absent table produced a red instruction to re-point a working webhook.
  const hookErr = lastHookRes.error;
  const lastWebhookLogReadable = !hookErr;
  const lastWebhookLogMissing = hookErr?.code === "42P01" || hookErr?.code === "42703";
  const lastWebhookAt = lastWebhookLogReadable ? (lastHookRes.data?.created_at ?? null) : null;
  const lastReconcileAt = lastReconcileRes.error ? null : (lastReconcileRes.data?.created_at ?? null);

  // Stale and unchecked pending orders, from the page already in hand plus
  // the pending count already taken. Null when either could not be read: a
  // staleness figure built on a failed page would be a claim, and
  // ordersDegraded below already says the money is unmeasured.
  const stale =
    recentOrdersRes.failed || pendingCount.error
      ? null
      : staleCounts(orders30, pendingCount.count ?? 0, now.getTime(), lastReconcileAt);

  const isRevenue = (s: string) => s === "paid" || s === "refunded";
  const net = (o: { total_cents: number; payment_status: string }) =>
    o.payment_status === "refunded" ? 0 : o.total_cents;

  // 30-point daily net series (oldest → newest) for the KPI sparkline.
  const series: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * dayMs);
    const key = dayStart.toISOString().slice(0, 10);
    const dayNet = orders30
      .filter((o) => isRevenue(o.payment_status) && o.created_at.slice(0, 10) === key)
      .reduce((a, o) => a + net(o), 0);
    series.push(dayNet);
  }

  const revenue30Cents = orders30
    .filter((o) => isRevenue(o.payment_status))
    .reduce((a, o) => a + net(o), 0);
  const revenueTodayCents = orders30
    .filter((o) => isRevenue(o.payment_status) && o.created_at >= startOfTodayUtc)
    .reduce((a, o) => a + net(o), 0);

  const recent = orders30
    .filter((o) => o.payment_status === "paid")
    .slice(0, 8)
    .map((o) => ({
      id: o.id,
      email: o.email,
      totalCents: o.total_cents,
      createdAt: o.created_at,
    }));

  // Paid subscribers exclude comped accounts (testers/reviewers). Comps are
  // surfaced separately so a comped grant is never mistaken for a sale.
  const paidPlus = subs.paidCounts.plusOnly + subs.paidCounts.pro;
  const paidPro = subs.paidCounts.pro;
  const comped = subs.bySource.comp ?? 0;

  return NextResponse.json(
    {
      // null, not 0, when shop_orders could not be read. Every consumer of
      // these already renders an em dash for a nullish revenue, so a failed
      // read now shows as "not measured" instead of as a day with no sales.
      revenueTodayCents: recentOrdersRes.failed ? null : revenueTodayCents,
      revenue30Cents: recentOrdersRes.failed ? null : revenue30Cents,
      revenueSeries: recentOrdersRes.failed ? [] : series,
      /** True when the order read failed and the money fields are unmeasured. */
      ordersDegraded: recentOrdersRes.failed,
      // null, not 0, when a HEAD count errored. PostgREST answers an error
      // with count: null, and `?? 0` turned "could not count the pending
      // orders" into "there are none", which is the exact shape that hid
      // thirty-one of them. A genuinely empty table still counts 0.
      ordersTotal: counts.error ? null : (counts.count ?? 0),
      ordersPaid: paidCount.error ? null : (paidCount.count ?? 0),
      ordersPending: pendingCount.error ? null : (pendingCount.count ?? 0),
      ordersCancelled: cancelledCount.error ? null : (cancelledCount.count ?? 0),
      newUsers30: newUsers.error ? null : (newUsers.count ?? 0),
      paidPlus,
      paidPro,
      comped,
      recent,
      // The attention strip's inputs. See lib/admin/attention.ts for the rule
      // that turns these into a finding, and attentionOrders.ts for the counts.
      // null, not 0, when the orders page or the pending count could not be
      // read: the client reads null as "staleness not measured" and shows a
      // chip, where 0 would have read as "nothing stale" and cleared it.
      ordersPendingStale: stale ? stale.stale : null,
      ordersPendingUnchecked: stale ? stale.unchecked : null,
      pendingNewestStaleAt: stale?.newestStaleAt ?? null,
      lastWebhookAt,
      lastWebhookLogReadable,
      lastWebhookLogMissing,
      lastReconcileAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
