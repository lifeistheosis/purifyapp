import { NextResponse } from "next/server";

import { rateLimited } from "@/lib/security/ratelimit";
import { shopRefundDecisionSchema } from "@/lib/security/schemas";
import { shopEnabled } from "@/lib/shop/flags";
import {
  approveRefundRequest,
  declineRefundRequest,
} from "@/lib/shop/refundExecution";
import { refundCanTransition } from "@/lib/shop/refunds";
import { getSellerContext } from "@/lib/shop/seller";
import { createClient } from "@/lib/supabase/server";

/**
 * Seller refund decisions. Decline records the reasoning; approve
 * moves the money when it can:
 *
 *  - Checkout live + payment intent on file → Stripe refund now, the
 *    request lands 'processed', and the order flips refunded in the
 *    same breath so money and status can't diverge.
 *  - Otherwise the request parks at 'approved' — an honest "we owe
 *    you" state the operator settles manually (test orders, cash-era
 *    orders, Stripe outages). The buyer sees "approved", never a fake
 *    "refunded".
 */
export async function POST(req: Request) {
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
  if (await rateLimited(`shop-seller-refund:${ctx.userId}`, 3600, 60)) {
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
  const parsed = shopRefundDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { refundId, decision, note } = parsed.data;

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("shop_refund_requests")
    .select("id, order_id, status")
    .eq("id", refundId)
    .maybeSingle();
  if (!request) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  // The row being visible isn't enough (the caller might be its buyer);
  // the order must belong to THIS seller.
  const { data: order } = await supabase
    .from("shop_orders")
    .select("id, seller_id, payment_status, total_cents, stripe_payment_intent")
    .eq("id", request.order_id)
    .maybeSingle();
  if (!order || order.seller_id !== ctx.seller.id) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  if (!refundCanTransition("seller", request.status, decision)) {
    return NextResponse.json(
      { error: "This request has already been decided." },
      { status: 409 },
    );
  }

  if (decision === "declined") {
    const ok = await declineRefundRequest(request.id, note ?? null);
    if (!ok) {
      return NextResponse.json({ error: "Couldn't save the decision." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: "declined" });
  }

  const status = await approveRefundRequest(
    request.id,
    {
      id: order.id,
      total_cents: order.total_cents,
      stripe_payment_intent: order.stripe_payment_intent,
    },
    note ?? null,
  );
  if (!status) {
    return NextResponse.json({ error: "Couldn't save the decision." }, { status: 500 });
  }
  // A lost race is not a success. approveRefundRequest now claims the request
  // BEFORE it spends, so the loser never reached Stripe and no money moved;
  // reporting ok:true here would tell the decider their refund went out.
  if (status === "already-decided") {
    return NextResponse.json(
      { error: "This request was already decided by someone else. Reload to see where it stands." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, status });
}
