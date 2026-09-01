import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { servedRelease } from "@/lib/appUpdate/release";

/**
 * What the store is currently serving, for the installed app to compare
 * itself against.
 *
 * This is an API route and not a static file in public/ for one reason:
 * CORS. The native shell runs from https://localhost and calls purifyapp.net
 * cross-origin, and a plain static asset gets none of the origin allow-list
 * treatment in lib/api/cors.ts. That is exactly how Android analytics was
 * silently dead for the life of the app: /api/track refused every
 * cross-origin post from the shell. A version check that only ever worked on
 * the web would be the same bug wearing a different hat.
 *
 * servedRelease(), not the raw constant: the two store build numbers can be
 * set from the environment so a store approval can start prompting without a
 * deploy. See lib/appUpdate/release.ts for why that direction is the safe one.
 *
 * Cached for an hour at the edge. The answer changes once per release, and a
 * reader who learns about an update fifty minutes late has lost nothing. Note
 * that this cache also delays an env change by up to an hour.
 */
export async function GET(req: Request) {
  return withCors(
    NextResponse.json(servedRelease(), {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    }),
    req,
  );
}

export const OPTIONS = corsPreflight;
