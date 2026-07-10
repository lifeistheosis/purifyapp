import "server-only";

import { getProduct } from "./catalog";
import { checkoutEnabled } from "./flags";
import { purchasable } from "./format";
import { TERMS_VERSION } from "@/lib/legal/version";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Checkout abstraction. One provider today (Stripe Checkout, single
 * store, single item, physical goods); the exported surface is provider
 * agnostic so a second provider or Stripe Connect can slot in at
 * Phase 3 without touching callers.
 *
 * The server is authoritative about everything that matters: price,
 * currency, availability, shipping, and order identity all come from the
 * database. The client contributes a product slug and a quantity,
 * nothing else.
 *
 * Shipping: Purify Plus subscribers ship free; everyone else pays the
 * flat standard rate (SHOP_FLAT_SHIPPING_CENTS, default $4.99). The Plus
 * check reads the entitlements row directly — free shipping is a perk of
 * actually holding Plus, independent of the feature-enforcement flags.
 *
 * With no Stripe key configured every path returns the disabled result;
 * nothing throws, nothing 500s.
 */

export type CheckoutResult =
  | { ok: true; url: string; orderId: string }
  | { ok: false; disabled: true }
  | { ok: false; disabled?: false; reason: string };

/** Flat standard shipping in cents for non-Plus buyers. */
export function flatShippingCents(): number {
  const raw = Number(process.env.SHOP_FLAT_SHIPPING_CENTS ?? "499");
  return Number.isFinite(raw) && raw >= 0 ? Math.round(raw) : 499;
}

/** True when the user holds an active Purify Plus subscription. */
export async function hasActivePlus(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("entitlements")
      .select("plus_until")
      .eq("user_id", userId)
      .maybeSingle();
    return !!data?.plus_until && new Date(data.plus_until) > new Date();
  } catch {
    return false;
  }
}

export async function createCheckout(
  productSlug: string,
  quantity: number,
  user: { id: string | null; email: string | null },
  /** Request origin for the success/cancel URLs (localhost in dev). */
  origin: string,
): Promise<CheckoutResult> {
  if (!checkoutEnabled()) return { ok: false, disabled: true };

  const product = await getProduct(productSlug);
  if (!product || product.status !== "published") {
    return { ok: false, reason: "This item isn't available." };
  }
  if (!purchasable(product.inventory_status)) {
    return { ok: false, reason: "This item can't be purchased yet." };
  }
  if (
    product.inventory_status === "ready_to_ship" &&
    product.quantity_available != null &&
    product.quantity_available < quantity
  ) {
    return { ok: false, reason: "Not enough stock for that quantity." };
  }

  const itemsTotal = product.price_cents * quantity;
  const plusShipping = await hasActivePlus(user.id);
  const shipping = plusShipping ? 0 : flatShippingCents();

  // Create the order first so the Stripe session carries our id, not
  // the other way round: if the webhook never arrives the order stays
  // 'pending' and is visible in admin.
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("shop_orders")
    .insert({
      user_id: user.id,
      store_id: product.store_id,
      seller_id: product.seller_id,
      email: user.email,
      items_total_cents: itemsTotal,
      shipping_cents: shipping,
      tax_cents: 0,
      total_cents: itemsTotal + shipping,
      currency: product.currency,
      payment_status: "pending",
      fulfillment_status:
        product.inventory_status === "special_order"
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

  await admin.from("shop_order_items").insert({
    order_id: orderId,
    product_id: product.id,
    title: product.title,
    unit_price_cents: product.price_cents,
    quantity,
  });

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

  const image = product.media[0]?.media_url;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: orderId,
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity,
          price_data: {
            currency: product.currency,
            unit_amount: product.price_cents,
            product_data: {
              name: product.title,
              description: product.subtitle ?? undefined,
              images: image && image.startsWith("http") ? [image] : undefined,
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shipping, currency: product.currency },
            display_name: plusShipping
              ? "Free shipping (Purify Plus)"
              : "Standard shipping",
          },
        },
      ],
      success_url: `${origin}/shop/checkout/success?order=${orderId}`,
      cancel_url: `${origin}/shop/icons/${product.slug}`,
      metadata: { order_id: orderId, product_slug: product.slug },
    });
    if (!session.url) {
      return { ok: false, reason: "Couldn't start checkout. Please try again." };
    }
    await admin
      .from("shop_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", orderId);
    return { ok: true, url: session.url, orderId };
  } catch (e) {
    console.warn("[shop] stripe session failed", (e as Error).message);
    return { ok: false, reason: "Couldn't start checkout. Please try again." };
  }
}
