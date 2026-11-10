import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { campaignsCaller } from "@/lib/campaigns/opening";
import { listCarried, listStarted } from "@/lib/campaigns/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A signed-in reader's own campaigns: those they started (the ones waiting
 * for a moderator and the ended among them), and those they carry, each with
 * their own choice of prayers and of days, which is how that choice reaches
 * their other devices (lib/campaigns/carried.ts, mergeCarried).
 *
 * Their own rows and nobody else's. A reader who is not signed in carries
 * campaigns on their device alone, and is answered with two empty lists
 * rather than a refusal: the page that asks is theirs to open either way.
 */
async function handleGET(req: Request) {
  const who = await campaignsCaller(req);
  if (!who.open) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const headers = { "Cache-Control": "private, no-store", Vary: "Origin, Authorization" };
  if (!who.user) return NextResponse.json({ started: [], carried: [], signedIn: false }, { headers });

  const admin = createAdminClient();
  const [started, carried] = await Promise.all([listStarted(admin, who.user.id), listCarried(admin, who.user.id)]);
  if (!started.ok || !carried.ok) {
    const absent = (!started.ok && started.why === "absent") || (!carried.ok && carried.why === "absent");
    return absent
      ? NextResponse.json({ error: "Not found." }, { status: 404 })
      : NextResponse.json({ error: "Your campaigns could not be read." }, { status: 500 });
  }
  return NextResponse.json({ started: started.value, carried: carried.value, signedIn: true }, { headers });
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
