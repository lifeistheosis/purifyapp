import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { campaignsCaller } from "@/lib/campaigns/opening";
import { listCircles } from "@/lib/campaigns/server";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = () => NextResponse.json({ error: "Not found." }, { status: 404 });
const PRIVATE = { "Cache-Control": "private, no-store", Vary: "Origin, Authorization" };

/**
 * A signed-in reader's circles, and the campaigns running in them
 * (lib/campaigns/server.ts, listCircles): the choice "Who can see it" when a
 * campaign is started, and "In your circles" in Pray together.
 *
 * Their own circles and nobody else's, proved by their own token and never
 * taken from the request: this route takes no id at all. A reader who is not
 * signed in is in no circle, and is answered with two empty lists rather
 * than a refusal, as the list of one's own campaigns answers.
 *
 * 404 while campaigns are closed for whoever asks (lib/campaigns/opening.ts).
 */
async function handleGET(req: Request) {
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  if (!who.user) return NextResponse.json({ circles: [], campaigns: [] }, { headers: PRIVATE });
  if (await rateLimited(`campaign-circles:${who.user.id}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const found = await listCircles(createAdminClient(), { userId: who.user.id });
  if (!found.ok) {
    return found.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "Your circles could not be read." }, { status: 500 });
  }
  return NextResponse.json({ circles: found.value.circles, campaigns: found.value.campaigns }, { headers: PRIVATE });
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
