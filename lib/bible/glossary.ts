// Reader glossary for the 19th century English of the patristic translations.
//
// The texts are public-domain NPNF/ANF/Schaff and cannot be modernised: a
// paraphrase kept inside quotation marks is the one absolute prohibition in
// docs/editorial-standards.md, and every modern translation is copyrighted. So
// the Father's words stay exactly as printed and the reader is handed the
// vocabulary instead.
//
// WHAT IS MARKED, AND WHY NOT EVERYTHING
//
// "thou" occurs 23,677 times in the commentary corpus, "ye" 9,128, "hath"
// 8,767. Decorating those would put a dotted underline under roughly every
// third word and make the page unreadable in the name of making it readable.
// They are also the words a reader guesses correctly without help.
//
// So only two kinds are marked:
//   * false-friend: looks modern, means something else. "economy" is God's
//     ordering of salvation, not finance. "condescension" is God stooping to
//     us, said with gratitude. A reader does not know they have misread these,
//     which is what makes them worth interrupting for.
//   * term: precise theological or ecclesial vocabulary.
//
// The plain older forms stay in the data, unmarked, so a future long-press or
// dictionary surface can reach them without a second source of truth.

import glossary from "@/data/glossary/archaic.json";

export type GlossaryKind = "form" | "false-friend" | "term";

export type GlossaryEntry = {
  word: string;
  kind: GlossaryKind;
  gloss: string;
  /** Occurrences in data/bible/commentary when the entry was added. */
  n?: number;
};

const ENTRIES: GlossaryEntry[] = (
  glossary as { entries: GlossaryEntry[] }
).entries;

const BY_WORD = new Map<string, GlossaryEntry>(
  ENTRIES.map((e) => [e.word.toLowerCase(), e]),
);

/** Kinds worth interrupting the reader for. See the header. */
const MARKED: ReadonlySet<GlossaryKind> = new Set(["false-friend", "term"]);

export function lookup(word: string): GlossaryEntry | null {
  return BY_WORD.get(word.toLowerCase().replace(/[^a-z]/gi, "")) ?? null;
}

export function isMarked(entry: GlossaryEntry): boolean {
  return MARKED.has(entry.kind);
}

/**
 * One alternation of every marked word, longest first so that a longer word is
 * never shadowed by a shorter one that prefixes it. Word-boundary anchored, so
 * "meat" never matches inside "meaty".
 *
 * Built once at module load. Rebuilding it per paragraph showed up immediately
 * on chapters with hundreds of notes.
 */
const MARKED_RE: RegExp | null = (() => {
  const words = ENTRIES.filter(isMarked)
    .map((e) => e.word)
    .filter((w) => /^[a-z]+$/i.test(w))
    .sort((a, b) => b.length - a.length);
  if (words.length === 0) return null;
  return new RegExp(`\\b(${words.join("|")})\\b`, "gi");
})();

export type Segment =
  | { text: string; entry?: undefined }
  | { text: string; entry: GlossaryEntry };

/**
 * Split a paragraph into plain runs and glossed words, in order.
 *
 * Returns a single plain segment when nothing matches, which is the common
 * case, so callers can render the fast path without allocating.
 */
export function segment(paragraph: string): Segment[] {
  if (!MARKED_RE) return [{ text: paragraph }];
  MARKED_RE.lastIndex = 0;

  const out: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = MARKED_RE.exec(paragraph)) !== null) {
    const entry = lookup(m[0]);
    if (!entry) continue;
    if (m.index > last) out.push({ text: paragraph.slice(last, m.index) });
    out.push({ text: m[0], entry });
    last = m.index + m[0].length;
  }
  if (out.length === 0) return [{ text: paragraph }];
  if (last < paragraph.length) out.push({ text: paragraph.slice(last) });
  return out;
}

/** Every entry, for a glossary index page or tests. */
export function allEntries(): GlossaryEntry[] {
  return ENTRIES;
}
