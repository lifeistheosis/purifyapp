import { NextResponse } from "next/server";

import { sendOrderConfirmationEmail } from "@/lib/shop/orderEmails";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook: flips orders to 'paid' when a Checkout Session
 * completes, and records the shipping address Stripe collected. The
 * signature is verified with STRIPE_WEBHOOK_SECRET; with the secret
 * unset (checkout dark) the endpoint answers 503 and does nothing, so
 * it can be deployed ahead of the Stripe account without risk.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }
  const payload = await req.text();

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(key);

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId =
      session.client_reference_id ?? session.metadata?.order_id ?? null;
    if (orderId) {
      const admin = createAdminClient();
      const shipping =
        session.collected_information?.shipping_details ?? null;
      const { data: updated, error } = await admin
        .from("shop_orders")
        .update({
          payment_status: "paid",
          email: session.customer_details?.email ?? undefined,
          shipping_address: shipping ?? null,
          // Recorded so a refund can be issued later without a second
          // round-trip to Stripe to rediscover what was charged.
          stripe_payment_intent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("payment_status", "pending")
        .select("id, email, total_cents, currency")
        .maybeSingle();
      if (error) {
        console.warn("[shop] webhook order update failed", error.message);
        // 500 so Stripe retries; the update is idempotent.
        return NextResponse.json({ error: "Update failed." }, { status: 500 });
      }
      // `updated` is null on a webhook retry (the row was already paid), so the
      // confirmation email + units-sold bump fire exactly once. Neither must
      // fail the webhook — Stripe would retry a delivered order.
      if (updated) {
        // Units sold: incremented once, here, on pending -> paid.
        await admin
          .rpc("shop_increment_units_sold", { p_order_id: updated.id })
          .then(({ error: incErr }) => {
            if (incErr)
              console.warn("[shop] units_sold increment failed", incErr.message);
          });

        const { data: items } = await admin
          .from("shop_order_items")
          .select("title, quantity, unit_price_cents")
          .eq("order_id", updated.id);
        await sendOrderConfirmationEmail({
          id: updated.id,
          email: updated.email,
          total_cents: updated.total_cents,
          currency: updated.currency,
          items: items ?? [],
        }).catch((e) =>
          console.warn("[shop] confirmation email failed", (e as Error).message),
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
