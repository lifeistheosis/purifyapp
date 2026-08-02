"use client";

// A day mark: "the reader kept this strand of the rule of life today".
//
// ── Why this reuses the prayer keys instead of inventing a table ────────────
//
// `purify.prayers.<id>.dates` is already a rolling 30-day array of the days an
// id was kept, already capped, already event-wired, already gathered by
// lib/prayers/sync.ts, and already upserted into `public.prayer_completions`,
// whose `rule_id` column carries no CHECK constraint and whose zod schema
// accepts any string up to 80 chars. So a new strand needs no migration, no
// new event, and no new sync path. It rides the ledger that exists.
//
// Strand ids are namespaced `day:` (`day:gospel`, `day:saint`, ...) so they
// cannot collide with a real rule: none of the 27 ids in lib/prayers/rules.ts
// contains a colon, and the prefix reads as a namespace in devtools and in the
// database.
//
// ── The rule about which day a mark is filed under ─────────────────────────
//
// ALWAYS the reader's CIVIL day, from `todayKey()`. Never the Old-Calendar
// shifted day, even for `day:saint`.
//
// `useChurchDay` shifts commemorations and the fast by 13 days for Julian
// readers but deliberately leaves readings and Pascha on the civil date. If a
// mark were filed under the shifted day, a reader switching New to Old would
// watch their entire history jump 13 days and their rhythm row go blank.
// Display is shifted; storage is civil. These are different questions.
//
// ── Undo ───────────────────────────────────────────────────────────────────
//
// `unmark` is deliberately device-local. `syncPrayersFromServer` merges by set
// union and never deletes, so un-marking on one device is resurrected by the
// next pull from another. A real fix needs tombstones. Until then the UI must
// not promise that undo travels.

import {
  PRAYER_EVENT,
  readPrayedDates,
} from "@/lib/prayers/storage";
import { keysEndingAt, keyOf, todayKey, type DayKey } from "./dayKey";

/** The strands of the day. Order is the order they are offered. */
export const STRANDS = [
  "prayer",
  "gospel",
  "saint",
  "reading",
  "teaching",
] as const;

export type StrandId = (typeof STRANDS)[number];

/**
 * The storage id for a strand. `prayer` is not namespaced: it maps onto the
 * existing `morning` / `evening` rules, which already have years of history
 * and rows in prayer_completions. Renaming them would orphan that.
 */
export function strandKey(strand: Exclude<StrandId, "prayer">): string {
  return `day:${strand}`;
}

const CAP = 30;

function write(id: string, dates: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `purify.prayers.${id}.dates`,
      JSON.stringify(dates),
    );
    // The same event the prayer rules fire. Every existing subscriber, and
    // the sync bridge's debounced push, pick a strand up for free.
    window.dispatchEvent(
      new CustomEvent(PRAYER_EVENT, { detail: { ruleId: id, date: dates.at(-1) } }),
    );
  } catch {
    /* ignore: quota, private mode, blocked storage */
  }
}

/**
 * Mark a strand kept for the reader's civil day. Idempotent: marking twice is
 * one entry, so a call site that fires on every render is harmless.
 */
export function markKept(id: string, day: DayKey = todayKey()): void {
  const current = readPrayedDates(id);
  if (current.includes(day)) return;
  write(id, [...current, day].sort().slice(-CAP));
}

/** Remove a mark. Device-local; see the note on undo above. */
export function unmark(id: string, day: DayKey = todayKey()): void {
  const current = readPrayedDates(id);
  if (!current.includes(day)) return;
  write(
    id,
    current.filter((d) => d !== day),
  );
}

export function isKept(id: string, day: DayKey = todayKey()): boolean {
  return readPrayedDates(id).includes(day);
}

/**
 * The `days`-long window ending on `day`, oldest first, for a rhythm row.
 * Pass the `useToday()` / `useChurchDay().day` value straight in; it is
 * already in the UTC-noon frame this expects.
 */
export function rhythm(
  id: string,
  dayAtUtcNoon: Date,
  days = 14,
): { date: DayKey; kept: boolean }[] {
  const kept = new Set(readPrayedDates(id));
  return keysEndingAt(dayAtUtcNoon, days).map((date) => ({
    date,
    kept: kept.has(date),
  }));
}

/**
 * True when every mark for this strand is in the past, i.e. the reader has a
 * practice but has not kept it yet today. Used for ordering, never rendered
 * as a number or a nudge.
 */
export function keptToday(id: string, dayAtUtcNoon: Date): boolean {
  return isKept(id, keyOf(dayAtUtcNoon));
}
