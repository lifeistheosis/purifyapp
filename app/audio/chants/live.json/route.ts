import { NextResponse } from "next/server";

import base from "@/data/chants-live.json";
import { withPulls, type LiveListFile } from "@/lib/chants/pulls";
import { activePulls } from "@/lib/chants/pulls.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /audio/chants/live.json: which chant recordings may play (lib/chants/live.ts
 * reads it, in every app and on the website).
 *
 * It was a file in public/. It is the committed list (data/chants-live.json)
 * less every recording switched off from the admin (admin item A7,
 * lib/chants/pulls.ts), at the same address, so the apps already installed
 * take a takedown within minutes, with nothing to update. When the
 * takedowns cannot be read, it is the committed list unchanged: what every app
 * read before.
 *
 * The same headers the file had (next.config.ts, the chant media rule): any
 * origin may read it (the apps are https://localhost and capacitor://localhost),
 * and it is kept five minutes, so a takedown spreads fast. The apps' export does
 * not carry it (scripts/native-build.mjs): they ask the website.
 */
export async function GET() {
  const list = withPulls(base as LiveListFile, await activePulls());
  return NextResponse.json(list, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
