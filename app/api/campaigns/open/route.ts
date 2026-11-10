import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { campaignsCaller } from "@/lib/campaigns/opening";
import { campaignParts } from "@/lib/campaigns/parts";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Are prayer campaigns open for whoever is asking? `{ open: true }` with the
 * parts of campaigns that are switched on (lib/campaigns/parts.ts), or the
 * same 404 a closed feature gives, and nothing else. An app learns the parts
 * here and nowhere else, so turning one on is the website's alone to do.
 *
 * Asked once by a screen that would draw a door to campaigns
 * (lib/campaigns/useCampaignsOpen.ts), and only by a build that has the
 * pages in it: a closed build never sends this. While campaigns are open to
 * testers alone (lib/campaigns/flags.ts) the answer is yes for the accounts
 * the server names as admins, by the list Testers mode asks about
 * (app/api/admin/whoami), and no for everyone else. Held to a budget by
 * address, so the question cannot be asked in bulk.
 */
async function handleGET(req: Request) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Origin, Authorization" };
  if (await rateLimited(`campaigns-open:${ipKey(req.headers)}`, 60, 30)) {
    return NextResponse.json({ error: "Not found." }, { status: 404, headers });
  }
  const who = await campaignsCaller(req);
  if (!who.open) return NextResponse.json({ error: "Not found." }, { status: 404, headers });
  return NextResponse.json({ open: true, parts: campaignParts() }, { headers });
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
