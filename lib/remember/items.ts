/**
 * What a reader learns by heart besides the verses they saved (1.9, build 93
 * note 11, the owner's word of 2026-11-11: "Allow you to switch the learn the
 * verse whenever you want. Also allow a learn the quote ... or maybe they
 * want to pick a custom quote, allow them to do that, or a custom verse").
 *
 * Three kinds, and the difference between them is the editorial line:
 *
 *   verse  a verse of the Bible the app carries, by its place. Its words are
 *          fetched from that Bible, never typed (lib/saved/verseWords.ts).
 *   quote  words of a Father or a council as a text the app carries prints
 *          them, with the place they stand at. Only three doors make one:
 *          the app's own cited sayings, a line the reader gathered from the
 *          app's pages, and "Who said it" finding the line in a book
 *          (lib/quotes/find.ts). The name on it is never typed by a reader.
 *   own    the reader's own words: a line they typed or pasted, a verse in
 *          the translation they know. It has no name on it but theirs. A line
 *          "Who said it" cannot find is learned this way, never under a
 *          saint's name by us.
 *
 * So the shape itself keeps the rule: `own` has no field a name could go in,
 * and `quote` cannot be read back from the device or the server without the
 * place it opens (cleanItem below).
 *
 * Kept with the schedule (lib/remember/schedule.ts) and carried between a
 * reader's devices with it (lib/sync/keptMerge.ts), since their own words
 * cannot be fetched again as a verse's can.
 */

export type LearnVerse = { kind: "verse"; key: string; book: string; chapter: number; verse: number; label: string; addedAt: number };

/** Where a quote stands: the pieces of the line every quotation wears (lib/citations/cite.ts, ShownCite "father"). */
export type QuotePlace = { href: string; author: string; work: string; place: string; mark?: string; edition?: string };

export type LearnQuote = {
  kind: "quote";
  key: string;
  /** The words as the book prints them. */
  text: string;
  /** Whose words they are, as the app names him where it shows them: "St. Antony the Great". */
  by: string;
  cite: QuotePlace;
  addedAt: number;
};

export type LearnOwn = { kind: "own"; key: string; text: string; addedAt: number };

export type LearnItem = LearnVerse | LearnQuote | LearnOwn;

/** An item taken off the list, with when, so another device does not bring it back. */
export type Gone = { gone: number };
export type KeptItem = LearnItem | Gone;

/** The most letters of a reader's own words: a line to say from memory, not a page. */
export const OWN_MAX = 400;
/** The most letters of a quote: the longest excerpt "Who said it" hands back, and room to spare. */
export const QUOTE_MAX = 600;
/** The most items kept, so the row that carries them stays far under its size (user_kept, 256 KB). */
export const ITEMS_MAX = 60;

const VERSE_KEY = /^[a-z0-9-]+\/\d{1,3}\/\d{1,3}$/;
const QUOTE_KEY = /^q:[a-z0-9]{6,16}$/;
const OWN_KEY = /^own:[a-z0-9]{6,16}$/;

export function kindOfKey(key: string): LearnItem["kind"] | null {
  return VERSE_KEY.test(key) ? "verse" : QUOTE_KEY.test(key) ? "quote" : OWN_KEY.test(key) ? "own" : null;
}

/** One line of plain words: no control characters, runs of space as one, cut to `max` letters. */
export function plain(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const s = v
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [...s].slice(0, max).join("").trim();
}

/** A place inside the app, and nowhere else: a link kept on a device or carried from another is never a way out. */
function inApp(v: unknown): string {
  return typeof v === "string" && /^\/[a-z0-9][a-z0-9/_-]*(?:#[A-Za-z0-9_-]{1,40})?$/.test(v) && v.length <= 200 ? v : "";
}

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const when = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/**
 * An item as it may be kept, or null. What is read from the device and what
 * comes from the server pass through here alike: nothing is trusted for its
 * shape, a quote without its author's name, its work and the place it opens
 * is not a quote, and a key says its own kind.
 */
export function cleanItem(key: string, v: unknown): KeptItem | null {
  const kind = kindOfKey(key);
  if (!kind || !isObject(v)) return null;
  if (when(v.gone)) return { gone: when(v.gone) };
  const addedAt = when(v.addedAt);
  if (!addedAt || v.kind !== kind) return null;
  if (kind === "verse") {
    const [book, chapter, verse] = key.split("/");
    const label = plain(v.label, 60);
    return label ? { kind, key, book, chapter: Number(chapter), verse: Number(verse), label, addedAt } : null;
  }
  if (kind === "own") {
    const text = plain(v.text, OWN_MAX);
    return text ? { kind, key, text, addedAt } : null;
  }
  const c = isObject(v.cite) ? v.cite : {};
  const cite: QuotePlace = { href: inApp(c.href), author: plain(c.author, 120), work: plain(c.work, 160), place: plain(c.place, 160) };
  const mark = plain(c.mark, 24);
  const edition = plain(c.edition, 60);
  if (mark) cite.mark = mark;
  if (edition) cite.edition = edition;
  const text = plain(v.text, QUOTE_MAX);
  const by = plain(v.by, 120);
  // The words, whose they are, the work, and the way to it: without any one of them it is not a quote.
  if (!text || !by || !cite.work || !cite.href) return null;
  return { kind, key, text, by, cite, addedAt };
}

export function isGone(v: KeptItem | undefined): v is Gone {
  return Boolean(v) && "gone" in (v as object);
}

/** Every kept item by key, cleaned; the newest ITEMS_MAX of them, and the marks of those taken off. */
export function cleanItems(v: unknown): Record<string, KeptItem> {
  if (!isObject(v)) return {};
  const all: [string, KeptItem][] = [];
  for (const [key, item] of Object.entries(v)) {
    const clean = cleanItem(key, item);
    if (clean) all.push([key, clean]);
  }
  const kept = all.filter(([, i]) => !isGone(i)).sort((a, b) => (b[1] as LearnItem).addedAt - (a[1] as LearnItem).addedAt).slice(0, ITEMS_MAX);
  const gone = all.filter(([, i]) => isGone(i)).sort((a, b) => (b[1] as Gone).gone - (a[1] as Gone).gone).slice(0, ITEMS_MAX * 2);
  return Object.fromEntries([...kept, ...gone]);
}

/**
 * Two devices' items as one: by key, the later of an item's adding and its
 * taking off. An item added again after it was taken off is back.
 */
export function mergeItems(a: Readonly<Record<string, KeptItem>>, b: Readonly<Record<string, KeptItem>>): Record<string, KeptItem> {
  const at = (i: KeptItem) => (isGone(i) ? i.gone : i.addedAt);
  const out: Record<string, KeptItem> = { ...a };
  for (const [key, theirs] of Object.entries(b)) {
    const ours = out[key];
    if (!ours || at(theirs) > at(ours)) out[key] = theirs;
  }
  return cleanItems(out);
}

/** A short name for a text, the same for the same text on every device (FNV-1a, twice, in base 36). */
function nameOf(s: string): string {
  const run = (seed: number) => {
    let h = seed;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36).padStart(7, "0");
  };
  return (run(0x811c9dc5) + run(0x1b873593)).slice(0, 14);
}

/** A quote's key: the same words at the same place are the same item, on any device. */
export function quoteKey(href: string, text: string): string {
  return `q:${nameOf(`${href}\n${plain(text, QUOTE_MAX)}`)}`;
}

/** A new key for the reader's own words. */
export function ownKey(): string {
  const random = typeof crypto !== "undefined" && "getRandomValues" in crypto ? [...crypto.getRandomValues(new Uint32Array(2))] : [Date.now(), Math.floor(Math.random() * 2 ** 32)];
  return `own:${random.map((n) => (n >>> 0).toString(36).padStart(7, "0")).join("").slice(0, 14)}`;
}

/** A quote to keep, from the words and the line under them; null when it lacks what a quote needs. */
export function quoteItem(input: { text: string; by: string; cite: QuotePlace }, now: number = Date.now()): LearnQuote | null {
  const key = quoteKey(input.cite.href, input.text);
  const item = cleanItem(key, { kind: "quote", text: input.text, by: input.by, cite: input.cite, addedAt: now });
  return item && !isGone(item) && item.kind === "quote" ? item : null;
}

/** The reader's own words to keep; null when there are none. */
export function ownItem(text: string, now: number = Date.now()): LearnOwn | null {
  const item = cleanItem(ownKey(), { kind: "own", text, addedAt: now });
  return item && !isGone(item) && item.kind === "own" ? item : null;
}

/** A verse to keep by its place; `label` is its English reference, as a bookmark's is ("John 3:16"). */
export function verseItem(input: { book: string; chapter: number; verse: number; label: string }, now: number = Date.now()): LearnVerse | null {
  const item = cleanItem(`${input.book}/${input.chapter}/${input.verse}`, { kind: "verse", label: input.label, addedAt: now });
  return item && !isGone(item) && item.kind === "verse" ? item : null;
}
