import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { currentPacks } from "@/lib/packs/server";

/**
 * Content packs for the apps: what they can learn without a store build.
 * See lib/packs/types.ts for what a pack is, and docs/PACKS.md for how a
 * content drop uses it.
 *
 * An API route rather than a file in public/ for the reason
 * /api/app/release gives: the apps call it cross-origin from
 * https://localhost and capacitor://localhost, and only a route gets the
 * origin allow-list in lib/api/cors.ts. Under app/api it is also left out of
 * the app exports by scripts/native-build.mjs, which is right: an app never
 * asks itself for packs.
 *
 * Dynamic: the answer moves with the day and with the board message, and is
 * kept in memory for five minutes (lib/packs/server.ts). A phone keeps it
 * five minutes too.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const packs = await currentPacks();
    return withCors(
      NextResponse.json(packs, {
        headers: { "Cache-Control": "public, max-age=300" },
      }),
      req,
    );
  } catch {
    // The apps keep what they have when this fails; say so plainly rather
    // than with a half-built answer.
    return withCors(
      NextResponse.json({ error: "packs unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }),
      req,
    );
  }
}

export const OPTIONS = corsPreflight;
