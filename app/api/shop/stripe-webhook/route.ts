import { NextResponse } from "next/server";

import { sendOrderConfirmationEmail } from "@/lib/shop/orderEmails";
import { applyAccountCapabilities } from "@/lib/shop/payouts";
import {
  settleCheckoutSession,
  type SettlementDb,
} from "@/lib/shop/webhookSettlement";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook. The signature is verified with STRIPE_WEBHOOK_SECRET; with
 * the secret unset (checkout dark) the endpoint answers 503 and does nothing,
 * so it can be deployed ahead of the Stripe account without risk.
 *
 * Two events:
 *
 *   checkout.session.completed  settles an order. The money rules (amount
 *     verification, payment-wins-over-cancellation, one-time paid effects)
 *     live in lib/shop/webhookSettlement.ts, where they are unit-tested with
 *     an injected database (audit F-01/F-03).
 *
 *   account.updated  mirrors a connected account's capabilities. THIS IS THE
 *     ONLY ACCEPTABLE SOURCE for charges_enabled: "we created the account" is
 *     a different fact, days can pass before Stripe clears identity and bank
 *     details, and it revokes capabilities again when a document expires. A
 *     store whose charges are withdrawn stops being routed a destination on
 *     the next checkout without anybody noticing, which is the correct
 *     failure: the alternative is money Stripe will not release.
 *
 * ENABLE account.updated IN THE STRIPE DASHBOARD. The endpoint currently
 * subscribes to checkout.session.completed alone; adding the handler here does
 * not subscribe to anything. Until it is enabled, capability changes are never
 * heard and a newly onboarded store stays stuck at charges_enabled=false.
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

  if (event.type === "account.updated") {
    const account = event.data.object;
    const result = await applyAccountCapabilities(account.id, {
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
    });
    if (result === "unknown-account") {
      // 200, not an error: an account this database has never heard of is
      // almost always a webhook pointed at another environment, and answering
      // 500 would make Stripe retry it for days.
      console.warn(`[shop] account.updated for an unknown account ${account.id}`);
    }
    if (result === "failed") {
      // 500 so Stripe retries. The write is idempotent, and a capability this
      // database missed is a store that silently cannot be paid.
      return NextResponse.json({ error: "Capability update failed." }, { status: 500 });
    }
    return NextResponse.json({ received: true, result });
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
