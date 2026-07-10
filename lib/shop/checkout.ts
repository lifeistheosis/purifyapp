import "server-only";

import { getProduct } from "./catalog";
import { checkoutEnabled } from "./flags";
import { purchasable } from "./format";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Checkout abstraction. One provider today (Stripe Checkout, single
 * store, single item, physical goods); the exported surface is provider
 * agnostic so a second provider or Stripe Connect can slot in at
 * Phase 3 without touching callers.
 *
 * The server is authoritative about everything that matters: price,
 * currency, availability, and order identity all come from the
 * database. The client contributes a product slug and a quantity,
 * nothing else. Shipping is a flat $0 stub until the operator sets real
 * rates (documented in docs/shop/PHASE1.md).
 *
 * With no Stripe key configured every path returns the disabled result;
 * nothing throws, nothing 500s.
 */

export type CheckoutResult =
  | { ok: true; url: string; orderId: string }
  | { ok: false; disabled: true }
  | { ok: false; disabled?: false; reason: string };

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
  const shipping = 0; // Flat stub; operator sets real rates before launch.

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
