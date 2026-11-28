import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { GIFT_CODE } from "@/lib/gifts/card";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Open a gift card for the signed-in reader (2.0, the Christmas gift).
 *
 * The reader's identity comes from their own token, never the body; the body
 * carries the code alone. redeem_gift_card (supabase/migrations/
 * 20261128080347_gift_cards.sql) marks the card opened and writes an ordinary
 * unclaimed gift for this reader in one call, once only, whoever races. The
 * answer is that gift, in the shape the app's gift box opens
 * (components/gifts/GiftBox.tsx), whose claim grants the year (claim_gift).
 */
const bodySchema = z.object({ code: z.string().trim().toUpperCase().regex(GIFT_CODE) });

async function handlePOST(req: Request) {
  if (await rateLimited(`gift-card-redeem:${ipKey(req.headers)}`, 600, 20)) {
    return NextResponse.json({ error: "Too many tries just now." }, { status: 429 });
  }
  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to open your gift." }, { status: 401 });

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("redeem_gift_card", { p_code: parsed.code, p_user_id: user.id }).maybeSingle();
  if (error) {
    console.error("[gift-cards] redeem failed", error.message);
    return NextResponse.json({ error: "We could not open it just now." }, { status: 500 });
  }
  if (!data) {
    // Unknown, or opened already: say which, so a reader who opened it on
    // another device is told where it went.
    const { data: card } = await admin.from("gift_cards").select("redeemed_by").eq("code", parsed.code).maybeSingle();
    if (!card) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ result: card.redeemed_by === user.id ? "yours" : "opened" });
  }
  const gift = data as { id: string; tier: "plus"; days: number; message: string | null; from_name: string };
  return NextResponse.json({ result: "ok", gift: { id: gift.id, tier: gift.tier, days: gift.days, message: gift.message, from_name: gift.from_name } });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
