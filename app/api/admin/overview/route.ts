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

  const [recentOrdersRes, counts, pendingCount, newUsers, subs] =
    await Promise.all([
      // Orders in the last 30d for the revenue series + recent strip.
      admin
        .from("shop_orders")
        .select("id, total_cents, payment_status, email, created_at")
        .gte("created_at", since30)
        .order("created_at", { ascending: false })
        .limit(1000),
      admin.from("shop_orders").select("id", { count: "exact", head: true }),
      admin
        .from("shop_orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "pending"),
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

  return NextResponse.json(
    {
      revenueTodayCents,
      revenue30Cents,
      revenueSeries: series,
      ordersTotal: counts.count ?? 0,
      ordersPending: pendingCount.count ?? 0,
      newUsers30: newUsers.count ?? 0,
      activePlus: subs.activePlus,
      activePro: subs.activePro,
      recent,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
