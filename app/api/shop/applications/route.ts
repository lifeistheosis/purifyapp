import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { shopMerchantApplicationSchema } from "@/lib/security/schemas";
import { shopEnabled } from "@/lib/shop/flags";
import { sendApplicationReceivedEmail } from "@/lib/shop/sellerEmails";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Sell on Purify: merchant application intake. Signed-in users only —
 * an application is the start of an accountable relationship, not an
 * anonymous form. Status is always 'submitted' on creation and only
 * admins ever change it; approval never auto-creates a store.
 */
async function handlePOST(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }
  if (await rateLimited(`shop-apply:${ipKey(req.headers)}`, 3600, 5)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 },
    );
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to apply as a merchant." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = shopMerchantApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid application." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const admin = createAdminClient();

  // One live application per user: a declined or suspended application
  // may be replaced, anything still in flight may not be duplicated.
  const { data: existing } = await admin
    .from("shop_merchant_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .not("status", "in", "(declined,suspended)")
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "You already have an application in review." },
      { status: 409 },
    );
  }

  const { error } = await admin.from("shop_merchant_applications").insert({
    user_id: user.id,
    proposed_store_name: data.proposedStoreName,
    seller_type: data.sellerType,
    legal_name: data.legalName,
    email: data.email,
    phone: data.phone ?? null,
    country: data.country,
    shipping_origin: data.shippingOrigin ?? null,
    portfolio_url: data.portfolioUrl ?? null,
    product_methods: data.productMethods,
    fulfillment_offerings: data.fulfillmentOfferings,
    processing_time: data.processingTime ?? null,
    countries_served: data.countriesServed ?? null,
    return_policy: data.returnPolicy ?? null,
    rights_declaration: data.rightsDeclaration,
    seller_description: data.sellerDescription ?? null,
    agreed_standards: data.agreedStandards,
    status: "submitted",
  });
  if (error) {
    console.warn("[shop] application insert failed", error.message);
    return NextResponse.json(
      { error: "Couldn't submit your application. Please try again." },
      { status: 500 },
    );
  }
  // Awaited, not fire-and-forget: this route runs on a serverless request and
  // a floating promise can be cut off when the response is returned. It cannot
  // fail the submission either way, because sendEmail never throws and its
  // result is deliberately unused.
  await sendApplicationReceivedEmail({
    email: data.email,
    proposedStoreName: data.proposedStoreName,
  });
  return NextResponse.json({ ok: true });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
