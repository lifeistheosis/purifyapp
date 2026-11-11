// A line from the reader's own florilegium on Today (1.9, s5-07 of
// docs/1.9-build/ideas.json, from BRAINSTORM.md's Keeping 7: "a line from your
// own florilegium on Today").
//
// One of the lines they have gathered, a different one each day and the same
// all day: every line in the order it was gathered, taken in turn by the
// day's number, so each comes round in its time and none twice running.
// Pure: components/today/FlorilegiumLineCard.tsx draws it.
//
// What is the reader's own, and what is a starter's (build 93 note 19, the
// owner, with Today saying "Your Florilegium" over Luke 1:53: "I'm not sure
// why the Your Florilegium just is the song of the Theotokos"). He had kept
// one of the four starters every build knows (./starters.ts), gathered
// nothing else, and Today called the starter's verses his. So:
//  - A starter's own verses, in the gathering kept from it, are the
//    Florilegium's, and the card says so (`fromStarter`).
//  - While the reader has gathered any line themselves (in a gathering of
//    their own, or added to a kept starter), the day's line is one of
//    those, and only those: "Your Florilegium" heads what is truly theirs.
//  - With nothing of their own yet, a kept starter's verses still come round,
//    named as what they are.

import type { Florilegium, FlorilegiumItem } from "./florilegium";
import { starterOf } from "./starters";

export type TodayLine = {
  item: FlorilegiumItem;
  florilegium: Florilegium;
  /** One of a starter's own verses, in the gathering kept from it: the Florilegium's line, not the reader's. */
  fromStarter: boolean;
};

/** Whether a line is one of the verses the gathering's starter came with. */
function isStarterVerse(item: FlorilegiumItem, florilegium: Florilegium): boolean {
  if (item.kind !== "scripture") return false;
  const starter = starterOf(florilegium);
  return Boolean(starter && starter.book === item.book && starter.chapter === item.chapter && starter.lines.some((l) => l.verse === item.verse));
}

/** The day's line from the reader's gatherings, or null while they hold none. */
export function lineForDay(florilegia: readonly Florilegium[], day: string): TodayLine | null {
  const all = florilegia
    .flatMap((florilegium) =>
      florilegium.items.filter((item) => item.text?.trim()).map((item) => ({ item, florilegium, fromStarter: isStarterVerse(item, florilegium) })),
    )
    .sort((a, b) => a.item.addedAt - b.item.addedAt || a.item.id.localeCompare(b.item.id));
  // What the reader gathered themselves, when there is any; else the starters they kept.
  const own = all.filter((line) => !line.fromStarter);
  const lines = own.length > 0 ? own : all;
  if (lines.length === 0) return null;
  const n = Math.floor(Date.parse(`${day}T12:00:00Z`) / 86_400_000);
  if (!Number.isFinite(n)) return lines[0];
  return lines[((n % lines.length) + lines.length) % lines.length];
}
