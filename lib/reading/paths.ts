/**
 * Reading paths (1.8, the owner's word of 2026-10-24): short guided runs
 * through the library, a day at a time, each day a reading of the Fathers'
 * own words (works the reading room checked word for word) of about a
 * quarter of an hour. Names and descriptions are catalogue keys
 * (`paths.<id>.name`, `paths.<id>.body`); a day's readings are works and,
 * where a work is long, a run of its sections by `Section.n`, inclusive.
 * Pure: the page reads each work's title and length from the registries.
 */
import type { WorkKey } from "./entries";

export type PathReading = { work: WorkKey; from?: number; to?: number };
export type ReadingPath = { id: string; days: PathReading[][] };

/** One section of a work, for a path that reads it a section a day. */
const one = (work: WorkKey, n: number): PathReading => ({ work, from: n, to: n });
const hymn = (n: number) => one("ephraim-the-syrian/hymns-on-the-nativity", n);
const sermon = (n: number) => one("leo-the-great/sermons-on-the-nativity", n);
const exposition = (n: number) => one("john-of-damascus/exact-exposition-of-the-orthodox-faith", n);
const onMatthew = (n: number) => one("john-chrysostom/homilies-on-matthew", n);

export const PATHS: readonly ReadingPath[] = [
  {
    id: "start",
    days: [
      [{ work: "ignatius-of-antioch/epistle-to-the-romans" }],
      [{ work: "polycarp-of-smyrna/epistle-to-the-philippians" }],
      [{ work: "polycarp-of-smyrna/the-martyrdom-of-polycarp" }],
      [{ work: "cyprian-of-carthage/on-the-unity-of-the-church", from: 1, to: 14 }],
      [{ work: "cyprian-of-carthage/on-the-unity-of-the-church", from: 15, to: 27 }],
      [{ work: "leo-the-great/the-tome-of-leo" }],
      [{ work: "john-chrysostom/paschal-homily" }, { work: "arsenius-the-great/sayings-of-abba-arsenius" }],
    ],
  },
  {
    id: "prayer",
    days: [
      [{ work: "cyprian-of-carthage/on-the-lords-prayer", from: 1, to: 12 }],
      [{ work: "cyprian-of-carthage/on-the-lords-prayer", from: 13, to: 24 }],
      [{ work: "cyprian-of-carthage/on-the-lords-prayer", from: 25, to: 36 }],
      [{ work: "isaac-the-syrian/mystic-treatises", from: 1, to: 1 }],
      [{ work: "arsenius-the-great/sayings-of-abba-arsenius" }],
    ],
  },
  {
    id: "sorrow",
    days: [
      [{ work: "cyprian-of-carthage/on-the-mortality", from: 1, to: 13 }],
      [{ work: "cyprian-of-carthage/on-the-mortality", from: 14, to: 26 }],
      [{ work: "john-chrysostom/paschal-homily" }],
    ],
  },
  // The Nativity Fast (the owner's yes of 2026-10-24): forty days, one for each day of the fast, offered
  // on Today (lib/reading/nativity.ts). The prophets first; the Magnificat on day 7, the Entry of the
  // Theotokos; St Ephraim's hymns between St Leo's sermons on the feast; the genealogy and the Magi in
  // the last week; and St Gregory's oration, whose first words open the canon of the feast, to end on
  // Christmas Eve. St Cyril on Luke 1 and 2 waits for his commentary to be checked word for word.
  {
    id: "nativity",
    days: [
      [{ work: "justin-martyr/first-apology", from: 31, to: 35 }],
      [hymn(1)],
      [exposition(45)],
      [hymn(2)],
      [sermon(1)],
      [hymn(3)],
      [{ work: "theotokos/the-magnificat" }, exposition(55)],
      [hymn(4)],
      [sermon(2)],
      [hymn(5)],
      [hymn(6)],
      [sermon(3)],
      [hymn(7)],
      [hymn(8)],
      [sermon(4)],
      [hymn(9)],
      [hymn(10)],
      [sermon(5)],
      [hymn(11)],
      [hymn(12)],
      [sermon(6)],
      [hymn(13)],
      [hymn(14)],
      [sermon(7)],
      [hymn(15)],
      [hymn(16)],
      [{ work: "leo-the-great/the-tome-of-leo", from: 3, to: 5 }],
      [hymn(17)],
      [hymn(18)],
      [hymn(19)],
      [onMatthew(2)],
      [onMatthew(3)],
      [exposition(86)],
      [onMatthew(5)],
      [{ work: "justin-martyr/dialogue-with-trypho", from: 76, to: 77 }],
      [onMatthew(6)],
      [onMatthew(8)],
      [{ work: "gregory-theologian/oration-on-the-nativity", from: 1, to: 6 }],
      [{ work: "gregory-theologian/oration-on-the-nativity", from: 7, to: 12 }],
      [{ work: "gregory-theologian/oration-on-the-nativity", from: 13, to: 18 }],
    ],
  },
];

export const PATH_IDS: readonly string[] = PATHS.map((p) => p.id);

export function getPath(id: string): ReadingPath | undefined {
  return PATHS.find((p) => p.id === id);
}
