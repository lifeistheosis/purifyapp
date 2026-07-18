import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The signed-in reader's oldest unclaimed gift, or null.
 *
 * Called on app open by components/gifts/GiftBridge. Reached cross-origin
 * from the native shell with a Bearer token, so it authenticates from the
 * header and answers the CORS preflight — the same shape as the shop routes.
 * A relative fetch here would resolve to https://localhost inside the app and
 * silently return nothing, which is exactly how push registration was broken.
 *
 * Reads under RLS as the reader (gifts_self_select), not the service role:
 * this endpoint only ever needs to see the caller's own rows.
 */
async function handleGET(req: Request) {
  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  // Signed out is not an error here; the bridge just does nothing.
  if (!user) return NextResponse.json({ gift: null });

  const { data, error } = await supa
    .from("gifts")
    .select("id, tier, days, message, created_at")
    .eq("user_id", user.id)
    .is("claimed_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Never break app startup over a gift lookup — a missing table (migration
  // not applied yet) or any read failure just means "no gift".
  if (error || !data) return NextResponse.json({ gift: null });

  return NextResponse.json(
    { gift: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
