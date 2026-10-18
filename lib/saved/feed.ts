/**
 * Your saved as one list (1.7, the owner's note 21: "one list, newest first,
 * with a slim row of filter chips on top ... instead of many sections").
 *
 * Pure. Two stores feed it: the bookmarks (lib/bookmarks.ts, every kind a
 * reader can star) and the verse highlights (lib/bible/annotations.ts),
 * which were not on Saved at all before. A verse that is both starred and
 * highlighted is ONE row, carrying both, with its colour.
 *
 * Order: newest first, by when it was saved or last marked. Highlights made
 * before 1.7 carry no date; they come after the dated ones, in the order of
 * the Bible.
 *
 * The chips: All, Verses, Highlights, Writings, Prayers, Saints, Readings,
 * then Icons when there are any, and History last when there is any. A chip
 * with nothing in it is not shown.
 *
 * From 1.8 a third store feeds it: the paragraphs of the Fathers a reader
 * highlighted (lib/saints/annotations.ts). The You tab counted them as
 * "Paragraphs" and its tile opened this list, where they were not; now they
 * are rows under Writings, beside the sections of works a reader starred,
 * and Saints holds the saints themselves. Their words and the work's title
 * come from the work's own file when the row is near the screen
 * (lib/saved/passages.ts), so the saints' registry stays out of this page.
 *
 * Verses holds every verse kept, starred or highlighted (1.8): a highlighted
 * verse is a verse the reader kept, and the You tab's count of verses has to
 * be what this chip shows. Highlights is the same verses seen by their
 * colour, with the highlighted paragraphs.
 */

import { BOOKS } from "@/lib/bible/books";
import type { Bookmark } from "@/lib/bookmarks";

export type SavedHighlight = {
  book: string;
  chapter: number;
  verse: number;
  /** The colour's id (lib/bible/highlightColors.ts). */
  color: string;
  /** The whole verse is highlighted. */
  whole: boolean;
  /** Word-level highlights, by word index, when there are any. */
  words: number[];
  /** The note on the verse, kept when the highlight goes. */
  note?: string;
  /** When the verse was last marked (ISO), or null for a highlight from before 1.7. */
  at: string | null;
};

/** A highlighted paragraph of the Fathers (1.8). */
export type SavedPassage = {
  saintSlug: string;
  workSlug: string;
  /** The section's own number: the #s anchor of the work's page. */
  sectionN: number;
  /** The paragraph's place in its section, from 0. */
  paragraphIdx: number;
  /** The note on the paragraph, kept when the highlight goes. */
  note?: string;
  /** When it was last marked (ISO), or null for one from before 1.7. */
  at: string | null;
};

export type SavedItem = {
  /** Stable across renders and removals: the row's React key. */
  key: string;
  bookmark: Bookmark | null;
  highlight: SavedHighlight | null;
  /** A highlighted paragraph of the Fathers, for a row that is one (1.8). */
  passage?: SavedPassage | null;
  /** When it was saved or marked (ms), or null when nobody knows. */
  at: number | null;
};

export type SavedFilter = "all" | "verses" | "highlights" | "writings" | "prayers" | "saints" | "readings" | "icons" | "history";

export const FILTERS: readonly SavedFilter[] = ["all", "verses", "highlights", "writings", "prayers", "saints", "readings", "icons", "history"];

export function isSavedFilter(v: unknown): v is SavedFilter {
  return typeof v === "string" && (FILTERS as readonly string[]).includes(v);
}

const PREFIX = "purify:bible:";
const SAINT_PREFIX = "purify:saint:";

/** A highlighted paragraph from one localStorage entry, or null. */
export function passageFrom(key: string, raw: string | null): SavedPassage | null {
  if (!key.startsWith(SAINT_PREFIX) || !raw) return null;
  const [, , saintSlug, workSlug, section, paragraph] = key.split(":");
  const sectionN = Number(section);
  const paragraphIdx = Number(paragraph);
  if (!saintSlug || !workSlug || !Number.isInteger(sectionN) || !Number.isInteger(paragraphIdx)) return null;
  try {
    const value = JSON.parse(raw) as { highlighted?: unknown; note?: unknown; at?: unknown };
    if (value.highlighted !== true) return null;
    return {
      saintSlug,
      workSlug,
      sectionN,
      paragraphIdx,
      ...(typeof value.note === "string" && value.note.trim() ? { note: value.note } : {}),
      at: typeof value.at === "string" ? value.at : null,
    };
  } catch {
    return null;
  }
}

/** The key a paragraph's row goes by. */
export function passageKey(p: Pick<SavedPassage, "saintSlug" | "workSlug" | "sectionN" | "paragraphIdx">): string {
  return `passage:${p.saintSlug}:${p.workSlug}:${p.sectionN}:${p.paragraphIdx}`;
}

/** A highlighted verse from one localStorage entry, or null. */
export function highlightFrom(key: string, raw: string | null): SavedHighlight | null {
  if (!key.startsWith(PREFIX) || !raw) return null;
  const [, , book, chapter, verse] = key.split(":");
  const ch = Number(chapter);
  const v = Number(verse);
  if (!book || !Number.isInteger(ch) || !Number.isInteger(v)) return null;
  try {
    const value = JSON.parse(raw) as {
      highlighted?: unknown;
      highlightedWords?: unknown;
      color?: unknown;
      note?: unknown;
      at?: unknown;
      hlAt?: unknown;
    };
    const words = Array.isArray(value.highlightedWords) ? value.highlightedWords.filter((n): n is number => Number.isInteger(n)) : [];
    const whole = value.highlighted === true;
    if (!whole && words.length === 0) return null;
    return {
      book,
      chapter: ch,
      verse: v,
      color: typeof value.color === "string" && value.color ? value.color : "yellow",
      whole,
      words,
      ...(typeof value.note === "string" && value.note.trim() ? { note: value.note } : {}),
      // When it was highlighted; else when it last changed; else unknown.
      at: typeof value.hlAt === "string" ? value.hlAt : typeof value.at === "string" ? value.at : null,
    };
  } catch {
    return null;
  }
}

const BOOK_ORDER = new Map(BOOKS.map((b, i) => [b.slug, i]));

/** The Bible's own order, for highlights that have no date. */
function canonical(a: SavedHighlight, b: SavedHighlight): number {
  const ba = BOOK_ORDER.get(a.book) ?? 999;
  const bb = BOOK_ORDER.get(b.book) ?? 999;
  return ba - bb || a.chapter - b.chapter || a.verse - b.verse;
}

const verseKey = (book: string, chapter: number, verse: number) => `verse:${book}:${chapter}:${verse}`;

/**
 * One row per thing, newest first; undated highlights after, in canonical
 * order, and undated paragraphs of the Fathers after those, by their place.
 */
export function savedFeed(
  bookmarks: readonly Bookmark[],
  highlights: readonly SavedHighlight[],
  passages: readonly SavedPassage[] = [],
): SavedItem[] {
  const byVerse = new Map<string, SavedHighlight>();
  for (const h of highlights) byVerse.set(verseKey(h.book, h.chapter, h.verse), h);

  const out: SavedItem[] = [];
  const used = new Set<string>();
  for (const b of bookmarks) {
    if (b.kind === "bible-verse") {
      const vk = verseKey(b.book, b.chapter, b.verse);
      if (used.has(vk)) continue;
      used.add(vk);
      const h = byVerse.get(vk) ?? null;
      const hAt = h?.at ? Date.parse(h.at) : NaN;
      // Saved and marked: the row is as new as the later of the two.
      const at = Math.max(Number.isFinite(b.addedAt) ? b.addedAt : 0, Number.isFinite(hAt) ? hAt : 0);
      out.push({ key: vk, bookmark: b, highlight: h, at: at || null });
      continue;
    }
    out.push({ key: `b:${b.id}`, bookmark: b, highlight: null, at: Number.isFinite(b.addedAt) ? b.addedAt : null });
  }
  for (const h of highlights) {
    const vk = verseKey(h.book, h.chapter, h.verse);
    if (used.has(vk)) continue;
    used.add(vk);
    const at = h.at ? Date.parse(h.at) : NaN;
    out.push({ key: vk, bookmark: null, highlight: h, at: Number.isFinite(at) ? at : null });
  }
  for (const p of passages) {
    const key = passageKey(p);
    if (used.has(key)) continue;
    used.add(key);
    const at = p.at ? Date.parse(p.at) : NaN;
    out.push({ key, bookmark: null, highlight: null, passage: p, at: Number.isFinite(at) ? at : null });
  }

  return out.sort((a, b) => {
    if (a.at !== null && b.at !== null) return b.at - a.at;
    if (a.at !== null) return -1;
    if (b.at !== null) return 1;
    if (a.highlight && b.highlight) return canonical(a.highlight, b.highlight);
    if (a.highlight) return -1;
    if (b.highlight) return 1;
    if (a.passage && b.passage) return byPlace(a.passage, b.passage);
    return 0;
  });
}

/** A work's paragraphs in their order, works by name, for undated ones. */
function byPlace(a: SavedPassage, b: SavedPassage): number {
  return (
    a.saintSlug.localeCompare(b.saintSlug) ||
    a.workSlug.localeCompare(b.workSlug) ||
    a.sectionN - b.sectionN ||
    a.paragraphIdx - b.paragraphIdx
  );
}

/** Which chip an item belongs under (All holds everything but History). */
export function inFilter(item: SavedItem, filter: SavedFilter): boolean {
  const kind = item.bookmark?.kind;
  switch (filter) {
    case "all":
      return true;
    case "verses":
      // Every verse kept: starred, highlighted, or both.
      return kind === "bible-verse" || item.highlight !== null;
    case "highlights":
      return item.highlight !== null || !!item.passage;
    case "writings":
      // What the Fathers wrote: a section starred, or a paragraph highlighted.
      return kind === "writing-section" || !!item.passage;
    case "prayers":
      return kind === "prayer" || kind === "prayer-rule";
    case "saints":
      return kind === "saint";
    case "readings":
      return kind === "bible-chapter" || kind === "history-event" || kind === "walkthrough-card";
    case "icons":
      return kind === "product";
    case "history":
      return false;
  }
}

/** The chips worth showing: All, then each one with something in it. */
export function chipsFor(items: readonly SavedItem[], historyCount: number): SavedFilter[] {
  const chips: SavedFilter[] = ["all"];
  for (const f of FILTERS) {
    if (f === "all") continue;
    if (f === "history") {
      if (historyCount > 0) chips.push(f);
      continue;
    }
    if (items.some((i) => inFilter(i, f))) chips.push(f);
  }
  return chips;
}

/** How many under each chip. */
export function countFor(items: readonly SavedItem[], filter: SavedFilter, historyCount: number): number {
  if (filter === "history") return historyCount;
  return items.filter((i) => inFilter(i, filter)).length;
}

/**
 * Whether an item answers a search. `text` is everything the row shows
 * (its words, its title, where it is from), in the reader's language, which
 * only the screen knows. Case and accents do not matter.
 */
export function matchesQuery(text: string, query: string): boolean {
  const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
  const q = fold(query.trim());
  if (!q) return true;
  const hay = fold(text);
  return q.split(/\s+/).every((part) => hay.includes(part));
}

/** The search field shows once the list is this long. */
export const SEARCH_FROM = 12;
