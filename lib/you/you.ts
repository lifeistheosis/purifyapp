/**
 * The You tab's own reckoning (1.8).
 *
 * The owner, 2026-10-17: "when you click on you, I want the you revamp in
 * terms of like how the verses, paragraphs, bookmarks, and notes are ... it
 * just doesn't feel that useful ... I feel like the retention is low in terms
 * of those sections." Until 1.8 the tab showed four numbers (verses,
 * paragraphs, notes, bookmarks) that did not lead where they said: Verses
 * counted highlights and opened the starred verses, Paragraphs opened a list
 * that did not hold them, Bookmarks opened everything, and Notes opened the
 * journal under the Bible tab. Now what a reader has kept is listed by what
 * it is, each group a chip of Saved with its own count and its newest thing,
 * and one of their own verses comes back each day to be read, learned and
 * shared.
 *
 * Pure: the screen passes in what it has read off the device.
 */

import { inFilter, type SavedFilter, type SavedItem } from "@/lib/saved/feed";

/**
 * What the You tab lists a reader's keeping under, in this order. Each is a
 * chip of Saved (lib/saved/feed.ts), so a group's count is what its chip
 * shows, by the same function.
 */
export const KEPT_GROUPS = ["verses", "writings", "saints", "prayers", "readings", "icons"] as const satisfies readonly SavedFilter[];
export type KeptGroup = (typeof KEPT_GROUPS)[number];

export type KeptRow = {
  group: KeptGroup;
  /** How many under the group's chip. */
  count: number;
  /** The newest thing in it, to name on the row. */
  newest: SavedItem;
};

/** Each group with something in it, with its count and its newest thing. */
export function keptRows(feed: readonly SavedItem[]): KeptRow[] {
  const rows: KeptRow[] = [];
  for (const group of KEPT_GROUPS) {
    // The feed is newest first, so the first under a chip is its newest.
    const under = feed.filter((item) => inFilter(item, group));
    if (under.length) rows.push({ group, count: under.length, newest: under[0] });
  }
  return rows;
}

/** Whole days from 1970-01-01 to a calendar day written "YYYY-MM-DD". */
export function dayNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
}

/**
 * One of the reader's own verses for a day: each kept verse in turn, a
 * different one every day, the same one all day. Taken in the order of their
 * keys (the book, chapter and verse), so keeping a new verse moves the turn
 * once and not every time the list is read in another order.
 */
export function verseForDay<T extends { key: string }>(verses: readonly T[], day: string): T | null {
  if (!verses.length) return null;
  const sorted = [...verses].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const n = dayNumber(day);
  return sorted[((n % sorted.length) + sorted.length) % sorted.length] ?? null;
}

/**
 * The first moment of "this week": the start of the day six days back, so
 * the week is today and the six days before it, the same seven days the
 * streak's row of flames shows above the line that counts them.
 */
export function weekStart(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
}

/** How many moments fall on or after `from`. An unknown moment is not counted. */
export function countSince(moments: readonly (number | string | null | undefined)[], from: number): number {
  let n = 0;
  for (const m of moments) {
    const at = typeof m === "string" ? Date.parse(m) : typeof m === "number" ? m : NaN;
    if (Number.isFinite(at) && at >= from) n += 1;
  }
  return n;
}

/** A place to pick up: when it was last there. */
export type Place = { key: string; at: number };

/**
 * The places to pick up, the most recent first, at most `n`. A place with no
 * moment (a pointer from before it was dated) goes last.
 */
export function latestFirst<T extends Place>(places: readonly T[], n: number): T[] {
  return [...places]
    .sort((a, b) => (Number.isFinite(b.at) ? b.at : -1) - (Number.isFinite(a.at) ? a.at : -1))
    .slice(0, Math.max(0, n));
}
