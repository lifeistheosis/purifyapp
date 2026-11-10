import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "I prayed", in answer to a reader's "pray for me". GONE IN 1.9.
 *
 * His word of 2026-11-10 ("wall B"): asking for prayers goes everywhere, the
 * wall, the line on a profile and its switch, I prayed and its notice. The
 * one way to ask for prayer in Purify is a prayer campaign
 * (docs/1.9-build/notes/campaigns-fable.md, section 26).
 *
 * The address stays for an app of 1.8, which may still hold a button drawn
 * before the website changed. It is told what that app already has words
 * for, that nobody is asking just now, which is true: no request stands for
 * anyone. Nothing is read and nothing is written: no row, no notice.
 */
async function handlePOST() {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ error: "They are not asking just now.", code: "no_request" }, { status: 409 });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
