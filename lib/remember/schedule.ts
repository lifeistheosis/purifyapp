/**
 * Remember a verse (1.7, Premium; the owner's "Do all of these" of
 * 2026-10-15): the verses a reader saved come back, one small card a day,
 * until they know them. Five boxes, after Leitner's: a verse they knew moves
 * up a box and waits longer before it returns (1, 2, 4, 8, 16 days); a verse
 * they did not know goes back to the first box and returns tomorrow. Past
 * the fifth box it is known, and comes back once a month to stay known.
 *
 * Per device, in localStorage, like the bookmarks it reads from. The words
 * of each verse are kept beside the schedule when the reader saves it (or
 * the first time the card fetches them), so the card works offline.
 */
export type SavedVerse = { key: string; book: string; chapter: number; verse: number; label: string; addedAt: number };

export type Entry = { box: number; due: string };
type Store = { entries: Record<string, Entry>; answeredOn?: string; texts: Record<string, string> };

const KEY = "purify:remember";
export const INTERVALS = [1, 2, 4, 8, 16];
export const KNOWN_EVERY = 30;

export function verseKey(book: string, chapter: number, verse: number): string {
  return `${book}/${chapter}/${verse}`;
}

/** The reader's own calendar day, as YYYY-MM-DD. */
export function dayOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return dayOf(new Date(y, m - 1, d + n));
}

function load(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Store>) : {};
    return { entries: parsed.entries ?? {}, answeredOn: parsed.answeredOn, texts: parsed.texts ?? {} };
  } catch {
    return { entries: {}, texts: {} };
  }
}

function save(store: Store): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* a private window keeps nothing: the card asks again tomorrow */
  }
}

/**
 * Today's verse to remember: none once one has been answered today;
 * otherwise the longest-saved verse that is new or due.
 */
export function dueVerse(saved: SavedVerse[], today: string): SavedVerse | null {
  const store = load();
  if (store.answeredOn === today) return null;
  const due = saved
    .filter((v) => {
      const e = store.entries[v.key];
      return !e || e.due <= today;
    })
    .sort((a, b) => a.addedAt - b.addedAt);
  return due[0] ?? null;
}

/** The reader's answer: knew it, or not yet. Returns when it comes back. */
export function answer(key: string, knew: boolean, today: string): Entry {
  const store = load();
  const box = store.entries[key]?.box ?? 0;
  const next = knew ? Math.min(box + 1, INTERVALS.length + 1) : 1;
  const wait = next > INTERVALS.length ? KNOWN_EVERY : INTERVALS[next - 1];
  const entry = { box: next, due: addDays(today, wait) };
  store.entries[key] = entry;
  store.answeredOn = today;
  save(store);
  return entry;
}

export function textOf(key: string): string | null {
  return load().texts[key] ?? null;
}

/** Keep a verse's words with its schedule (when it is saved, or fetched). */
export function keepText(key: string, text: string): void {
  keepTexts([[key, text]]);
}

/**
 * Keep several verses' words in one write (Saved, 1.7, which fetches a
 * chapter's starred verses at once and keeps them for offline).
 */
export function keepTexts(entries: readonly (readonly [string, string])[]): void {
  const store = load();
  let changed = false;
  for (const [key, text] of entries) {
    if (!text || store.texts[key] === text) continue;
    store.texts[key] = text;
    changed = true;
  }
  if (changed) save(store);
}

/** Every kept verse's words, by verse key, in one read. */
export function keptTexts(): Readonly<Record<string, string>> {
  return load().texts;
}

/**
 * The words with each one cut to its first letter, so the reader says the
 * rest from memory: "For God so loved" becomes "F__ G__ s_ l_____".
 */
export function firstLetters(text: string): string {
  return text.replace(/(\p{L})(\p{L}*)/gu, (_, first: string, rest: string) => first + "_".repeat(rest.length));
}

/**
 * One word of the verse as the card sets it out (1.7.1): the word itself, the
 * first letter the reader is given, and the punctuation before and after it,
 * kept as the verse has it. A run with no letter in it (a dash standing on its
 * own) is all `lead`, with an empty word.
 */
export type HintWord = { lead: string; word: string; first: string; tail: string };

/**
 * The verse as words, for the card's first-letter tiles: "world," is the word
 * "world" with "," after it, "Lord's" is one word, and a letter's accents stay
 * with it ("ἀρχῇ" starts with "ἀ").
 */
export function hintWords(text: string): HintWord[] {
  return text
    .split(/\s+/u)
    .filter(Boolean)
    .map((run) => {
      const [, lead = "", word = "", tail = ""] = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{M}\p{N}]*)$/u.exec(run) ?? [];
      return { lead, word, first: /^\P{M}\p{M}*/u.exec(word)?.[0] ?? "", tail };
    });
}
