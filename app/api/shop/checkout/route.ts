import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { checkoutReturnOrigin } from "@/lib/site";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { shopCheckoutSchema } from "@/lib/security/schemas";
import { createCheckout } from "@/lib/shop/checkout";
import { shopEnabled } from "@/lib/shop/flags";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Start a checkout. The body carries a product slug and quantity only;
 * price, availability, and totals are decided server-side in
 * lib/shop/checkout. Disabled state returns 503 with a calm message —
 * the buy bar renders it inline.
 *
 * Reachable from the native shell (cross-origin + Bearer): the order is
 * created against the token's user and the Stripe success/cancel URLs point
 * back at purifyapp.net, where the in-app browser closes and hands off to the
 * app's local success screen.
 */
async function handlePOST(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }
  if (await rateLimited(`shop-checkout:${ipKey(req.headers)}`, 600, 20)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again shortly." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = shopCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Normalize both accepted shapes (buy-now single item, cart items[]).
  const items =
    "items" in parsed.data
      ? parsed.data.items
      : [{ productSlug: parsed.data.productSlug, quantity: parsed.data.quantity }];

  // NOT the raw request origin: behind Render's proxy that is
  // http://localhost:10000, which strands buyers after Stripe returns.
  const origin = checkoutReturnOrigin(new URL(req.url).origin);
  const result = await createCheckout(
    items,
    { id: user?.id ?? null, email: user?.email ?? null },
    origin,
  );

  if (result.ok) {
    return NextResponse.json({ url: result.url });
  }
  if (result.disabled) {
    return NextResponse.json(
      { error: "Checkout isn't open yet. Use Notify Me and we'll email you." },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: result.reason }, { status: 409 });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
