import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import {
  buildFunnel,
  medianStageHours,
  type FunnelOrder,
  type StageEvent,
} from "@/lib/shop/funnel";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ShopFulfillmentStatus } from "@/lib/shop/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The fulfillment funnel: where paid orders are sitting, what they are worth,
 * what is late, and how long each stage really takes.
 *
 * One read of the orders, one of the moves (shop_order_events). The shape is
 * computed by lib/shop/funnel.ts so the numbers on the screen come from the
 * same fold the tests exercise.
 *
 * It carries the buyer's address and email, because the whole point of the
 * screen is to pack and post the thing. Admin only, never cached.
 */

export type FunnelRow = FunnelOrder & {
  email: string | null;
  shipping_address: unknown;
  outbound_tracking: string | null;
  inbound_tracking: string | null;
  supplier_order_status: string | null;
  stripe_payment_intent: string | null;
  store: { public_name: string | null; slug: string } | null;
  items: { title: string; quantity: number; unit_price_cents: number; product_id: string | null }[];
};

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const [ordersRead, eventsRead] = await Promise.all([
    admin
      .from("shop_orders")
      .select(
        "id, payment_status, fulfillment_status, total_cents, created_at, updated_at, paid_at, email, shipping_address, outbound_tracking, inbound_tracking, supplier_order_status, stripe_payment_intent, store:shop_stores(public_name, slug), items:shop_order_items(title, quantity, unit_price_cents, product_id)",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    // 90 days of moves is enough to say how long a stage takes without
    // reading the whole history every time the tab opens.
    admin
      .from("shop_order_events")
      .select("order_id, from_status, to_status, at")
      .gte("at", new Date(Date.now() - 90 * 86_400_000).toISOString())
      .order("at", { ascending: true })
      .limit(5000),
  ]);

  if (ordersRead.error) {
    return NextResponse.json({ error: ordersRead.error.message }, { status: 500 });
  }
  const orders = (ordersRead.data ?? []) as unknown as FunnelRow[];
  const events = (eventsRead.data ?? []) as StageEvent[];
  const now = new Date();

  // Supplier links, so a "needs sourcing" row can be acted on without
  // leaving the screen. Same side map the orders route builds.
  const productIds = [
    ...new Set(orders.flatMap((o) => (o.items ?? []).map((i) => i.product_id).filter(Boolean))),
  ] as string[];
  let supplierByProduct: Record<string, { url: string | null; sku: string | null }> = {};
  if (productIds.length > 0) {
    const { data: rows } = await admin
      .from("shop_product_sourcing")
      .select("product_id, supplier_url, supplier_sku")
      .in("product_id", productIds);
    supplierByProduct = Object.fromEntries(
      ((rows ?? []) as { product_id: string; supplier_url: string | null; supplier_sku: string | null }[]).map(
        (r) => [r.product_id, { url: r.supplier_url, sku: r.supplier_sku }],
      ),
    );
  }

  return NextResponse.json(
    {
      funnel: buildFunnel(orders, now),
      medians: medianStageHours(events) as Partial<Record<ShopFulfillmentStatus, number>>,
      orders,
      supplierByProduct,
      /** False when 20260920_order_events.sql has not been applied yet. */
      historyReady: !eventsRead.error,
      at: now.toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
