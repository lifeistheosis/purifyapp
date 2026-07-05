import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createSellerAndStore } from "@/lib/shop/storeProvision";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Completes the seller loop Phase 1 left open: from an approved
 * application, create the shop_sellers row (attached to the applicant's
 * user account — this is the moment console access is granted) and a
 * DRAFT store the seller finishes before anything goes live. Explicit
 * admin act, idempotent: re-running provisions nothing twice.
 */

const provisionSchema = z.object({ applicationId: z.string().uuid() });

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

  const result = await createSellerAndStore({
    storeName: app.proposed_store_name,
    sellerType: app.seller_type,
    userId: app.user_id,
    legalName: app.legal_name,
    supportEmail: app.email,
    shippingOrigin: app.shipping_origin ?? app.country,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await admin
    .from("shop_merchant_applications")
    .update({ status: "store_setup", updated_at: new Date().toISOString() })
    .eq("id", app.id);

  return NextResponse.json({
    ok: true,
    sellerId: result.sellerId,
    storeId: result.storeId,
    slug: result.slug,
  });
}
