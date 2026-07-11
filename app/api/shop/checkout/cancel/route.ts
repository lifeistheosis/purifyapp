import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { shopEnabled } from "@/lib/shop/flags";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cancel an abandoned checkout. Stripe's cancel link and the "Remove"
 * action on an unfinished checkout both land here. Deliberately works
 * without a session: guests check out too, and the Stripe cancel page
 * opens in a browser context that may not carry the app's cookies. That
 * is safe because the ONLY reachable transition is pending -> cancelled
 * for an order identified by its unguessable UUID, and the Stripe
 * session is expired FIRST so a cancelled order can never be paid
 * afterwards. If Stripe reports the session already completed, we
 * refuse and let the webhook settle it as paid.
 */
const schema = z.object({ orderId: z.string().uuid() });

async function handlePOST(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }
  if (await rateLimited(`shop-cancel:${ipKey(req.headers)}`, 600, 30)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("shop_orders")
    .select("id, payment_status, stripe_session_id")
    .eq("id", parsed.data.orderId)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.payment_status !== "pending") {
    // Paid, refunded, or already cancelled: nothing to do. Idempotent OK
    // so the cancelled page never shows an error for a double-visit.
    return NextResponse.json({ ok: true, status: order.payment_status });
  }

  // Expire the Stripe session BEFORE cancelling so the two can't cross:
  // an expired session cannot be paid. A session that already completed
  // means the money moved; leave the order for the webhook.
  if (order.stripe_session_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(
        order.stripe_session_id,
      );
      if (session.status === "complete") {
        return NextResponse.json(
          { error: "This checkout already completed." },
          { status: 409 },
        );
      }
      if (session.status === "open") {
        await stripe.checkout.sessions.expire(order.stripe_session_id);
      }
    } catch (e) {
      console.warn("[shop] session expire failed", (e as Error).message);
      // Fall through: the order-side guard below still requires 'pending',
      // and the webhook's own pending-only update keeps a late payment safe.
    }
  }

  const { error } = await admin
    .from("shop_orders")
    .update({
      payment_status: "cancelled",
      fulfillment_status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("payment_status", "pending");
  if (error) {
    console.warn("[shop] checkout cancel failed", error.message);
    return NextResponse.json({ error: "Couldn't cancel." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status: "cancelled" });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
