import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

export type Token = {
  /** Greek word as it appears in the source text. */
  w: string;
  /** Strong's number (e.g. "25" for ἀγαπάω). Absent on punctuation or LXX
   *  words not in the shared NT-derived index. */
  s?: string;
  /** Morphology code (e.g. "V-AAI-3S"). NT tokens have this. LXX tokens
   *  don't yet (parse data is harder to source for the Septuagint). */
  p?: string;
};
export type Verse = {
  n: number;
  text: string;
  /** Word-by-word tokens with Strong's + parse. Present on tagged NT chapters,
   *  absent on untagged OT (Greek LXX) chapters. */
  tokens?: Token[];
};
export type Chapter = {
  book: string;
  name: string;
  chapter: number;
  verses: Verse[];
  source: string;
};

const DATA_DIR = path.join(process.cwd(), "data", "bible");

export async function loadChapter(
  bookSlug: string,
  chapter: number,
): Promise<Chapter | null> {
  try {
    const file = path.join(DATA_DIR, bookSlug, `${chapter}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as Chapter;
  } catch {
    return null;
  }
}

/**
 * Loads a contiguous verse range from a chapter. Used by the daily readings
 * panel on the calendar to render the appointed Epistle and Gospel inline.
 * The book name is returned for display alongside the verses.
 */
export async function loadVerseRange(
  bookSlug: string,
  chapter: number,
  from: number,
  to: number,
): Promise<{ name: string; verses: Verse[] } | null> {
  const ch = await loadChapter(bookSlug, chapter);
  if (!ch) return null;
  const verses = ch.verses.filter((v) => v.n >= from && v.n <= to);
  return { name: ch.name, verses };
}

/**
 * Loads the original-language (Greek NT or Greek LXX OT) text for a chapter.
 * Returns null if the chapter has no original-language file. Same shape as
 * loadChapter so the reader can treat it interchangeably.
 *
 * Susanna and Bel used to be named here as known gaps. They are Daniel 13
 * and 14 now (scripts/fetch-daniel-additions.mjs); a null from this function
 * means a genuinely absent file, not a section we chose not to ship.
 */
export async function loadOriginal(
  bookSlug: string,
  chapter: number,
): Promise<Chapter | null> {
  try {
    const file = path.join(
      DATA_DIR,
      "original",
      bookSlug,
      `${chapter}.json`,
    );
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as Chapter;
  } catch {
    return null;
  }
}

export type EnglishTaggedChapter = {
  book: string;
  chapter: number;
  verses: { n: number; tokens: Token[] }[];
};

/**
 * Loads KJV English with Strong's tags per word. Used by the Interlinear
 * column to highlight the English word that maps to the hovered Greek word.
 * Returns null when no tagged English file exists (currently NT only).
 *
 * Defensively scrubs ingestion artifacts (`<em>` italic markers, orphan
 * `G####]` Strong's-bracket fragments) so the UI is robust even if a stale
 * data file slips through.
 */
export async function loadEnglishTagged(
  bookSlug: string,
  chapter: number,
): Promise<EnglishTaggedChapter | null> {
  try {
    const file = path.join(
      DATA_DIR,
      "english-tagged",
      bookSlug,
      `${chapter}.json`,
    );
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as EnglishTaggedChapter;
    parsed.verses = parsed.verses.map((v) => ({
      n: v.n,
      tokens: scrubTokens(v.tokens),
    }));
    return parsed;
  } catch {
    return null;
  }
}

function scrubTokens(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const t of tokens ?? []) {
    let w = (t.w ?? "").trim();
    w = w.replace(/<\/?[a-zA-Z][^>]*>/g, "");
    w = w.replace(/\[G\d+\]?/g, "").replace(/G\d+\]/g, "");
    w = w.replace(/[<>]/g, "").trim();
    if (!w) continue;
    out.push(t.s ? { w, s: t.s, ...(t.p ? { p: t.p } : {}) } : { w });
  }
  return out;
}

export type CrossRef = { display: string; votes: number };
export type ChapterCrossRefs = Record<string, CrossRef[]>;

export async function loadCrossRefs(
  bookSlug: string,
  chapter: number,
): Promise<ChapterCrossRefs> {
  try {
    const file = path.join(DATA_DIR, "cross-refs", bookSlug, `${chapter}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as ChapterCrossRefs;
  } catch {
    return {};
  }
}

export async function loadIntro(bookSlug: string): Promise<string | null> {
  try {
    const file = path.join(DATA_DIR, "intros", `${bookSlug}.md`);
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

export type CommentaryNote = {
  author: string;
  work: string;
  citation: string;
  text: string;
  /**
   * An optional editorial digest: one or two sentences, third person, in
   * Purify's voice, saying what the Father is arguing here. Never a paraphrase
   * presented as his words, which docs/editorial-standards.md forbids
   * absolutely; a summary ABOUT the text, which the same document permits.
   *
   * Optional on purpose. Most notes will not have one for a long time, and a
   * note without a digest renders exactly as it does today rather than showing
   * an empty label.
   */
  digest?: string;
};
export type ChapterCommentary = Record<string, CommentaryNote[]>;

export async function loadCommentary(
  bookSlug: string,
  chapter: number,
): Promise<ChapterCommentary> {
  try {
    const file = path.join(DATA_DIR, "commentary", bookSlug, `${chapter}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as ChapterCommentary;
  } catch {
    return {};
  }
}
