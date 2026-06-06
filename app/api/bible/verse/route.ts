import { NextResponse, type NextRequest } from "next/server";
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
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const result = await loadVerseRange(book, chapter, from, to);
  if (!result || result.verses.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      name: result.name,
      verses: result.verses.map((v) => ({ n: v.n, text: v.text })),
    },
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } },
  );
}
