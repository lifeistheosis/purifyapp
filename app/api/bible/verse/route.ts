import { NextResponse, type NextRequest } from "next/server";
import { corsPreflight, withCors } from "@/lib/api/cors";
import { loadVerseRange } from "@/lib/bible/load";

export const runtime = "nodejs";

/**
 * Serves the English text for a verse (or contiguous range) so client
 * surfaces that only hold a citation — like the /saved list — can show what
 * a bookmarked verse actually says without navigating away.
 *
 *   /api/bible/verse?book=matthew&chapter=22&verse=37
 *   /api/bible/verse?book=matthew&chapter=22&from=37&to=40
 *
 * Public, deterministic scripture text → cacheable. Returns the canonical
 * book name plus the verses in range.
 *
 * CORS is not optional here. /bible/multi renders client-side and calls this
 * through apiFetch, so in the native shell the request comes from
 * https://localhost against purifyapp.net. Without the allow-origin header the
 * browser blocks it and the multi-reference view silently shows every
 * reference as unresolved, while working perfectly in a desktop browser.
 * Verified against production on 2026-07-26: this route answered 200 with no
 * access-control-allow-origin at all.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const book = sp.get("book") ?? "";
  const chapter = Number(sp.get("chapter"));
  const single = sp.get("verse");
  const from = Number(sp.get("from") ?? single);
  const to = Number(sp.get("to") ?? single);

  if (
    !/^[a-z0-9-]+$/.test(book) ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 1 ||
    to < from ||
    to - from > 200
  ) {
    return withCors(
      NextResponse.json({ error: "Bad request" }, { status: 400 }),
      req,
    );
  }

  const result = await loadVerseRange(book, chapter, from, to);
  if (!result || result.verses.length === 0) {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }), req);
  }

  return withCors(
    NextResponse.json(
      {
        name: result.name,
        verses: result.verses.map((v) => ({ n: v.n, text: v.text })),
      },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } },
    ),
    req,
  );
}

export const OPTIONS = corsPreflight;
