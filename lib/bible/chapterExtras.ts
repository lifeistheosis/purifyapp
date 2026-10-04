import "server-only";

import { allChapterParams, getBook } from "./books";
import { chapterCrossRefs, isCrossRefBook } from "./crossRefs";
import type { CrossRefItem } from "./crossRefShape";
import { greekAlignment, numberedAsEnglish } from "./greekText";
import { interlinearAvailable } from "./interlinearBooks";
import { loadCommentary, loadEnglishTagged, loadOriginal, type ChapterCommentary, type Token } from "./load";
import { strongsAll, type StrongsEntry } from "./strongs";

/**
 * What a chapter carries besides its verses, as files of their own.
 *
 * Until 1.5.1 the chapter page handed all of it to the reader as props: the
 * Fathers' commentary, the Greek word by word, the English tagged to pair
 * with it, a Strong's lexicon cut down to the chapter, the cross-references.
 * Next writes a client component's props into the page's HTML and again into
 * the payload the app reads between pages, so every chapter carried all of it
 * twice whether or not the reader ever opened any of it. Measured on the 1.5
 * export: 96 MB of props across 1,362 chapters became 462 MB of the app's
 * 720, and John 1 alone was a 1.18 MB page to show 51 verses.
 *
 * Now the page carries the verses and which verses have something behind
 * them, and each of these is a static file the reader fetches when it is
 * asked for (app/bible-data/, lib/bible/chapterData.ts). Static, so they ship
 * inside the apps and open with no network, the way app/search-corpus.json
 * does.
 *
 * This module is the one place those files are built, and the page asks it
 * the same questions, so the two cannot disagree about which chapter has what.
 */

/** The Greek beside a chapter, as the reader draws it. */
export type ChapterInterlinear = {
  /** Verse number to the Greek as running text. */
  text: Record<number, string>;
  /** Verse number to the Greek word by word, Strong's-tagged where it is known. */
  tokens: Record<number, Token[]>;
  /** Verse number to the English word by word, tagged to pair with the Greek. */
  english: Record<number, { w: string; s?: string }[]>;
};

/**
 * Whether the Greek can stand beside this chapter. "shown": verse for verse.
 * "apart": the book has Greek but this chapter is numbered differently, so a
 * note says why it is missing. "none": the book has none.
 */
export async function interlinearState(book: string, chapter: number): Promise<"shown" | "apart" | "none"> {
  const b = getBook(book);
  if (!b || !interlinearAvailable(book, b.testament)) return "none";
  return (await greekAlignment(book, chapter)) === null ? "apart" : "shown";
}

export async function chapterInterlinear(book: string, chapter: number): Promise<ChapterInterlinear | null> {
  if ((await interlinearState(book, chapter)) !== "shown") return null;
  const offset = await greekAlignment(book, chapter);
  const [asNumbered, englishTagged] = await Promise.all([loadOriginal(book, chapter), loadEnglishTagged(book, chapter)]);
  // Renumbered past a psalm's title where Swete counts it (lib/bible/greekText.ts).
  const original = asNumbered && offset ? numberedAsEnglish(asNumbered, offset) : asNumbered;

  const out: ChapterInterlinear = { text: {}, tokens: {}, english: {} };
  for (const v of original?.verses ?? []) {
    out.text[v.n] = v.text;
    if (v.tokens?.length) out.tokens[v.n] = v.tokens;
  }
  for (const v of englishTagged?.verses ?? []) {
    if (v.tokens?.length) out.english[v.n] = v.tokens;
  }
  return out;
}

// A build asks for each New Testament chapter's references twice, once to
// list the files and once to write each, and placing them reads the verses
// they point to. Asked once, answered from here after.
const crossRefsAsked = new Map<string, Promise<Record<number, CrossRefItem[]> | null>>();

/** Cross-references for a chapter (New Testament only), or null when it has none. */
export function chapterCrossRefFile(book: string, chapter: number): Promise<Record<number, CrossRefItem[]> | null> {
  if (!isCrossRefBook(book)) return Promise.resolve(null);
  const key = `${book}/${chapter}`;
  let asked = crossRefsAsked.get(key);
  if (!asked) {
    asked = chapterCrossRefs(book, chapter).then((refs) => (Object.keys(refs).length ? refs : null));
    crossRefsAsked.set(key, asked);
  }
  return asked;
}

/** The verses of a chapter that have cross-references: what the page needs to draw the mark. */
export async function crossRefVerses(book: string, chapter: number): Promise<number[]> {
  const refs = await chapterCrossRefFile(book, chapter);
  return refs ? Object.keys(refs).map(Number) : [];
}

/** The Fathers on a chapter, or null when nobody is quoted on it. */
export async function chapterCommentaryFile(book: string, chapter: number): Promise<ChapterCommentary | null> {
  const commentary = await loadCommentary(book, chapter);
  return Object.values(commentary).some((notes) => notes.length > 0) ? commentary : null;
}

/** The whole Strong's lexicon, keyed by the bare number the tokens carry ("25"). One file for every chapter. */
export function strongsFile(): Record<string, StrongsEntry> {
  return strongsAll();
}

type FileParam = { book: string; file: string };

/** Every (book, "<chapter>.json") for which `has` answers yes: the files a build writes. */
async function filesWhere(has: (book: string, chapter: number) => Promise<boolean>): Promise<FileParam[]> {
  const out: FileParam[] = [];
  for (const { book, chapter } of allChapterParams()) {
    if (await has(book, Number(chapter))) out.push({ book, file: `${chapter}.json` });
  }
  return out;
}

export const interlinearFiles = () => filesWhere(async (b, c) => (await interlinearState(b, c)) === "shown");
export const crossRefFiles = () => filesWhere(async (b, c) => (await chapterCrossRefFile(b, c)) !== null);
export const commentaryFiles = () => filesWhere(async (b, c) => (await chapterCommentaryFile(b, c)) !== null);

/** "12.json" to 12; null for anything that is not a chapter file's name. */
export function chapterOfFile(file: string): number | null {
  const m = /^([1-9]\d{0,2})\.json$/.exec(file);
  return m ? Number(m[1]) : null;
}
