// The one safe way to turn a day into a `YYYY-MM-DD` storage key.
//
// ── Why this module exists ──────────────────────────────────────────────────
//
// There are two Date conventions in this codebase and mixing them silently
// corrupts a reader's history by one day:
//
//   1. A wall-clock Date. `new Date()` is the moment, in the reader's zone.
//      Its LOCAL getters give the reader's calendar day.
//
//   2. The UTC-noon frame. `startOfDayLocal(d)` (lib/calendar/orthodox.ts)
//      returns `Date.UTC(localY, localM, localD, 12)` — the reader's local
//      day, carried in a Date whose UTC getters spell it out. Noon is the
//      anchor so no timezone shift can push it across a boundary. This is
//      what `useToday()` returns and therefore what every "today" surface
//      passes around.
//
// Read a frame-2 Date with LOCAL getters and you get the wrong day for half
// the planet. At UTC+13/+14 (Auckland in DST, Kiritimati, Apia) local noon-UTC
// is already tomorrow, so a reader who marks the morning rule sees the mark
// land on a day that has not arrived. West of Greenwich the same mistake reads
// backwards instead.
//
// The repo already had four independent `YYYY-MM-DD` derivations, all using
// local getters: `ymd` in lib/prayers/storage.ts, `ymdLocal` in
// TodayGreeting, an inline one in PrayerRuleReader, and `dayKey` in
// lib/fasting/streak.ts. They agree today only because every one of them
// happens to be fed a raw `new Date()`. The moment a `useToday()` value
// reaches any of them, that stops being true.
//
// So: `keyOf` takes a frame-2 Date and reads it with UTC getters. It is
// provably identical to `ymd(new Date())` in every zone, which the test in
// __tests__/dayKey.test.ts asserts against real IANA zones on both sides of
// the dateline. If you need a key and you have a wall-clock Date, call
// `todayKey()` and let it do the conversion.

import { startOfDayLocal } from "@/lib/calendar/orthodox";

/** A `YYYY-MM-DD` day key. Named so a bare string cannot be passed by mistake. */
export type DayKey = string;

/**
 * Key a Date that is already in the UTC-noon frame (anything from
 * `useToday()`, `useChurchDay().day`, `startOfDayLocal`, `startOfDayUtc`).
 *
 * Uses UTC getters deliberately. Do not "fix" this to local getters.
 */
export function keyOf(dayAtUtcNoon: Date): DayKey {
  const y = dayAtUtcNoon.getUTCFullYear();
  const m = String(dayAtUtcNoon.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dayAtUtcNoon.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * The reader's own calendar day, right now, as a key. Converts the wall clock
 * into the UTC-noon frame first, so it agrees with `keyOf` on a `useToday()`
 * value at every instant.
 */
export function todayKey(now: Date = new Date()): DayKey {
  return keyOf(startOfDayLocal(now));
}

/**
 * The `days` keys ending at `day` inclusive, oldest first. This is the window
 * a rhythm row walks. Stepping happens on UTC dates, so it cannot skip or
 * repeat a day across a DST boundary the way `setDate` on a local Date can.
 */
export function keysEndingAt(dayAtUtcNoon: Date, days: number): DayKey[] {
  const out: DayKey[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(dayAtUtcNoon);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(keyOf(d));
  }
  return out;
}
