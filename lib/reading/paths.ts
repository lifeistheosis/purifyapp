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
];

export const PATH_IDS: readonly string[] = PATHS.map((p) => p.id);

export function getPath(id: string): ReadingPath | undefined {
  return PATHS.find((p) => p.id === id);
}
