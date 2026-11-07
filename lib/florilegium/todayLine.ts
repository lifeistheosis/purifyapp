// A line from the reader's own florilegium on Today (1.9, s5-07 of
// docs/1.9-build/ideas.json, from BRAINSTORM.md's Keeping 7: "a line from your
// own florilegium on Today").
//
// One of the lines they have gathered, a different one each day and the same
// all day: every line in the order it was gathered, taken in turn by the
// day's number, so each comes round in its time and none twice running.
// Pure: components/today/FlorilegiumLineCard.tsx draws it.

import type { Florilegium, FlorilegiumItem } from "./florilegium";

export type TodayLine = { item: FlorilegiumItem; florilegium: Florilegium };

/** The day's line from the reader's gatherings, or null while they hold none. */
export function lineForDay(florilegia: readonly Florilegium[], day: string): TodayLine | null {
  const all = florilegia
    .flatMap((florilegium) => florilegium.items.filter((item) => item.text?.trim()).map((item) => ({ item, florilegium })))
    .sort((a, b) => a.item.addedAt - b.item.addedAt || a.item.id.localeCompare(b.item.id));
  if (all.length === 0) return null;
  const n = Math.floor(Date.parse(`${day}T12:00:00Z`) / 86_400_000);
  if (!Number.isFinite(n)) return all[0];
  return all[((n % all.length) + all.length) % all.length];
}
