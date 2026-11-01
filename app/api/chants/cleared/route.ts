import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { readSwitchedOn } from "@/lib/chants/cleared.server";

/**
 * The chant versions whose words as sung are cleared and switched on (build
 * 86 note 78): their lines, word timing and where they come from, for every
 * app to show in place of the public-domain wording it carries. Public, read
 * with the anon key and no cookies (lib/chants/cleared.server.ts), so row
 * level security answers only rows switched on, and never the clearance
 * record. Kept a minute at the edge, so a switch in the admin reaches the
 * apps within minutes (lib/chants/clearedClient.ts reads it).
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cleared = await readSwitchedOn();
  return withCors(
    NextResponse.json({ v: 1, cleared }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=240" } }),
    req,
  );
}

export const OPTIONS = corsPreflight;
