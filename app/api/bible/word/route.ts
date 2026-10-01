import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { englishChapter, greekAlignment, greekChapter, testamentOf, wordIndex } from "@/lib/bible/greekText";
import { strongs } from "@/lib/bible/strongs";

/**
 * The Greek word study (a Purify Plus tool, gated in the reader): every verse
 * a Strong's number stands in, in the Septuagint or the New Testament.
 *
 * GET ?s=746&t=ot|nt&offset=0 answers the word's dictionary entry, how often
 * it appears in each testament, and thirty verses from `offset`, each with its
 * Greek (the forms of the word marked) and its English where the two pair
 * verse for verse (greekAlignment). Public, because the texts are public
 * domain; the Plus line is drawn in the reader. Cached a day: the Bible does
 * not change.
 */

const PAGE = 30;

export type WordStudyItem = {
  /** The verse as the Greek numbers it, "psalms.50.3": unique, for keys. */
  ref: string;
  book: string;
  chapter: number;
  /** As Purify's English numbers it where the two pair, else as the Greek. */
  verse: number;
  greek: string;
  /** The word's forms in this verse, for marking in `greek`. */
  forms: string[];
  /** Purify's English for the verse, or null where the Greek cannot be paired
   *  with it verse for verse (or stands in a psalm's title). */
  english: string | null;
  href: string;
};

async function handleGET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const s = (url.searchParams.get("s") ?? "").replace(/^G/i, "");
  const t = url.searchParams.get("t") === "nt" ? "nt" : "ot";
  const offset = Math.max(0, Math.min(100_000, Number(url.searchParams.get("offset")) || 0));
  if (!/^\d{1,5}$/.test(s)) return NextResponse.json({ error: "Give a Strong's number." }, { status: 400 });

  const index = await wordIndex();
  const entry = index.get(s);
  const lexicon = strongs(s);
  const verses = (entry?.verses ?? []).filter((ref) => testamentOf(ref.split(".")[0]) === t);

  const items: WordStudyItem[] = [];
  for (const ref of verses.slice(offset, offset + PAGE)) {
    const [book, c, v] = ref.split(".");
    const chapter = Number(c);
    const verse = Number(v);
    const [greek, shift] = await Promise.all([greekChapter(book, chapter), greekAlignment(book, chapter)]);
    // Swete can carry one verse number twice (the Septuagint's added lines).
    const parts = greek?.verses.filter((x) => x.n === verse) ?? [];
    if (parts.length === 0) continue;
    const tokens = parts.flatMap((x) => x.tokens ?? []);
    const forms = [...new Set(tokens.filter((tok) => tok.s === s).map((tok) => tok.w))];
    const englishVerse = shift !== null && verse > shift ? verse - shift : null;
    let english: string | null = null;
    if (englishVerse !== null) {
      const e = await englishChapter(book, chapter);
      english = e?.verses.find((x) => x.n === englishVerse)?.text ?? null;
    }
    items.push({
      ref,
      book,
      chapter,
      verse: english !== null && englishVerse !== null ? englishVerse : verse,
      greek: parts.map((x) => x.text).join(" "),
      forms,
      english,
      href: english !== null ? `/bible/${book}/${chapter}#v${englishVerse}` : `/bible/${book}/${chapter}`,
    });
  }

  return NextResponse.json(
    {
      strongs: s,
      lemma: lexicon?.l ?? null,
      translit: lexicon?.t ?? null,
      gloss: lexicon?.d?.trim() ?? null,
      counts: { nt: entry?.nt ?? 0, ot: entry?.ot ?? 0 },
      verses: { nt: (entry?.verses ?? []).filter((r) => testamentOf(r.split(".")[0]) === "nt").length, ot: (entry?.verses ?? []).filter((r) => testamentOf(r.split(".")[0]) === "ot").length },
      testament: t,
      offset,
      next: offset + PAGE < verses.length ? offset + PAGE : null,
      items,
    },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
  );
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
