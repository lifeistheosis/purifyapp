import { NextResponse } from "next/server";

import { rateLimited } from "@/lib/security/ratelimit";
import { shopSellerOrderUpdateSchema } from "@/lib/security/schemas";
import { shopEnabled } from "@/lib/shop/flags";
import { getSellerContext } from "@/lib/shop/seller";
import {
  sellerCanTransition,
  transitionNeedsTracking,
} from "@/lib/shop/sellerOrders";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Seller order management: move fulfillment forward, attach tracking.
 * The transition map is the law here — anything it doesn't allow is a
 * 409, and cancelling a PAID order is refused outright: paid money only
 * ever moves through the refund pipeline, so an order can never read
 * "cancelled" while the buyer's card was kept.
 */
export async function PATCH(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }

  const ctx = await getSellerContext();
  if (ctx.state !== "seller") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (ctx.seller.status !== "active") {
    return NextResponse.json(
      { error: "Your seller account is not active." },
      { status: 403 },
    );
  }
  if (await rateLimited(`shop-seller-order:${ctx.userId}`, 3600, 240)) {
    return NextResponse.json(
      { error: "Too many updates. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = shopSellerOrderUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { orderId, fulfillmentStatus, tracking } = parsed.data;

  // Read with the seller's own client: RLS only returns their orders.
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("shop_orders")
    .select("id, seller_id, payment_status, fulfillment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.seller_id !== ctx.seller.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (!sellerCanTransition(order.fulfillment_status, fulfillmentStatus)) {
    return NextResponse.json(
      { error: `Can't move this order from "${order.fulfillment_status}" to "${fulfillmentStatus}".` },
      { status: 409 },
    );
  }
  if (fulfillmentStatus === "cancelled" && order.payment_status === "paid") {
    return NextResponse.json(
      { error: "This order is paid. Refund it instead of cancelling." },
      { status: 409 },
    );
  }
  if (transitionNeedsTracking(fulfillmentStatus) && !tracking?.trim()) {
    return NextResponse.json(
      { error: "Add a tracking number to mark this order shipped." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("shop_orders")
    .update({
      fulfillment_status: fulfillmentStatus,
      ...(tracking?.trim() ? { outbound_tracking: tracking.trim() } : {}),
      ...(fulfillmentStatus === "cancelled"
        ? { payment_status: "cancelled" }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    // Guard against a concurrent update having moved the order already.
    .eq("fulfillment_status", order.fulfillment_status);
  if (error) {
    console.warn("[shop] seller order update failed", error.message);
    return NextResponse.json(
      { error: "Couldn't update the order. Please try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
