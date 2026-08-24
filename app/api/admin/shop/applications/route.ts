import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { sendApplicationDeclinedEmail } from "@/lib/shop/sellerEmails";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin review of merchant applications. Status transitions and
 * reviewer notes only — approval deliberately does NOT auto-create a
 * seller or store; store setup is a manual Phase 2 act.
 */

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const [apps, notes] = await Promise.all([
    admin
      .from("shop_merchant_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("shop_application_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  if (apps.error) return NextResponse.json({ error: apps.error.message }, { status: 500 });
  return NextResponse.json({ applications: apps.data ?? [], notes: notes.data ?? [] });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z
    .enum([
      "submitted",
      "under_review",
      "more_info_required",
      "approved",
      "store_setup",
      "live",
      "declined",
      "suspended",
    ])
    .optional(),
  note: z.string().min(1).max(4000).optional(),
});

export async function PATCH(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success || (!parsed.data.status && !parsed.data.note)) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (parsed.data.status) {
    const { error } = await admin
      .from("shop_merchant_applications")
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void logActivity({
      actorEmail: adminUser.email ?? null,
      action: "seller-application.status",
      entityType: "merchant_application",
      entityId: parsed.data.id,
      detail: { status: parsed.data.status },
    });
  }
  if (parsed.data.note) {
    const { error } = await admin.from("shop_application_notes").insert({
      application_id: parsed.data.id,
      note: parsed.data.note,
      admin_email: adminUser.email ?? "admin",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // A decline is the one status the applicant will otherwise never learn.
  // Approval sends nothing on purpose: provisioning follows within minutes and
  // sends its own, and two near-identical emails in an hour is spam.
  //
  // The note is included when this same request carried one, which is how the
  // admin console sends a decline: status and reasoning together.
  let emailed: boolean | undefined;
  if (parsed.data.status === "declined") {
    const { data: app } = await admin
      .from("shop_merchant_applications")
      .select("email, proposed_store_name")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (app) {
      const sent = await sendApplicationDeclinedEmail({
        email: app.email,
        proposedStoreName: app.proposed_store_name,
        note: parsed.data.note ?? null,
      });
      emailed = sent.ok;
    }
  }
  return NextResponse.json({ ok: true, emailed });
}
