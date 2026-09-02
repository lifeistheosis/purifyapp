import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
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
  ]);

  const orders30 = (recentOrdersRes.data ?? []) as {
    id: string;
    total_cents: number;
    payment_status: "pending" | "paid" | "refunded" | "cancelled";
    email: string | null;
    created_at: string;
  }[];

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
      ordersTotal: counts.count ?? 0,
      ordersPaid: paidCount.count ?? 0,
      ordersPending: pendingCount.count ?? 0,
      ordersCancelled: cancelledCount.count ?? 0,
      newUsers30: newUsers.count ?? 0,
      paidPlus,
      paidPro,
      comped,
      recent,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
