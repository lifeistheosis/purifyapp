import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { flatShippingCents } from "@/lib/shop/checkout";
import { checkoutEnabled, shopEnabled } from "@/lib/shop/flags";
import { readShopSettings } from "@/lib/shop/settings";

/**
 * Public shop config the client can't derive on its own: whether checkout is
 * live (server-only STRIPE_SECRET_KEY + flags) and the flat shipping rate. No
 * user data — the per-buyer Plus status is read separately by the client.
 */
export async function GET(req: Request) {
  if (!shopEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  // Only the public face of the owner's settings: the threshold a shopper
  // can aim for, and whether product pages show the demand line. The deal's
  // percentage and timing are not here on purpose (see lib/shop/cartDealServer).
  const { settings } = await readShopSettings();
  return withCors(
    NextResponse.json(
      {
        checkoutEnabled: checkoutEnabled(),
        flatShippingCents: flatShippingCents(),
        freeShippingThresholdCents: settings.freeShippingThresholdCents,
        showCartDemand: settings.showCartDemand,
      },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } },
    ),
    req,
  );
}

export const OPTIONS = corsPreflight;
