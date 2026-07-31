import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";
import { normalizeAddress, validateAddress } from "@/lib/eikonBox/address";
import { TERMS_VERSION } from "@/lib/legal/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Claim this month's EIKON Box.
 *
 * The claim is what tells the owner how many units to buy, so it is written
 * by the SERVICE ROLE and the member's identity comes from their own token,
 * never from the body: the client sends a drop id and an address, nothing
 * that could name someone else.
 *
 * Everything that decides lives in SQL. claim_eikon_box() re-reads pro_until
 * and re-checks the claim window inside the same call as the insert, so a
 * subscription that lapses between page load and button press cannot slip a
 * box through, and a window that closed while the screen sat open cannot
 * either. The unique index on (drop_id, user_id) means a double-tap, a
 * retry, or two devices racing yield exactly one claim.
 *
 * "Already claimed" is a SUCCESS, not an error, same as the gift claim: the
 * member tapped twice and the answer to "do I have a box this month" is yes.
 */
const bodySchema = z.object({
  dropId: z.string().uuid(),
  address: z.object({
    name: z.string().min(1).max(200),
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional().nullable(),
    city: z.string().min(1).max(120),
    state: z.string().min(1).max(40),
    postalCode: z.string().min(1).max(20),
  }),
  saveAddress: z.boolean().optional().default(true),
  // Same posture as the shop's checkout clickwrap: the literal true is
  // required by the schema so a claim cannot be made without it.
  termsAccepted: z.literal(true),
});

async function handlePOST(req: Request) {
  if (!eikonBoxEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (await rateLimited(`eikon-claim:${ipKey(req.headers)}`, 600, 20)) {
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

  // zod bounded the strings; this is the authority on whether the address is
  // one a parcel can actually be sent to.
  const address = normalizeAddress(parsed.address);
  const errors = validateAddress(address);
  if (Object.keys(errors).length) {
    return NextResponse.json(
      { error: "Please check the address.", fields: errors },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: rows, error } = await admin.rpc("claim_eikon_box", {
    p_drop_id: parsed.dropId,
    p_user_id: user.id,
    p_address: address,
    p_email: user.email ?? null,
  });

  if (error) {
    console.error("[eikon-box] claim_eikon_box failed", error.message);
    return NextResponse.json({ error: "Claim failed." }, { status: 500 });
  }

  const row = Array.isArray(rows) ? rows[0] : rows;
  const result = row?.result as
    | "ok"
    | "already"
    | "not_pro"
    | "closed"
    | undefined;

  if (result === "not_pro") {
    return NextResponse.json(
      { error: "The EIKON Box is for active Purify Pro members." },
      { status: 403 },
    );
  }
  if (result === "closed") {
    return NextResponse.json(
      { error: "This month's box has closed." },
      { status: 409 },
    );
  }
  if (result !== "ok" && result !== "already") {
    console.error("[eikon-box] unexpected claim result", result);
    return NextResponse.json({ error: "Claim failed." }, { status: 500 });
  }

  // Best-effort from here down. The claim is already recorded and it is the
  // thing that matters; none of the following may turn a good claim into an
  // error on the member's screen.
  if (parsed.saveAddress) {
    const { error: addrError } = await admin
      .from("member_addresses")
      .upsert(
        { user_id: user.id, address, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (addrError) console.warn("[eikon-box] address save failed", addrError.message);
  }

  if (result === "ok") {
    const { error: termsError } = await admin.from("terms_acceptances").insert({
      user_id: user.id,
      email: user.email ?? null,
      context: "eikon_claim",
      terms_version: TERMS_VERSION,
    });
    if (termsError) {
      // Loud, because this is the audit record for the no-carryover rule.
      console.warn(
        `[eikon-box] terms acceptance NOT recorded for ${user.id}: ${termsError.message}`,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    alreadyClaimed: result === "already",
    claimId: row?.claim_id ?? null,
    claimedAt: row?.claimed_at ?? null,
  });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
