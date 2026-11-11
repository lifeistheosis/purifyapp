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
import type { Bookmark } from "@/lib/bookmarks";

import { cleanItem, cleanItems, isGone, kindOfKey, type KeptItem, type LearnItem } from "./items";

export type SavedVerse = { key: string; book: string; chapter: number; verse: number; label: string; addedAt: number };

/** The verses a reader saved, from their bookmarks: what the card on Today and the widget remember. */
export function savedVersesOf(bookmarks: readonly Bookmark[]): SavedVerse[] {
  return bookmarks.flatMap((b) =>
    b.kind === "bible-verse"
      ? [{ key: verseKey(b.book, b.chapter, b.verse), book: b.book, chapter: b.chapter, verse: b.verse, label: b.label, addedAt: b.addedAt }]
      : [],
  );
}

/**
 * A verse's place in the boxes, and when it comes back. `at` (1.9) is when it
 * was last answered, Date.now(), so the newer answer wins when the schedule
 * comes from another device (lib/sync/kept.ts); an answer from before 1.9
 * has none, and is older than one that has.
 */
export type Entry = { box: number; due: string; at?: number };
/**
 * What is kept on the device. `answeredKey` (1.9) is the verse answered on
 * `answeredOn`, so the home screen widget can say when that verse comes back
 * after the app is closed; a store from before 1.9 has none, and the widget
 * then says only that today's verse was answered.
 */
export type RememberStore = {
  entries: Record<string, Entry>;
  answeredOn?: string;
  answeredKey?: string;
  texts: Record<string, string>;
  /**
   * What the reader learns besides their saved verses (build 93 note 11,
   * ./items.ts): a verse taken by its place, a quote from a text the app
   * carries, their own words; and the mark of each one taken off.
   */
  items: Record<string, KeptItem>;
  /**
   * The one the reader chose to learn now, and when they chose it; an empty
   * key is the choice given up. It stands on You's card and is asked first on
   * Today's when it is new or due. None chosen: the day picks, as before.
   */
  chosen?: Chosen;
};
export type Chosen = { key: string; at: number };
type Store = RememberStore;

const KEY = "purify:remember";
export const INTERVALS = [1, 2, 4, 8, 16];
export const KNOWN_EVERY = 30;

/**
 * Sent on the window when the schedule or a verse's words change (1.9), so
 * the home screen widget (components/native/WidgetBridgeSync.tsx) is handed
 * today's verse without waiting for the app's next return to the front.
 */
export const REMEMBER_EVENT = "purify:remember";

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
    return {
      entries: parsed.entries ?? {},
      answeredOn: parsed.answeredOn,
      answeredKey: typeof parsed.answeredKey === "string" ? parsed.answeredKey : undefined,
      texts: parsed.texts ?? {},
      items: cleanItems(parsed.items),
      chosen: cleanChosen(parsed.chosen),
    };
  } catch {
    return { entries: {}, texts: {}, items: {} };
  }
}

/** A choice as it may be kept: a key of one of the three kinds, or the empty key of a choice given up. */
export function cleanChosen(v: unknown): Chosen | undefined {
  if (!v || typeof v !== "object") return undefined;
  const { key, at } = v as { key?: unknown; at?: unknown };
  if (typeof key !== "string" || typeof at !== "number" || !Number.isFinite(at) || at <= 0) return undefined;
  return key === "" || kindOfKey(key) ? { key, at: Math.floor(at) } : undefined;
}

function save(store: Store, source?: "sync"): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* a private window keeps nothing: the card asks again tomorrow */
    return;
  }
  try {
    window.dispatchEvent?.(new CustomEvent(REMEMBER_EVENT, source ? { detail: { source } } : undefined));
  } catch {
    /* nobody listening is no loss: the widget is handed it at the next open */
  }
}

/**
 * Put in place the schedule the sync merged (lib/sync/kept.ts): the answers,
 * and the day's answer, with the words kept on this device left as they are.
 * Marked as the sync's, so it is not sent back.
 */
export function writeScheduleFromSync(next: Pick<RememberStore, "entries" | "answeredOn" | "answeredKey" | "items" | "chosen">): void {
  const store = load();
  save({ ...store, entries: next.entries, answeredOn: next.answeredOn, answeredKey: next.answeredKey, items: next.items, chosen: next.chosen }, "sync");
}

/** Everything kept, in one read: for the home screen widget (lib/widget/remember.ts). */
export function rememberStore(): RememberStore {
  return load();
}

const NOTHING: RememberStore = { entries: {}, texts: {}, items: {} };
let seenRaw: string | null | undefined;
let seen: RememberStore = NOTHING;

/**
 * Everything kept, the same object until what is kept changes: what a
 * component reads through useSyncExternalStore (./useLearning.ts), which asks
 * again and again and must be given the same answer to the same store.
 */
export function rememberSnapshot(): RememberStore {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return NOTHING;
  }
  if (raw !== seenRaw) {
    seenRaw = raw;
    seen = raw ? load() : NOTHING;
  }
  return seen;
}

/** What the server draws, and a device that keeps nothing: an empty store, always the same one. */
export function emptyRememberStore(): RememberStore {
  return NOTHING;
}

/**
 * The verse that is new or due on `day`, the longest-saved first, by the
 * schedule as it stands, whether or not one was answered that day. For a
 * day ahead it is the verse that day brings if nothing is answered before
 * it, which is what the widget shows on the days the app is not opened.
 */
export function dueOn<T extends { key: string; addedAt: number }>(saved: readonly T[], entries: Readonly<Record<string, Entry>>, day: string): T | null {
  const due = saved
    .filter((v) => {
      const e = entries[v.key];
      return !e || e.due <= day;
    })
    .sort((a, b) => a.addedAt - b.addedAt);
  return due[0] ?? null;
}

/**
 * Today's verse to remember: none once one has been answered today;
 * otherwise the longest-saved verse that is new or due.
 */
export function dueVerse(saved: SavedVerse[], today: string): SavedVerse | null {
  const store = load();
  if (store.answeredOn === today) return null;
  return dueOn(saved, store.entries, today);
}

// ── What is learned, and the one chosen (build 93 note 11) ──────────────

/**
 * Everything the reader is learning, as one list: the verses they saved, and
 * after them what they added here (./items.ts), a saved verse standing once
 * when it is in both.
 */
export function learnablesOf(saved: readonly SavedVerse[], items: Readonly<Record<string, KeptItem>>): LearnItem[] {
  const out: LearnItem[] = saved.map((v) => ({ kind: "verse", ...v }));
  const have = new Set(out.map((v) => v.key));
  for (const item of Object.values(items)) {
    if (!isGone(item) && !have.has(item.key)) out.push(item);
  }
  return out;
}

/**
 * What `day` asks: the one the reader chose, when it is new or due that day,
 * and otherwise the longest-kept that is. The card on Today and the widget's
 * days ahead read the same rule here, so they never name different things.
 */
export function askedOn<T extends { key: string; addedAt: number }>(
  list: readonly T[],
  entries: Readonly<Record<string, Entry>>,
  chosen: string | undefined,
  day: string,
): T | null {
  const first = chosen ? list.find((v) => v.key === chosen) : undefined;
  if (first) {
    const e = entries[first.key];
    if (!e || e.due <= day) return first;
  }
  return dueOn(list, entries, day);
}

/** Today's to remember, from everything being learned: none once one has been answered today. */
export function dueItem(list: readonly LearnItem[], today: string): LearnItem | null {
  const store = load();
  if (store.answeredOn === today) return null;
  return askedOn(list, store.entries, store.chosen?.key || undefined, today);
}

/** The key of the one chosen, or null when the day picks. */
export function chosenKey(): string | null {
  return load().chosen?.key || null;
}

/** Choose what to learn now; null gives the choice up, and the day picks again. */
export function choose(key: string | null): void {
  const store = load();
  if ((store.chosen?.key || null) === key) return;
  store.chosen = { key: key ?? "", at: Date.now() };
  save(store);
}

/** Keep an item to learn, and choose it: taking something up is choosing it. */
export function keepItem(item: LearnItem): void {
  const clean = cleanItem(item.key, item);
  if (!clean || isGone(clean)) return;
  const store = load();
  store.items = cleanItems({ ...store.items, [clean.key]: clean });
  store.chosen = { key: clean.key, at: Date.now() };
  save(store);
}

/**
 * Take an item off the list. Its mark stays, so another device does not
 * bring it back; a saved verse is taken off by taking off its bookmark, which
 * is not this function's to do.
 */
export function dropItem(key: string): void {
  const store = load();
  const item = store.items[key];
  if (!item || isGone(item)) return;
  const now = Date.now();
  store.items = cleanItems({ ...store.items, [key]: { gone: now } });
  delete store.entries[key];
  delete store.texts[key];
  if (store.chosen?.key === key) store.chosen = { key: "", at: now };
  if (store.answeredKey === key) store.answeredKey = undefined;
  save(store);
}

/** The reader's answer: knew it, or not yet. Returns when it comes back. */
export function answer(key: string, knew: boolean, today: string): Entry {
  const store = load();
  const box = store.entries[key]?.box ?? 0;
  const next = knew ? Math.min(box + 1, INTERVALS.length + 1) : 1;
  const wait = next > INTERVALS.length ? KNOWN_EVERY : INTERVALS[next - 1];
  const entry = { box: next, due: addDays(today, wait), at: Date.now() };
  store.entries[key] = entry;
  store.answeredOn = today;
  store.answeredKey = key;
  save(store);
  return entry;
}

/** When an answered verse comes back, in the reader's language: tomorrow, in some days, or once a month once known. */
export function backWords(t: (key: string, values?: Record<string, string | number>) => string, entry: Entry, today: string): string {
  if (entry.box > INTERVALS.length) return t("remember.known");
  if (entry.due === addDays(today, 1)) return t("remember.backTomorrow");
  return t("remember.backIn", { count: Math.round((Date.parse(entry.due) - Date.parse(today)) / 86_400_000) });
}

/**
 * Remember the verse in three steps (1.9, s4-06 of docs/1.9-build/ideas.json:
 * "missing words, first letters, from memory, spaced over days"). The boxes
 * already space a verse over the days; the step follows its box. New, or
 * not known last time: its longer words are left blank. Known twice: every
 * word, with only its first letter. Known four times: every word blank, said
 * from memory.
 */
export type RememberStep = 1 | 2 | 3;

export function stepOf(box: number): RememberStep {
  return box >= 4 ? 3 : box >= 2 ? 2 : 1;
}

/** The box a verse is in now: 0 before it was first answered. */
export function boxOf(key: string): number {
  return load().entries[key]?.box ?? 0;
}

export function textOf(key: string): string | null {
  const store = load();
  const item = store.items[key];
  // A quote's words and the reader's own are the item itself; a verse's are fetched and kept beside it.
  if (item && !isGone(item) && item.kind !== "verse") return item.text;
  return store.texts[key] ?? null;
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
