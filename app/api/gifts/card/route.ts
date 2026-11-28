import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { GIFT_CODE } from "@/lib/gifts/card";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * A gift card as its link shows it (2.0, the Christmas gift; lib/gifts/card.ts):
 * who it is from, who it is for, their line, and whether it has been opened.
 * The code in the link is the only key; nothing here lists cards, and an
 * address is never sent back.
 */
async function handleGET(req: Request) {
  if (await rateLimited(`gift-card-read:${ipKey(req.headers)}`, 600, 60)) {
    return NextResponse.json({ error: "Too many tries just now." }, { status: 429 });
  }
  const code = (new URL(req.url).searchParams.get("code") ?? "").trim().toUpperCase();
  if (!GIFT_CODE.test(code)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const { data, error } = await createAdminClient()
    .from("gift_cards")
    .select("from_name, to_name, message, days, redeemed_at")
    .eq("code", code)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Not available." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({
    card: { fromName: data.from_name, toName: data.to_name, message: data.message, days: data.days, opened: Boolean(data.redeemed_at) },
  });
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
