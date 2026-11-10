import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The prayer wall. GONE IN 1.9.
 *
 * His word of 2026-11-10: "I'd say remove the prayer wall and just keep the
 * prayer campaigns", and then "wall B": asking for prayers goes everywhere.
 * The one way to ask for prayer in Purify is a prayer campaign
 * (docs/1.9-build/notes/campaigns-fable.md, sections 21 and 26).
 *
 * The address stays for an app of 1.8, whose Pray together still draws the
 * wall. It is answered with a wall nobody is on, so that app shows "No one
 * is asking for prayers right now" and not an error; and with `intentions`
 * false, so its Ask button is the one tap it once was, which the profile's
 * route then refuses (app/api/profile/me). From 1.9 no request is shown to
 * anyone: nothing of anyone's is read here at all. The requests that stood
 * when 1.9 shipped are cleared fourteen days on
 * (lib/community/prayerRequestsEnd.ts).
 */
export async function GET(req: Request) {
  if (!communityEnabled()) return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  if (await rateLimited(`community-wall:${ipKey(req.headers)}`, 60, 60)) {
    return withCors(NextResponse.json({ error: "Too many requests." }, { status: 429 }), req);
  }
  return withCors(NextResponse.json({ requests: [], intentions: false }, { headers: { "Cache-Control": "private, no-store" } }), req);
}

export const OPTIONS = corsPreflight;
