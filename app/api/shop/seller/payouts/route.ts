import { NextResponse } from "next/server";

import { rateLimited } from "@/lib/security/ratelimit";
import { connectStatus } from "@/lib/shop/connect";
import { checkoutEnabled, shopEnabled } from "@/lib/shop/flags";
import {
  applyAccountCapabilities,
  ensureStorePayoutsRow,
  getStorePayouts,
  setStripeAccount,
} from "@/lib/shop/payouts";
import { getSellerContext } from "@/lib/shop/seller";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * A seller sets up their own payouts.
 *
 * GET reports where they stand. POST creates their Stripe Express account if
 * it does not exist and returns a fresh onboarding link.
 *
 * SELF-SERVE ON PURPOSE. Bank details, a government ID and a tax number are
 * the seller's to enter and nobody else's; an admin cannot do this step for
 * them and should never be handed the documents. What an admin controls is
 * whether the store opens at all, which is a different gate (canGoLive).
 *
 * GET REFRESHES FROM STRIPE, and that is not belt-and-braces. The
 * account.updated webhook has to be subscribed by hand in the Stripe
 * dashboard, and until somebody does that this database never hears that an
 * account was enabled. A console that reported a stale charges_enabled=false
 * would tell a seller who has finished onboarding that they have not, forever.
 * The refresh is what makes this page true without a dashboard step.
 */

type PayoutsView = {
  status: ReturnType<typeof connectStatus>;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  commissionRateBps: number | null;
  hasAccount: boolean;
  /** False when the platform has no Stripe key at all; the UI says so. */
  configured: boolean;
};

async function view(storeId: string, refresh: boolean): Promise<PayoutsView> {
  let payouts = await getStorePayouts(storeId);

  if (refresh && payouts?.stripe_account_id && checkoutEnabled()) {
    try {
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const account = await stripe.accounts.retrieve(payouts.stripe_account_id);
      const applied = await applyAccountCapabilities(payouts.stripe_account_id, {
        chargesEnabled: Boolean(account.charges_enabled),
        payoutsEnabled: Boolean(account.payouts_enabled),
      });
      if (applied === "updated") payouts = await getStorePayouts(storeId);
    } catch (e) {
      // A Stripe outage shows the stored answer rather than an error page.
      console.warn("[shop] account refresh failed", (e as Error).message);
    }
  }

  return {
    status: connectStatus(payouts),
    chargesEnabled: Boolean(payouts?.charges_enabled),
    payoutsEnabled: Boolean(payouts?.payouts_enabled),
    commissionRateBps: payouts?.commission_rate_bps ?? null,
    hasAccount: Boolean(payouts?.stripe_account_id),
    configured: checkoutEnabled(),
  };
}

export async function GET(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }
  const ctx = await getSellerContext();
  if (ctx.state !== "seller" || !ctx.store) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  return NextResponse.json(await view(ctx.store.id, refresh), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST() {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }
  const ctx = await getSellerContext();
  if (ctx.state !== "seller" || !ctx.store) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (ctx.seller.status !== "active") {
    return NextResponse.json(
      { error: "Your seller account is not active." },
      { status: 403 },
    );
  }
  if (!checkoutEnabled()) {
    return NextResponse.json(
      { error: "Payments aren't configured yet. The Purify team has to finish that first." },
      { status: 503 },
    );
  }
  // Account creation is not free of consequence at Stripe's end, and an
  // onboarding link is short-lived, so a stuck page that re-posts must not
  // create a second account.
  if (await rateLimited(`shop-seller-payouts:${ctx.userId}`, 3600, 20)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  const row = await ensureStorePayoutsRow(ctx.store.id);
  if (!row) {
    return NextResponse.json(
      { error: "Couldn't start payout setup. Please try again." },
      { status: 500 },
    );
  }

  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    let accountId = row.stripe_account_id;
    if (!accountId) {
      // card_payments AND transfers: on_behalf_of makes this account the
      // settlement merchant for the charge, so it needs to be able to accept
      // a card payment, not only to receive a transfer.
      const account = await stripe.accounts.create({
        type: "express",
        email: ctx.store.support_email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: ctx.store.public_name,
          url: `${SITE_URL}/shop/${ctx.store.slug}`,
        },
        // The store id travels with the account so a support conversation in
        // the Stripe dashboard can be traced back without a database lookup.
        metadata: { purify_store_id: ctx.store.id, purify_store_slug: ctx.store.slug },
      });
      accountId = account.id;
      const saved = await setStripeAccount(ctx.store.id, accountId);
      if (!saved) {
        // The account EXISTS at Stripe and this database does not know its id.
        // Loud, because the next POST would create a second one and money
        // would eventually land in an account nothing references.
        console.error(
          `[shop] STRIPE ACCOUNT CREATED BUT NOT RECORDED store=${ctx.store.id} account=${accountId}. Needs review.`,
        );
        return NextResponse.json(
          { error: "Couldn't save your payout account. Please contact us before trying again." },
          { status: 500 },
        );
      }
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${SITE_URL}/shop/seller/payouts?refresh=1`,
      return_url: `${SITE_URL}/shop/seller/payouts?done=1`,
      type: "account_onboarding",
    });
    return NextResponse.json({ ok: true, url: link.url });
  } catch (e) {
    // WHY THIS IS NOT ONE GENERIC MESSAGE.
    //
    // The first real attempt at this failed with "Couldn't start payout
    // setup." and that sentence was true of every possible cause: Connect not
    // enabled on the platform, a bad key, a Stripe outage, a validation
    // rejection. Nobody could act on it, and the only way to find out was to
    // read the deploy log. An error that costs a log dive to interpret is a
    // bug in the error, not just in the thing that failed.
    //
    // Stripe's own message is specific and usually actionable, so the known
    // causes are named here and everything else carries the message through.
    // This is a seller-console route behind a session, not a public surface.
    const err = e as { message?: string; type?: string; code?: string; raw?: { message?: string } };
    const message = err.raw?.message ?? err.message ?? "";
    console.error(
      `[shop] connect onboarding failed store=${ctx.store.id} type=${err.type ?? "?"} code=${err.code ?? "?"} :: ${message}`,
    );

    // The platform has never signed up for Connect. This is the one that
    // cannot be retried away, and it is a setting on Purify's account, not
    // anything the seller did.
    if (/connect/i.test(message) && /sign(ed)? up|not.*(enabled|activated)|only stripe connect/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Payouts aren't switched on for Purify's Stripe account yet, so we can't create yours. Nothing is wrong on your end. We've been told and will write to you when it's ready.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: message
          ? `Stripe couldn't start onboarding: ${message}`
          : "Stripe couldn't start onboarding. Please try again shortly.",
      },
      { status: 502 },
    );
  }
}
