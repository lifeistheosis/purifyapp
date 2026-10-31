import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import {
  buildFunnel,
  medianStageHours,
  type FunnelOrder,
  type StageEvent,
} from "@/lib/shop/funnel";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageAllIn, pageAllSettled } from "@/lib/supabase/pageAll";
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
  currency: string | null;
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
        "id, payment_status, fulfillment_status, total_cents, currency, created_at, updated_at, paid_at, email, shipping_address, outbound_tracking, inbound_tracking, supplier_order_status, stripe_payment_intent, store:shop_stores(public_name, slug), items:shop_order_items(title, quantity, unit_price_cents, product_id)",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    // 90 days of moves is enough to say how long a stage takes without
    // reading the whole history every time the tab opens. In pages: one
    // request stops at 1,000 rows whatever .limit() asks for, and oldest
    // first that drops the newest moves, so the medians would have been
    // taken from the start of the window and gone on reading as all of it.
    pageAllSettled<StageEvent>((from, to) =>
      admin
        .from("shop_order_events")
        .select("order_id, from_status, to_status, at")
        .gte("at", new Date(Date.now() - 90 * 86_400_000).toISOString())
        .order("at", { ascending: true })
        .order("id")
        .range(from, to),
    ),
  ]);

  if (ordersRead.error) {
    return NextResponse.json({ error: ordersRead.error.message }, { status: 500 });
  }
  const orders = (ordersRead.data ?? []) as unknown as FunnelRow[];
  const events = eventsRead.data ?? [];
  const now = new Date();

  // Supplier links, so a "needs sourcing" row can be acted on without
  // leaving the screen. Same side map the orders route builds, with the cost
  // (Orders' money card: what the pieces cost on Temu today), the piece's
  // first photo (the list and the parcel show it) and its stock count (the
  // reship note says what is on hand).
  const productIds = [
    ...new Set(orders.flatMap((o) => (o.items ?? []).map((i) => i.product_id).filter(Boolean))),
  ] as string[];
  const supplierByProduct: Record<string, { url: string | null; sku: string | null; cost: number | null }> = {};
  const imageByProduct: Record<string, string> = {};
  const stockByProduct: Record<string, number | null> = {};
  if (productIds.length > 0) {
    const [sourcingRead, mediaRead, stockRead] = await Promise.all([
      pageAllIn<{ product_id: string; supplier_url: string | null; supplier_sku: string | null; supplier_cost_cents: number | null }>(
        productIds,
        (some, from, to) =>
          admin
            .from("shop_product_sourcing")
            .select("product_id, supplier_url, supplier_sku, supplier_cost_cents")
            .in("product_id", some)
            .order("product_id")
            .range(from, to),
      ).catch(() => []),
      pageAllIn<{ product_id: string; media_url: string; sort_order: number | null; is_primary: boolean | null }>(
        productIds,
        (some, from, to) =>
          admin
            .from("shop_product_media")
            .select("product_id, media_url, sort_order, is_primary")
            .in("product_id", some)
            .order("id")
            .range(from, to),
      ).catch(() => []),
      pageAllIn<{ id: string; quantity_available: number | null }>(productIds, (some, from, to) =>
        admin.from("shop_products").select("id, quantity_available").in("id", some).order("id").range(from, to),
      ).catch(() => []),
    ]);
    for (const r of sourcingRead) {
      supplierByProduct[r.product_id] = { url: r.supplier_url, sku: r.supplier_sku, cost: r.supplier_cost_cents };
    }
    // The primary photo, else the first by its order: the shop's own rule.
    const best = new Map<string, { url: string; rank: number }>();
    for (const m of mediaRead) {
      const rank = (m.is_primary ? -1_000_000 : 0) + (m.sort_order ?? 0);
      const cur = best.get(m.product_id);
      if (!cur || rank < cur.rank) best.set(m.product_id, { url: m.media_url, rank });
    }
    for (const [id, m] of best) imageByProduct[id] = m.url;
    for (const p of stockRead) stockByProduct[p.id] = p.quantity_available;
  }

  // Each listed order's own moves, for the dates under its eight stages. Only
  // the window read above, so an order older than it shows its stages without
  // dates rather than with wrong ones.
  const listed = new Set(orders.map((o) => o.id));
  const eventsByOrder: Record<string, { to_status: string; at: string }[]> = {};
  for (const e of events) {
    if (!listed.has(e.order_id)) continue;
    (eventsByOrder[e.order_id] ??= []).push({ to_status: e.to_status, at: e.at });
  }

  return NextResponse.json(
    {
      funnel: buildFunnel(orders, now),
      medians: medianStageHours(events) as Partial<Record<ShopFulfillmentStatus, number>>,
      orders,
      supplierByProduct,
      imageByProduct,
      stockByProduct,
      eventsByOrder,
      /** False when 20260920000000_order_events.sql has not been applied yet. */
      historyReady: !eventsRead.error,
      at: now.toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
