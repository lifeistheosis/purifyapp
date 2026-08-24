import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { sendSellerProvisionedEmail } from "@/lib/shop/sellerEmails";
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
    // Typed on the application form and, until now, orphaned on that row.
    returnPolicy: app.return_policy ?? null,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await admin
    .from("shop_merchant_applications")
    .update({ status: "store_setup", updated_at: new Date().toISOString() })
    .eq("id", app.id);

  // Provisioning used to be silent. The seller row, the console access and the
  // draft store all appeared, and the person they belonged to was told
  // nothing, by anything, ever. This is the message that makes the funnel work
  // end to end.
  //
  // Awaited so the serverless response does not cut it off, and its outcome is
  // RETURNED rather than thrown: the store exists whatever the mail server
  // did, and an operator who can see `emailed: false` will write by hand.
  // A 500 here would invite them to press Provision again.
  const sent = await sendSellerProvisionedEmail({
    email: app.email,
    storeName: app.proposed_store_name,
    slug: result.slug,
    linked: Boolean(app.user_id),
  });

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "seller.provision",
    entityType: "shop_store",
    entityId: result.storeId,
    detail: {
      applicationId: app.id,
      sellerId: result.sellerId,
      slug: result.slug,
      sellerEmail: app.email,
      linkedAccount: Boolean(app.user_id),
      emailed: sent.ok,
    },
  });

  return NextResponse.json({
    ok: true,
    sellerId: result.sellerId,
    storeId: result.storeId,
    slug: result.slug,
    emailed: sent.ok,
  });
}
