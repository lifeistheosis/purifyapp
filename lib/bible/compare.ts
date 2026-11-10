// Compare (1.9, the sheet's 14 and PLAN.md row 21b): a verse of the app in
// each Bible the reader may show, where that Bible numbers it.
//
// The places come from data/bibles/maps/<bible>.json (scripts/bibles/
// compare-map.mjs): for every chapter that could be placed surely, the app's
// verses as runs into the Bible's own numbering. A chapter or a verse that is
// not there was not placed surely, and Compare says so rather than show a
// verse that may be the wrong one. The maps are derived from the Copenhagen
// Alliance's mappings and shared, as they are, under CC BY-SA 4.0; the sheet
// says so under the verses.
//
// Each map is its own small file (about 60 KB), fetched with the sheet the
// first time it opens and not before: no page carries it.

import type { BibleId } from "./downloads/catalog";
import type { BibleBookFile } from "./downloads/store";

/** [first app verse, last app verse, the Bible's chapter, its first verse], or for one app verse in two of its verses, [v, v, chapter, first, last]. */
export type CompareRun = [number, number, number, number] | [number, number, number, number, number];

export type CompareMap = {
  bible: string;
  license: string;
  credit: string;
  books: Record<string, Record<string, CompareRun[]> | undefined>;
};

/** Where the app's verse stands in a Bible: its chapter, and its first and last verse there. */
export type ComparePlace = { chapter: number; first: number; last: number };

/** The app's verse in the Bible's numbering, or null where it was not placed surely. */
export function placeIn(map: CompareMap, book: string, chapter: number, verse: number): ComparePlace | null {
  for (const run of map.books[book]?.[String(chapter)] ?? []) {
    if (verse < run[0] || verse > run[1]) continue;
    if (run.length === 5) return { chapter: run[2], first: run[3], last: run[4] };
    const at = run[3] + (verse - run[0]);
    return { chapter: run[2], first: at, last: at };
  }
  return null;
}

/** "50:3", or "1:14-15" for one verse in two. */
export function placeLabel(place: ComparePlace): string {
  return place.last > place.first ? `${place.chapter}:${place.first}-${place.last}` : `${place.chapter}:${place.first}`;
}

/** Whether the Bible numbers the verse as the app does. */
export function sameNumber(place: ComparePlace, chapter: number, verse: number): boolean {
  return place.chapter === chapter && place.first === verse && place.last === verse;
}

/** The Bible's words at the place, its verses joined; null where any of them is missing. */
export function wordsAt(file: BibleBookFile, place: ComparePlace): string | null {
  const verses = file.chapters[place.chapter - 1] ?? [];
  const words: string[] = [];
  for (let v = place.first; v <= place.last; v += 1) {
    const found = verses.find(([label]) => Number(label) === v);
    if (!found) return null;
    words.push(found[1]);
  }
  return words.join(" ");
}

// An explicit import map, as lib/plans/guideContent.ts keeps for the guides:
// the bundler makes one small chunk per Bible, loaded only when asked for.
const MAPS: Record<BibleId, () => Promise<{ default: unknown }>> = {
  "ru-synodal": () => import("@/data/bibles/maps/ru-synodal.json"),
  "grc-lxx-patriarchal": () => import("@/data/bibles/maps/grc-lxx-patriarchal.json"),
  "sr-danicic-karadzic": () => import("@/data/bibles/maps/sr-danicic-karadzic.json"),
  "ar-van-dyck": () => import("@/data/bibles/maps/ar-van-dyck.json"),
  "es-reina-valera-1909": () => import("@/data/bibles/maps/es-reina-valera-1909.json"),
};

const loaded = new Map<BibleId, Promise<CompareMap | null>>();

/** A Bible's map, loaded once a visit; null when it cannot be had. */
export function loadCompareMap(id: BibleId): Promise<CompareMap | null> {
  const known = loaded.get(id);
  if (known) return known;
  const p = MAPS[id]()
    .then((m) => m.default as CompareMap)
    .catch(() => {
      loaded.delete(id);
      return null;
    });
  loaded.set(id, p);
  return p;
}
