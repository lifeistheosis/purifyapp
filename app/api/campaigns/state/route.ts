import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { campaignsCaller } from "@/lib/campaigns/opening";
import { campaignStates } from "@/lib/campaigns/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { campaignStateSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where the campaigns a device carries stand: ids in, states out
 * (lib/campaigns/server.ts, campaignStates). This is how a campaign leaves a
 * reader's prayers when its creator ends it or a moderator takes it down:
 * the app asks the next time it is online, and lets go of any that are over
 * (lib/campaigns/carried.ts, settleCarried).
 *
 * No account is needed, because carrying a campaign needs none (one kept to
 * a circle is the exception: it answers "gone" to anyone but its creator and
 * that circle's members, by the caller's own token). It answers
 * "running", "over" or "gone" and nothing more, so all an id can be made to
 * say is whether that campaign still runs. Never which campaigns a reader
 * carries: the ids are read, answered and forgotten.
 */
async function handlePOST(req: Request) {
  const who = await campaignsCaller(req);
  if (!who.open) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (await rateLimited(`campaign-state:${ipKey(req.headers)}`, 3600, 120)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = campaignStateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const states = await campaignStates(createAdminClient(), parsed.data.ids, Date.now(), who.user?.id ?? null);
  if (!states.ok) {
    return states.why === "absent"
      ? NextResponse.json({ error: "Not found." }, { status: 404 })
      : NextResponse.json({ error: "The campaigns could not be read." }, { status: 500 });
  }
  return NextResponse.json({ states: states.value }, { headers: { "Cache-Control": "private, no-store" } });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
