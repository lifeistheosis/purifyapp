import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { MIN_WORDS, findQuote, normWords } from "@/lib/quotes/find";
import { rateLimited } from "@/lib/security/ratelimit";

export const runtime = "nodejs";

/**
 * "Who said it" (1.8): GET ?q=<a line> answers where the line stands in the
 * texts the app carries word for word (lib/quotes/find.ts), best first, or
 * an empty list. Public, because the texts are; limited per address, since
 * each question reads every paragraph. Same line, same answer: cached a day.
 */
const MAX_CHARS = 600;

async function handleGET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, MAX_CHARS);
  if (normWords(q).length < MIN_WORDS) {
    return NextResponse.json({ error: "too-short", min: MIN_WORDS }, { status: 400 });
  }
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (await rateLimited(`quotes-find:${ip}`, 60, 20)) {
    return NextResponse.json({ error: "slow-down" }, { status: 429 });
  }
  return NextResponse.json(
    { found: findQuote(q) },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
