import { NextResponse } from "next/server";

import { sendOrderConfirmationEmail } from "@/lib/shop/orderEmails";
import { applyAccountCapabilities } from "@/lib/shop/payouts";
import {
  settleCheckoutSession,
  type SettlementDb,
} from "@/lib/shop/webhookSettlement";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOwner, saleAlert } from "@/lib/admin/ownerAlert";
import { logActivity } from "@/lib/admin/activityLog";

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
    // EVERY DELIVERY IS RECORDED, and this is the part that was missing.
    //
    // Settlement ran entirely through this route with no trace of whether it
    // ever ran. When 31 orders sat pending with money taken, nothing anywhere
    // could answer the first question worth asking: is Stripe calling us at
    // all? A silent webhook and a webhook that was never registered look
    // identical from the inside.
    //
    // admin_activity_log rather than a new table: it already exists, it is
    // already read by the Audit log tab, and one more action name costs
    // nothing. Fire-and-forget, because a logging failure must never fail a
    // webhook that Stripe would then retry.
    void logActivity({
      actorEmail: "stripe-webhook",
      action: "shop.webhook",
      entityType: "shop_orders",
      entityId: (event.data.object as { client_reference_id?: string | null })
        .client_reference_id ?? null,
      detail: { eventType: event.type, result },
    });

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

    // TELL THE OWNER, if this is the transition that actually took the money.
    //
    // "paid" is a first settlement and "recovered" is one that had been missed
    // and has now landed. "retry-noop" is Stripe delivering the same event
    // again, and alerting on it would buzz the owner's phone once per retry
    // for a sale they already know about.
    //
    // NOT AWAITED, and that is the whole point. If this rejected inside the
    // request, the webhook would answer non-2xx, Stripe would retry, and a
    // failed notification would become a settlement problem. notifyOwner
    // swallows its own errors as well; this is the second of the two guards
    // because the cost of getting it wrong is a payment stuck in retry.
    if (result === "paid" || result === "recovered") {
      const session = event.data.object as {
        amount_total?: number | null;
        currency?: string | null;
      };
      void notifyOwner(
        saleAlert(session.amount_total ?? 0, session.currency ?? "usd"),
      );
    }

    // EVERY DELIVERY IS RECORDED, and this is the part that was missing.
    //
    // Settlement ran entirely through this route with no trace of whether it
    // ever ran. When 31 orders sat pending with money taken, nothing anywhere
    // could answer the first question worth asking: is Stripe calling us at
    // all? A silent webhook and a webhook that was never registered look
    // identical from the inside.
    //
    // admin_activity_log rather than a new table: it already exists, it is
    // already read by the Audit log tab, and one more action name costs
    // nothing. Fire-and-forget, because a logging failure must never fail a
    // webhook that Stripe would then retry.
    void logActivity({
      actorEmail: "stripe-webhook",
      action: "shop.webhook",
      entityType: "shop_orders",
      entityId: (event.data.object as { client_reference_id?: string | null })
        .client_reference_id ?? null,
      detail: { eventType: event.type, result },
    });

    return NextResponse.json({ received: true, result });
  }

  // Deliveries this route does not act on are logged too. "Stripe called and
  // we ignored it" and "Stripe never called" are different problems with
  // different fixes, and without this they look the same.
  void logActivity({
    actorEmail: "stripe-webhook",
    action: "shop.webhook",
    entityType: "shop_orders",
    entityId: null,
    detail: { eventType: event.type, result: "unhandled-event" },
  });

  return NextResponse.json({ received: true });
}
