import { NextResponse } from "next/server";
import { z } from "zod";

import { actorOf, giftConfig, handleFrom, signedInUser } from "@/lib/community/social";
import { GIFT_KIND } from "@/lib/gifts/purchase";
import { profileIdByHandle } from "@/lib/profile/server";
import { rateLimited } from "@/lib/security/ratelimit";
import { checkoutReturnOrigin } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gift Plus to another reader: a Stripe Checkout for the owner's own gift
 * price, website only.
 *
 * WEBSITE ONLY, deliberately. Plus is a digital good, and both app stores
 * require their own billing for those, so the button never shows inside the
 * apps (components/community/profile/ProfileViewer.tsx) and this route is
 * stashed out of the native export with the rest of app/api.
 *
 * OFF until the owner sets STRIPE_GIFT_PLUS_PRICE_ID and GIFT_PLUS_DAYS
 * (lib/community/social.ts giftConfig). The price is whatever that Stripe
 * price says; this route never names an amount.
 *
 * The session's metadata carries the gift, written here on the server; the
 * webhook settles it into `gifts` (lib/gifts/purchase.ts) and the friend
 * opens it like any other gift.
 */
const schema = z.object({ handle: z.string().max(40) });

export async function POST(req: Request) {
  const config = giftConfig();
  if (!config) return NextResponse.json({ error: "Gifts are not open yet.", code: "unavailable" }, { status: 404 });
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to give a gift." }, { status: 401 });
  if (await rateLimited(`gift-checkout:${user.id}`, 3600, 20)) {
    return NextResponse.json({ error: "Too many tries just now." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  const handle = parsed.success ? handleFrom(parsed.data.handle) : null;
  if (!handle) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminClient();
  const recipient = await profileIdByHandle(admin, handle);
  if (!recipient) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (recipient === user.id) return NextResponse.json({ error: "That is you." }, { status: 400 });
  const actor = await actorOf(admin, user);

  const origin = checkoutReturnOrigin(new URL(req.url).origin);
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: config.priceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      success_url: `${origin}/community?gift=sent#@${handle}`,
      cancel_url: `${origin}/community#@${handle}`,
      metadata: {
        kind: GIFT_KIND,
        recipient_id: recipient,
        buyer_id: user.id,
        days: String(config.days),
        from_name: actor.name,
        from_handle: actor.handle ?? "",
      },
    });
    if (!session.url) throw new Error("no url");
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.warn("[gifts] checkout failed", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "We could not open the checkout. Please try again." }, { status: 502 });
  }
}
