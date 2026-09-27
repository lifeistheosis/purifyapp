import { NextResponse } from "next/server";

import { artCacheKey, parseArtParams } from "@/lib/desktop/artParams";
import { renderArt, UnknownSaintError } from "@/lib/desktop/artRender";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";

export const runtime = "nodejs";

/**
 * The pictures the desktop app shows on Discord (lib/desktop/artRender.ts).
 *
 * Discord's media proxy fetches these, not the reader, so there is no
 * account, cookie or CORS here: the URL alone says what to draw, the desktop
 * app builds it (desktop/src-tauri/src/presence.rs), and anything else is
 * refused by lib/desktop/artParams.ts. A given URL always draws the same
 * picture, so it may be cached for good; a small in-process cache saves the
 * redraw when several friends' clients ask at once.
 */

const MAX_CACHED = 200;
const cache = new Map<string, { body: Buffer; type: string }>();

export async function GET(req: Request) {
  const params = parseArtParams(new URL(req.url).searchParams);
  if (!params) return NextResponse.json({ error: "Unknown picture." }, { status: 400 });

  const key = artCacheKey(params);
  let hit = cache.get(key);
  if (!hit) {
    if (await rateLimited(`discord-art:${ipKey(req.headers)}`, 60, 240)) {
      return NextResponse.json({ error: "Too many pictures." }, { status: 429 });
    }
    try {
      hit = await renderArt(params);
    } catch (e) {
      if (e instanceof UnknownSaintError) return NextResponse.json({ error: "Unknown saint." }, { status: 404 });
      throw e;
    }
    if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value!);
    cache.set(key, hit);
  }

  return new Response(new Uint8Array(hit.body), {
    headers: {
      "Content-Type": hit.type,
      "Cache-Control": "public, max-age=604800, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
