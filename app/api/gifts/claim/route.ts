import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";
import { computeGiftGrant } from "@/lib/gifts/grant";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Claim a gift: flip it to claimed and extend the reader's entitlement.
 *
 * The claim is the only thing that grants the tier, so it is written by the
 * SERVICE ROLE and the reader's identity comes from their own token, never
 * from the body — the client sends a gift id and nothing else, and the id is
 * scoped to the caller inside claim_gift(p_gift_id, p_user_id).
 *
 * Double-claim safety lives in SQL: claim_gift only matches rows where
 * claimed_at is null, so a double-tap, a retry, or two devices racing yields
 * exactly one payout. If it returns no row, the gift was already claimed and
 * we write no entitlement.
 */
const bodySchema = z.object({ giftId: z.string().uuid() });

async function handlePOST(req: Request) {
  if (await rateLimited(`gift-claim:${ipKey(req.headers)}`, 600, 30)) {
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

  const admin = createAdminClient();

  // Atomic claim, scoped to this user. No row back = already claimed (or not
  // theirs), which is a no-op rather than an error: the box has closed.
  const { data: claimed, error: claimError } = await admin
    .rpc("claim_gift", { p_gift_id: parsed.giftId, p_user_id: user.id })
    .maybeSingle();

  if (claimError) {
    console.error("[gifts] claim_gift failed", claimError.message);
    return NextResponse.json({ error: "Claim failed." }, { status: 500 });
  }
  if (!claimed) {
    return NextResponse.json({ ok: true, alreadyClaimed: true });
  }

  const gift = claimed as { tier: "plus" | "pro"; days: number };

  // Extend, never truncate. Read the current row first: upsert_entitlement
  // overwrites every column, so is_supporter and the untouched tier have to
  // be carried forward (same reason the RevenueCat webhook re-reads it).
  const { data: existing } = await admin
    .from("entitlements")
    .select("is_supporter, plus_until, pro_until")
    .eq("user_id", user.id)
    .maybeSingle();

  const grant = computeGiftGrant(existing, gift.tier, gift.days);

  const { error: writeError } = await admin.rpc("upsert_entitlement", {
    p_user_id: user.id,
    p_is_supporter: existing?.is_supporter === true,
    p_plus_until: grant.plusUntil,
    p_plus_source: "gift",
    p_pro_until: grant.proUntil,
  });

  if (writeError) {
    // The gift is already marked claimed. Surface the failure loudly rather
    // than pretending it worked: the owner can re-gift, and the log names the
    // account so the grant can be repaired by hand.
    console.error(
      `[gifts] entitlement write FAILED after claiming gift ${parsed.giftId} for ${user.id}: ${writeError.message}`,
    );
    return NextResponse.json({ error: "Claim failed." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    tier: gift.tier,
    plusUntil: grant.plusUntil,
    proUntil: grant.proUntil,
  });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
