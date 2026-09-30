import { NextResponse } from "next/server";

import { canReceive, syncAmbassadorAccount } from "@/lib/ambassadors/stripeAccount";
import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { rateLimited } from "@/lib/security/ratelimit";
import { SITE_URL } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * An ambassador's payout account: a Stripe Express account that can only
 * receive transfers (no card payments; ambassadors sell nothing themselves).
 *
 * POST starts or resumes Stripe's own onboarding and answers its link, the
 * same way the seller console does (app/api/shop/seller/payouts/route.ts).
 * Stripe collects the bank details and identity; Purify never sees them.
 * GET asks Stripe where the account stands, for the moment the ambassador
 * comes back from onboarding, before the webhook has necessarily arrived.
 */

async function ambassadorFor(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, amb: null };
  const { data: amb } = await createAdminClient()
    .from("ambassadors")
    .select("id, code, display_name, status, stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return { user, amb: amb as { id: string; code: string; display_name: string | null; status: string; stripe_account_id: string | null } | null };
}

async function stripeClient() {
  const { default: Stripe } = await import("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

async function handlePOST(req: Request) {
  const { user, amb } = await ambassadorFor(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!amb) return NextResponse.json({ error: "This account is not an ambassador." }, { status: 403 });
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payouts aren't configured yet." }, { status: 503 });
  }
  if (await rateLimited(`ambassador-connect:${user.id}`, 3600, 20)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }
  try {
    const stripe = await stripeClient();
    let accountId = amb.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email ?? undefined,
        capabilities: { transfers: { requested: true } },
        business_profile: {
          url: `${SITE_URL}/shop/eikon`,
          product_description: "Refers readers to the Purify shop and is paid a commission on EIKON orders.",
        },
        metadata: { purify_ambassador_id: amb.id, purify_code: amb.code },
      });
      accountId = account.id;
      const { error } = await createAdminClient()
        .from("ambassadors")
        .update({ stripe_account_id: accountId, updated_at: new Date().toISOString() })
        .eq("id", amb.id);
      if (error) {
        console.error(`[ambassadors] STRIPE ACCOUNT CREATED BUT NOT RECORDED ambassador=${amb.id} account=${accountId}. Needs review.`);
        return NextResponse.json({ error: "Couldn't save your payout account. Please contact us before trying again." }, { status: 500 });
      }
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${SITE_URL}/shop/ambassador?stripe=refresh`,
      return_url: `${SITE_URL}/shop/ambassador?stripe=done`,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: link.url });
  } catch (e) {
    const err = e as { message?: string; raw?: { message?: string } };
    const message = err.raw?.message ?? err.message ?? "";
    console.error(`[ambassadors] connect onboarding failed ambassador=${amb.id} :: ${message}`);
    return NextResponse.json({ error: message ? `Stripe said: ${message}` : "Couldn't open Stripe. Please try again." }, { status: 502 });
  }
}

async function handleGET(req: Request) {
  const { user, amb } = await ambassadorFor(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!amb?.stripe_account_id) return NextResponse.json({ connected: false, payoutsReady: false });
  try {
    const account = await (await stripeClient()).accounts.retrieve(amb.stripe_account_id);
    await syncAmbassadorAccount(amb.stripe_account_id, account);
    return NextResponse.json({ connected: true, payoutsReady: canReceive(account) });
  } catch {
    return NextResponse.json({ connected: true, payoutsReady: false });
  }
}

export const GET = corsRoute(handleGET);
export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
