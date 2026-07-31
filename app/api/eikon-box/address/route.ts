import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";
import { normalizeAddress, validateAddress } from "@/lib/eikonBox/address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Update where the member's boxes go.
 *
 * Two different things are written here, and the distinction matters:
 *
 *  - member_addresses is the BOOK: where the next box should go. Always
 *    updated.
 *  - eikon_drop_claims.shipping_address is a SNAPSHOT: where one specific
 *    box was sent. Only updated while that claim is still merely 'claimed'.
 *
 * Once a claim is packed the snapshot freezes, and this returns 409. A label
 * has been printed by then, and quietly rewriting the record would leave the
 * roster disagreeing with the parcel that is already moving.
 */
const bodySchema = z.object({
  address: z.object({
    name: z.string().min(1).max(200),
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional().nullable(),
    city: z.string().min(1).max(120),
    state: z.string().min(1).max(40),
    postalCode: z.string().min(1).max(20),
  }),
  /** Also re-point an open claim, not just the book. */
  applyToOpenClaim: z.boolean().optional().default(true),
});

async function handlePOST(req: Request) {
  if (!eikonBoxEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (await rateLimited(`eikon-address:${ipKey(req.headers)}`, 600, 20)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again shortly." },
      { status: 429 },
    );
  }

  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const address = normalizeAddress(parsed.address);
  const errors = validateAddress(address);
  if (Object.keys(errors).length) {
    return NextResponse.json(
      { error: "Please check the address.", fields: errors },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: bookError } = await admin
    .from("member_addresses")
    .upsert({ user_id: user.id, address, updated_at: now }, { onConflict: "user_id" });
  if (bookError) {
    console.error("[eikon-box] address upsert failed", bookError.message);
    return NextResponse.json({ error: "Could not save the address." }, { status: 500 });
  }

  let claimUpdated = false;
  let frozen = false;

  if (parsed.applyToOpenClaim) {
    const { data: claim } = await admin
      .from("eikon_drop_claims")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["claimed", "packed"])
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (claim?.status === "claimed") {
      const { error } = await admin
        .from("eikon_drop_claims")
        .update({ shipping_address: address, updated_at: now })
        .eq("id", claim.id);
      if (error) {
        console.error("[eikon-box] claim address update failed", error.message);
      } else {
        claimUpdated = true;
      }
    } else if (claim?.status === "packed") {
      frozen = true;
    }
  }

  if (frozen) {
    return NextResponse.json(
      {
        ok: true,
        savedForNextTime: true,
        claimUpdated: false,
        error:
          "This box is already packed. We saved the address for next month; write to us and we will try to catch this one.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, claimUpdated, savedForNextTime: true });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
