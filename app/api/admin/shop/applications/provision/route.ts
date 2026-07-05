import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Completes the seller loop Phase 1 left open: from an approved
 * application, create the shop_sellers row (attached to the applicant's
 * user account — this is the moment console access is granted) and a
 * DRAFT store the seller finishes before anything goes live. Explicit
 * admin act, idempotent: re-running provisions nothing twice.
 */

const provisionSchema = z.object({ applicationId: z.string().uuid() });

const DISCLOSURES: Record<string, (name: string) => string> = {
  independent_iconographer: (n) =>
    `${n} is an independent iconographer selling on Purify Shop.`,
  monastery: (n) => `${n} is a monastery community selling on Purify Shop.`,
  workshop: (n) => `${n} is an independent workshop selling on Purify Shop.`,
  retailer: (n) => `${n} is an independent retailer selling on Purify Shop.`,
};

function storeSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "store"
  );
}

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = provisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: app, error: appError } = await admin
    .from("shop_merchant_applications")
    .select("*")
    .eq("id", parsed.data.applicationId)
    .maybeSingle();
  if (appError || !app) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }
  if (!["approved", "store_setup"].includes(app.status)) {
    return NextResponse.json(
      { error: `Application must be approved first (currently "${app.status}").` },
      { status: 409 },
    );
  }

  // Seller: one per user. Reuse if a previous provision already made it.
  const { data: existingSeller } = await admin
    .from("shop_sellers")
    .select("id")
    .eq("user_id", app.user_id)
    .maybeSingle();

  let sellerId = existingSeller?.id as string | undefined;
  if (!sellerId) {
    const { data: seller, error } = await admin
      .from("shop_sellers")
      .insert({
        user_id: app.user_id,
        seller_type: app.seller_type,
        public_name: app.proposed_store_name,
        legal_name: app.legal_name,
        status: "active",
        verification_status: "verified",
      })
      .select("id")
      .single();
    if (error || !seller) {
      console.warn("[shop] seller provision failed", error?.message);
      return NextResponse.json({ error: "Couldn't create the seller." }, { status: 500 });
    }
    sellerId = seller.id;
  }

  const { data: existingStore } = await admin
    .from("shop_stores")
    .select("id, slug")
    .eq("seller_id", sellerId)
    .maybeSingle();

  let storeId = existingStore?.id as string | undefined;
  let slug = existingStore?.slug as string | undefined;
  if (!storeId) {
    const base = storeSlug(app.proposed_store_name);
    slug = base;
    for (let attempt = 2; attempt <= 20; attempt++) {
      const { data: taken } = await admin
        .from("shop_stores")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!taken) break;
      slug = `${base}-${attempt}`;
    }
    const disclosure =
      DISCLOSURES[app.seller_type]?.(app.proposed_store_name) ??
      `${app.proposed_store_name} is an independent seller on Purify Shop.`;
    const { data: store, error } = await admin
      .from("shop_stores")
      .insert({
        seller_id: sellerId,
        slug,
        public_name: app.proposed_store_name,
        ownership_disclosure: disclosure,
        support_email: app.email,
        shipping_origin: app.shipping_origin ?? app.country,
        status: "draft",
      })
      .select("id")
      .single();
    if (error || !store) {
      console.warn("[shop] store provision failed", error?.message);
      return NextResponse.json({ error: "Couldn't create the store." }, { status: 500 });
    }
    storeId = store.id;
  }

  await admin
    .from("shop_merchant_applications")
    .update({ status: "store_setup", updated_at: new Date().toISOString() })
    .eq("id", app.id);

  return NextResponse.json({ ok: true, sellerId, storeId, slug });
}
