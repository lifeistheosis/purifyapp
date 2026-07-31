import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAddress, parseStoredAddress } from "@/lib/eikonBox/address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The roster: who claimed this month's box, and where each one goes.
 *
 * This is the screen the whole feature exists for. The count is the
 * purchase order, and the CSV export off this data is the label sheet.
 */
export async function GET(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dropId = new URL(req.url).searchParams.get("dropId");
  if (!dropId) return NextResponse.json({ error: "dropId required." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("eikon_drop_claims")
    .select(
      "id, user_id, email, status, outbound_tracking, shipping_address, pro_until_at_claim, cancel_reason, admin_note, claimed_at, updated_at",
    )
    .eq("drop_id", dropId)
    .order("claimed_at", { ascending: true })
    .limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const now = Date.now();

  // Who has since lapsed. One .in() rather than a query per row. A lapsed
  // claim is NOT auto-cancelled: they were paying when they claimed, and the
  // claim is the promise. This just lets the owner see it.
  const ids = rows.map((r) => r.user_id);
  const lapsed = new Set<string>();
  if (ids.length) {
    const { data: ents } = await admin
      .from("entitlements")
      .select("user_id, pro_until")
      .in("user_id", ids);
    for (const e of ents ?? []) {
      if (!e.pro_until || new Date(e.pro_until).getTime() <= now) {
        lapsed.add(e.user_id as string);
      }
    }
    // A claimant with no entitlements row at all has certainly lapsed.
    const seen = new Set((ents ?? []).map((e) => e.user_id as string));
    for (const id of ids) if (!seen.has(id)) lapsed.add(id);
  }

  const claims = rows.map((r) => {
    const address = parseStoredAddress(r.shipping_address);
    return {
      id: r.id,
      userId: r.user_id,
      email: r.email,
      status: r.status,
      tracking: r.outbound_tracking,
      address,
      addressLine: address ? formatAddress(address) : "",
      proUntilAtClaim: r.pro_until_at_claim,
      lapsed: lapsed.has(r.user_id),
      cancelReason: r.cancel_reason,
      adminNote: r.admin_note,
      claimedAt: r.claimed_at,
      updatedAt: r.updated_at,
    };
  });

  return NextResponse.json({ claims });
}

const patchSchema = z.object({
  claimIds: z.array(z.string().uuid()).min(1).max(500),
  status: z
    .enum(["claimed", "packed", "shipped", "delivered", "cancelled"])
    .optional(),
  outboundTracking: z.string().max(200).optional().nullable(),
  cancelReason: z.string().max(300).optional().nullable(),
  adminNote: z.string().max(1000).optional().nullable(),
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
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }
  const p = parsed.data;

  if (
    p.status === undefined &&
    p.outboundTracking === undefined &&
    p.cancelReason === undefined &&
    p.adminNote === undefined
  ) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  // A tracking number identifies ONE parcel. Writing the same one across a
  // selection is always a mistake, so it is refused rather than applied.
  if (p.outboundTracking !== undefined && p.claimIds.length !== 1) {
    return NextResponse.json(
      { error: "Tracking can only be set on a single claim." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Setting tracking means it went out. Mirrors how the shop's Orders tab
  // treats a tracking number, so the two consoles behave the same way.
  const impliedStatus =
    p.status ??
    (p.outboundTracking ? ("shipped" as const) : undefined);

  const { error } = await admin
    .from("eikon_drop_claims")
    .update({
      ...(impliedStatus ? { status: impliedStatus } : {}),
      ...(p.outboundTracking !== undefined
        ? { outbound_tracking: p.outboundTracking || null }
        : {}),
      ...(p.cancelReason !== undefined ? { cancel_reason: p.cancelReason } : {}),
      ...(p.adminNote !== undefined ? { admin_note: p.adminNote } : {}),
      updated_at: now,
    })
    .in("id", p.claimIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: p.claimIds.length });
}
