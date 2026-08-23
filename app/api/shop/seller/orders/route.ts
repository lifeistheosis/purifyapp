import { NextResponse } from "next/server";

import { rateLimited } from "@/lib/security/ratelimit";
import { shopSellerOrderUpdateSchema } from "@/lib/security/schemas";
import { shopEnabled } from "@/lib/shop/flags";
import { getSellerContext } from "@/lib/shop/seller";
import {
  sellerCanTransition,
  transitionNeedsTracking,
} from "@/lib/shop/sellerOrders";
import {
  canCancelPayment,
  cancelRefusalMessage,
  guardedOrderUpdate,
  staleOrderMessage,
  type OrderWriteDb,
} from "@/lib/shop/orderWrite";
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
  // An ALLOW-list. This tested only for "paid", so a REFUNDED order passed
  // straight through and had its refund record stamped over with "cancelled".
  // A payment_status added to the schema later is now refused by default
  // rather than silently permitted.
  if (fulfillmentStatus === "cancelled" && !canCancelPayment(order.payment_status)) {
    return NextResponse.json(
      { error: cancelRefusalMessage(order.payment_status) },
      { status: 409 },
    );
  }
  if (transitionNeedsTracking(fulfillmentStatus) && !tracking?.trim()) {
    return NextResponse.json(
      { error: "Add a tracking number to mark this order shipped." },
      { status: 400 },
    );
  }

  const admin = createAdminClient() as unknown as OrderWriteDb;
  const result = await guardedOrderUpdate(
    admin,
    order.id,
    // Compare and swap on BOTH status columns, and payment_status is the one
    // that matters. The settlement webhook writes payment_status and never
    // fulfillment_status, so the old fulfillment-only guard could never
    // invalidate when a payment landed between the read above and this write:
    // it matched happily and stamped "cancelled" over "paid".
    //
    // Forward transitions are guarded on payment_status too, which turns a
    // currently harmless race into a 409. That is deliberate: one code path
    // and one test beats two, and the refusal names the state it found, so
    // the retry is a reload and a click.
    {
      payment_status: order.payment_status,
      fulfillment_status: order.fulfillment_status,
    },
    {
      fulfillment_status: fulfillmentStatus,
      ...(tracking?.trim() ? { outbound_tracking: tracking.trim() } : {}),
      ...(fulfillmentStatus === "cancelled" ? { payment_status: "cancelled" } : {}),
      updated_at: new Date().toISOString(),
    },
  );
  if (!result.ok && result.reason === "error") {
    console.warn("[shop] seller order update failed", result.message);
    return NextResponse.json(
      { error: "Couldn't update the order. Please try again." },
      { status: 500 },
    );
  }
  if (!result.ok) {
    if (!result.found) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    console.warn(
      `[shop] seller order update lost a race order=${order.id} expected='${order.payment_status}/${order.fulfillment_status}' found='${result.found.payment_status}/${result.found.fulfillment_status}'`,
    );
    return NextResponse.json(
      { error: staleOrderMessage(result.found), found: result.found },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, order: result.row });
}
