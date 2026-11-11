import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { campaignsCaller } from "@/lib/campaigns/opening";
import { listByCreator } from "@/lib/campaigns/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A reader's campaigns as their profile shows them: GET
 * /api/campaigns/by?handle=<handle> (lib/campaigns/server.ts, listByCreator,
 * which says what is on a profile and what never is).
 *
 * It says which are the asker's own and leaves out a reader they have
 * blocked, so the answer is one reader's and never a shared cache's. A
 * handle nobody holds, a private profile and a reader with no campaign all
 * answer with the same empty list. 404 while campaigns are closed for
 * whoever asks (lib/campaigns/opening.ts).
 */
async function handleGET(req: Request) {
  const who = await campaignsCaller(req);
  if (!who.open) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (await rateLimited(`campaign-by:${ipKey(req.headers)}`, 3600, 600)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const handle = new URL(req.url).searchParams.get("handle") ?? "";
  if (!handle || handle.length > 60) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const list = await listByCreator(createAdminClient(), { handle, userId: who.user?.id ?? null });
  if (!list.ok) {
    return list.why === "absent" ? NextResponse.json({ error: "Not found." }, { status: 404 }) : NextResponse.json({ error: "The campaigns could not be read." }, { status: 500 });
  }
  return NextResponse.json({ campaigns: list.value }, { headers: { "Cache-Control": "private, no-store", Vary: "Origin, Authorization" } });
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
