import "server-only";

import { getProduct } from "./catalog";
import { applicationFeeCents, canChargeThroughConnect } from "./connect";
import { checkoutEnabled } from "./flags";
import { purchasable } from "./format";
import { getStorePayouts, recordOrderFee } from "./payouts";
import { TERMS_VERSION } from "@/lib/legal/version";
import { proShipsFree } from "@/lib/entitlements/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Checkout abstraction. One provider (Stripe Checkout, single store, one or
 * many items, physical goods); the exported surface is provider agnostic.
 *
 * ── Where the money goes ────────────────────────────────────────────────
 *
 * Two shapes, chosen per order by whether the store has a connected account
 * Stripe has actually enabled:
 *
 *   No connected account -> exactly what this file has always done. The charge
 *     settles in Purify's balance with no destination and no fee. Every order
 *     the shop has ever taken is this shape, and a Purify-operated store like
 *     EIKON stays this shape forever, because its money is already in the
 *     right account.
 *
 *   Connected and charges_enabled -> a DESTINATION charge.
 *     transfer_data.destination sends the money to the seller,
 *     application_fee_amount keeps Purify's commission, and on_behalf_of makes
 *     the seller the settlement merchant so a dispute is raised against their
 *     balance rather than Purify's. That last part is the owner's decision
 *     that sellers absorb refunds and chargebacks, expressed in the one place
 *     Stripe reads it.
 *
 * The fallback is silent and deliberate: a store that cannot be paid must
 * never fail a checkout, it must simply not be live. canGoLive() in
 * ./connect.ts is the gate that keeps an un-onboarded third-party store out of
 * the shop, so reaching this file with no account should mean a Purify store.
 *
 * The server is authoritative about everything that matters: price,
 * currency, availability, shipping, and order identity all come from the
 * database. The client contributes product slugs and quantities, nothing
 * else — a cart's display subtotal is never trusted.
 *
 * Shipping: Purify PRO subscribers ship free (the perk moved from Plus
 * to Pro with the Beta 2.1 ladder restructure); everyone else pays the
 * flat standard rate (SHOP_FLAT_SHIPPING_CENTS, default $4.99) once per
 * order regardless of item count. The Pro check reads the entitlements
 * row directly — free shipping is a perk of actually holding Pro,
 * independent of the feature-enforcement flags.
 *
 * With no Stripe key configured every path returns the disabled result;
 * nothing throws, nothing 500s.
 */

export type CheckoutItemInput = { productSlug: string; quantity: number };

export type CheckoutResult =
  | { ok: true; url: string; orderId: string }
  | { ok: false; disabled: true }
  | { ok: false; disabled?: false; reason: string };

/** Flat standard shipping in cents for non-Pro buyers. */
export function flatShippingCents(): number {
  const raw = Number(process.env.SHOP_FLAT_SHIPPING_CENTS ?? "499");
  return Number.isFinite(raw) && raw >= 0 ? Math.round(raw) : 499;
}

/** True when the user's orders ship free: an active Purify Pro
 * subscription (pro_until in the future). The date rule itself lives in
 * lib/entitlements/entitlements.ts proShipsFree so the client cart
 * display applies the identical predicate. */
export async function hasProShipping(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("entitlements")
      .select("pro_until")
      .eq("user_id", userId)
      .maybeSingle();
    return proShipsFree(data);
  } catch {
    return false;
  }
}

export async function createCheckout(
  itemInputs: CheckoutItemInput[],
  user: { id: string | null; email: string | null },
  /** Request origin for the success/cancel URLs (localhost in dev). */
  origin: string,
): Promise<CheckoutResult> {
  if (!checkoutEnabled()) return { ok: false, disabled: true };
  if (itemInputs.length === 0) {
    return { ok: false, reason: "Your cart is empty." };
  }

  // Re-resolve every line from the database; reject the whole checkout on
  // the first problem so the buyer fixes the cart instead of part-paying.
  const lines: { product: NonNullable<Awaited<ReturnType<typeof getProduct>>>; quantity: number }[] = [];
  for (const input of itemInputs) {
    const product = await getProduct(input.productSlug);
    if (!product || product.status !== "published") {
      return { ok: false, reason: "An item in your cart isn't available any more." };
    }
    if (!purchasable(product.inventory_status)) {
      return { ok: false, reason: `"${product.title}" can't be purchased yet.` };
    }
    if (
      product.inventory_status === "ready_to_ship" &&
      product.quantity_available != null &&
      product.quantity_available < input.quantity
    ) {
      return { ok: false, reason: `Not enough stock of "${product.title}".` };
    }
    lines.push({ product, quantity: input.quantity });
  }

  // One store, one currency per order (EIKON is the only store today; the
  // guard keeps a multi-merchant future from silently mixing sellers).
  const first = lines[0].product;
  if (lines.some((l) => l.product.store_id !== first.store_id)) {
    return { ok: false, reason: "Please check out one store at a time." };
  }
  if (lines.some((l) => l.product.currency !== first.currency)) {
    return { ok: false, reason: "Please check out one currency at a time." };
  }

  const itemsTotal = lines.reduce(
    (sum, l) => sum + l.product.price_cents * l.quantity,
    0,
  );
  const proShipping = await hasProShipping(user.id);
  const shipping = proShipping ? 0 : flatShippingCents();

  // Read the destination BEFORE the order row exists, so a Connect lookup that
  // fails leaves no half-built order behind. Fails soft to null, which is the
  // pre-Connect shape.
  const payouts = await getStorePayouts(first.store_id);
  const connected = canChargeThroughConnect(payouts) ? payouts : null;
  const feeCents = connected
    ? applicationFeeCents({
        itemsTotalCents: itemsTotal,
        shippingCents: shipping,
        commissionRateBps: connected.commission_rate_bps,
      })
    : 0;

  // Create the order first so the Stripe session carries our id, not
  // the other way round: if the webhook never arrives the order stays
  // 'pending' and is visible in admin.
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("shop_orders")
    .insert({
      user_id: user.id,
      store_id: first.store_id,
      seller_id: first.seller_id,
      email: user.email,
      items_total_cents: itemsTotal,
      shipping_cents: shipping,
      tax_cents: 0,
      total_cents: itemsTotal + shipping,
      currency: first.currency,
      payment_status: "pending",
      // Any special-order line puts the whole order on the sourcing path.
      fulfillment_status: lines.some(
        (l) => l.product.inventory_status === "special_order",
      )
        ? "supplier_order_needed"
        : "pending",
    })
    .select("id")
    .single();
  if (error || !order) {
    console.warn("[shop] order insert failed", error?.message);
    return { ok: false, reason: "Couldn't start checkout. Please try again." };
  }
  const orderId = order.id as string;

  await admin.from("shop_order_items").insert(
    lines.map((l) => ({
      order_id: orderId,
      product_id: l.product.id,
      title: l.product.title,
      unit_price_cents: l.product.price_cents,
      quantity: l.quantity,
    })),
  );

  // Record the checkout clickwrap (the API refused the request unless the
  // buyer ticked the box). Best-effort: a failed audit row never blocks a
  // sale, it only logs.
  {
    const { error: acceptErr } = await admin.from("terms_acceptances").insert({
      user_id: user.id,
      email: user.email,
      context: "checkout",
      terms_version: TERMS_VERSION,
      order_id: orderId,
    });
    if (acceptErr) {
      console.warn("[shop] terms acceptance insert failed", acceptErr.message);
    }
  }

  // Dynamic import: the Stripe SDK loads only on this enabled path.
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: orderId,
      customer_email: user.email ?? undefined,
      line_items: lines.map((l) => {
        const image = l.product.media[0]?.media_url;
        return {
          quantity: l.quantity,
          price_data: {
            currency: l.product.currency,
            unit_amount: l.product.price_cents,
            product_data: {
              name: l.product.title,
              description: l.product.subtitle ?? undefined,
              images: image && image.startsWith("http") ? [image] : undefined,
            },
          },
        };
      }),
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shipping, currency: first.currency },
            display_name: proShipping
              ? "Free shipping (Purify Pro)"
              : "Standard shipping",
          },
        },
      ],
      // Destination charge, or nothing at all. An empty payment_intent_data
      // is not equivalent to omitting it for every Stripe API version, so the
      // spread is conditional on the whole block rather than on each field.
      ...(connected
        ? {
            payment_intent_data: {
              application_fee_amount: feeCents,
              transfer_data: { destination: connected.stripe_account_id },
              on_behalf_of: connected.stripe_account_id,
            },
          }
        : {}),
      success_url: `${origin}/shop/checkout/success?order=${orderId}`,
      // The cancelled page cancels the pending order server-side (and
      // expires the session), so walking away from Stripe never leaves a
      // phantom "awaiting payment" order in the buyer's list. A single
      // buy-now links back to its product; a cart checkout back to the cart.
      cancel_url:
        lines.length === 1
          ? `${origin}/shop/checkout/cancelled?order=${orderId}&product=${first.slug}`
          : `${origin}/shop/checkout/cancelled?order=${orderId}&from=cart`,
      metadata: { order_id: orderId, product_slug: first.slug },
    });
    if (!session.url) {
      return { ok: false, reason: "Couldn't start checkout. Please try again." };
    }
    await admin
      .from("shop_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", orderId);

    // Freeze what was charged, AFTER the session exists so a Stripe rejection
    // leaves no fee row claiming a commission on a charge that never happened.
    // Best-effort: the console renders a missing fee as unknown rather than as
    // zero, so a failure here is visible instead of fabricated.
    if (connected) {
      await recordOrderFee({
        order_id: orderId,
        stripe_account_id: connected.stripe_account_id,
        commission_rate_bps: connected.commission_rate_bps,
        commission_base_cents: itemsTotal,
        application_fee_cents: feeCents,
      });
    }
    return { ok: true, url: session.url, orderId };
  } catch (e) {
    console.warn("[shop] stripe session failed", (e as Error).message);
    return { ok: false, reason: "Couldn't start checkout. Please try again." };
  }
}
