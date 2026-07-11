import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { flatShippingCents } from "@/lib/shop/checkout";
import { checkoutEnabled, shopEnabled } from "@/lib/shop/flags";

/**
 * Public shop config the client can't derive on its own: whether checkout is
 * live (server-only STRIPE_SECRET_KEY + flags) and the flat shipping rate. No
 * user data — the per-buyer Plus status is read separately by the client.
 */
export async function GET(req: Request) {
  if (!shopEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  return withCors(
    NextResponse.json(
      {
        checkoutEnabled: checkoutEnabled(),
        flatShippingCents: flatShippingCents(),
      },
      { headers: { "Cache-Control": "public, max-age=60" } },
    ),
    req,
  );
}

export const OPTIONS = corsPreflight;
