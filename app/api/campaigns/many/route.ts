import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { isManySpan } from "@/lib/campaigns/model";
import { campaignsCaller } from "@/lib/campaigns/opening";
import { campaignPart } from "@/lib/campaigns/parts";
import { listMany } from "@/lib/campaigns/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = () => NextResponse.json({ error: "Not found." }, { status: 404 });
const PRIVATE = { "Cache-Control": "private, no-store", Vary: "Origin, Authorization" };

/**
 * "Prayed by many" (his item 118): the board's second list, over a day, a
 * week, a month or a year (?span=). An order of campaigns and never a figure
 * (lib/campaigns/server.ts, listMany).
 *
 * SWITCHED OFF ON THE SERVER (lib/campaigns/parts.ts) since it was built:
 * while it is off this answers 404 and reads nothing, whoever asks and
 * whatever campaigns' own switch says.
 */
async function handleGET(req: Request) {
  if (!campaignPart("many")) return NOT_FOUND();
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  if (await rateLimited(`campaigns-many:${ipKey(req.headers)}`, 60, 30)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const span = new URL(req.url).searchParams.get("span") ?? "week";
  if (!isManySpan(span)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const listed = await listMany(createAdminClient(), { userId: who.user?.id ?? null, span });
  if (!listed.ok) return listed.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "The campaigns could not be read." }, { status: 500 });
  return NextResponse.json(listed.value, { headers: PRIVATE });
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
