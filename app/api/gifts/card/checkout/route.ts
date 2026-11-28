import { NextResponse } from "next/server";

import { GIFT_CARD, cardMetadata, giveSchema, whenChoices } from "@/lib/gifts/card";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { checkoutReturnOrigin } from "@/lib/site";

/**
 * Give a year of Plus by email: a Stripe Checkout for $59.99 (2.0, the
 * Christmas gift; lib/gifts/card.ts). His word, 2026-11-28: "yes build the
 * gift page at 59.99".
 *
 * WEBSITE ONLY, as the reader-to-reader gift is (app/api/gifts/checkout): Plus
 * is a digital good, which the app stores bill themselves, so the page (/give)
 * is stashed out of the native export with all of app/api.
 *
 * No account is needed to give. The client sends words, never an amount: the
 * price is GIFT_CARD here, the gift is written into the session's metadata on
 * the server, and the webhook grants nothing unless it was paid in full.
 */
export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Gifts are not open yet.", code: "unavailable" }, { status: 503 });
  if (await rateLimited(`gift-card-checkout:${ipKey(req.headers)}`, 3600, 20)) {
    return NextResponse.json({ error: "Too many tries just now. Please wait a little." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = giveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please check the names and the email.", code: "invalid" }, { status: 400 });
  const now = new Date();
  // A Christmas day that has passed is not offered, and not taken.
  if (!whenChoices(now).includes(parsed.data.when)) return NextResponse.json({ error: "That day has passed.", code: "when" }, { status: 400 });

  const origin = checkoutReturnOrigin(new URL(req.url).origin);
  const metadata = cardMetadata(parsed.data, now);
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: GIFT_CARD.currency,
            unit_amount: GIFT_CARD.cents,
            product_data: { name: "A year of Purify Plus, as a gift" },
          },
        },
      ],
      success_url: `${origin}/give/thanks${metadata.deliver_on ? `?on=${metadata.deliver_on}` : ""}`,
      cancel_url: `${origin}/give`,
      metadata,
      payment_intent_data: { metadata: { kind: metadata.kind } },
    });
    if (!session.url) throw new Error("no url");
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.warn("[gift-cards] checkout failed", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "We could not open the checkout. Please try again." }, { status: 502 });
  }
}
