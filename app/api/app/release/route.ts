import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { CURRENT_RELEASE } from "@/lib/appUpdate/release";

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
 * Cached for an hour at the edge. The answer changes once per release, and a
 * reader who learns about an update fifty minutes late has lost nothing.
 */
export async function GET(req: Request) {
  return withCors(
    NextResponse.json(CURRENT_RELEASE, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    }),
    req,
  );
}

export const OPTIONS = corsPreflight;
