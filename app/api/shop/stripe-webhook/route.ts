import { NextResponse } from "next/server";

import { sendOrderConfirmationEmail } from "@/lib/shop/orderEmails";
import {
  settleCheckoutSession,
  type SettlementDb,
} from "@/lib/shop/webhookSettlement";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook: settles orders when a Checkout Session completes. The
 * signature is verified with STRIPE_WEBHOOK_SECRET; with the secret
 * unset (checkout dark) the endpoint answers 503 and does nothing, so
 * it can be deployed ahead of the Stripe account without risk.
 *
 * The money rules (amount verification, payment-wins-over-cancellation,
 * one-time paid effects) live in lib/shop/webhookSettlement.ts, where
 * they are unit-tested with an injected database (audit F-01/F-03).
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
    // The admin client satisfies the settlement's narrow structural type.
    const db = createAdminClient() as unknown as SettlementDb;
    const result = await settleCheckoutSession(
      db,
      sendOrderConfirmationEmail,
      event.data.object,
    );
    if (result === "update-failed") {
      // 500 so Stripe retries; the guarded update is idempotent.
      return NextResponse.json({ error: "Update failed." }, { status: 500 });
    }
    return NextResponse.json({ received: true, result });
  }

  return NextResponse.json({ received: true });
}
