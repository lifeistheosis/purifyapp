import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { SAINTS } from "@/lib/saints/saints";

export const runtime = "nodejs";

/**
 * The saints a reader can choose as their patron: every registry saint with a
 * feast day, by name. Only those, because the name-day email is sent on the
 * feast, and a patron with no feast day would never get one.
 *
 * A route rather than an import because lib/saints/saints.ts is five thousand
 * lines of lives and writings, and the picker needs two strings per saint.
 * Public and the same for everyone, so it caches for a day.
 */
async function handleGET() {
  const patrons = SAINTS.filter((s) => s.feastDays && s.feastDays.length > 0)
    .map((s) => ({ slug: s.slug, name: s.name }))
    .sort((a, b) => a.name.replace(/^St\.?\s+/, "").localeCompare(b.name.replace(/^St\.?\s+/, "")));
  return NextResponse.json(
    { patrons },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
