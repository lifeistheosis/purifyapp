/**
 * Reading plans (2026-09-30, a Purify Plus tool, with the streak the owner
 * asked to go all in on).
 *
 * Three, each a list of days, each day a list of chapters. Their names and
 * descriptions are catalogue keys (`plans.<id>.name`, `plans.<id>.body`).
 *
 *   psalter   the Psalter by kathisma: the twenty sections the Church divides
 *             it into for prayer, one a day. Septuagint numbering, which is
 *             the Psalter's numbering in Purify (Psalm 118 is kathisma 17 on
 *             its own). Psalm 151 stands outside the kathismata and outside
 *             the plan.
 *   gospels   Matthew, Mark, Luke and John, a chapter a day.
 *   proverbs  a chapter of Proverbs a day for a month.
 *   nativity  the Nativity Fast's (1.9, the owner's pick of 2026-11-07): the
 *             prophecies and Gospels the Church herself reads at the
 *             Nativity, one passage a day in the order of her services, as
 *             data/plans/nativity.json lists them from the calendar's own
 *             readings. A day is a passage, not whole chapters: its first
 *             reading carries the reference ("4:6-7; 5:2-4") and each chapter
 *             opens at the verse it starts on.
 *
 * Pure: the chapters are named here and read by the reader's own Bible pages.
 */

import NATIVITY from "@/data/plans/nativity.json";

export type PlanReading = {
  book: string;
  chapter: number;
  /** The verse the chapter opens at, for a day that reads a passage. */
  verse?: number;
  /** On a day's first reading, the passage's reference after the book's name: "4:6-7; 5:2-4". */
  ref?: string;
};
export type ReadingPlan = {
  id: string;
  days: PlanReading[][];
  /** The daily-rhythm strand a finished day is kept under (lib/rhythm/marks.ts). */
  strand: "reading" | "gospel";
  /** The season of the Church's year it belongs to, for the season's card (lib/plans/season.ts). */
  season?: "nativity";
};

/** The twenty kathismata, first and last psalm, Septuagint numbering. */
export const KATHISMATA: readonly [number, number][] = [
  [1, 8], [9, 16], [17, 23], [24, 31], [32, 36], [37, 45], [46, 54], [55, 63], [64, 69], [70, 76],
  [77, 84], [85, 90], [91, 100], [101, 104], [105, 108], [109, 117], [118, 118], [119, 133], [134, 142], [143, 150],
];

function chapters(book: string, count: number): PlanReading[] {
  return Array.from({ length: count }, (_, i) => ({ book, chapter: i + 1 }));
}

function span(book: string, from: number, to: number): PlanReading[] {
  return Array.from({ length: to - from + 1 }, (_, i) => ({ book, chapter: from + i }));
}

/**
 * A passage as the chapters it reads, each opening at the verse it starts
 * on: "4:6-7; 5:2-4" reads Micah 4 from verse 6, then Micah 5 from verse 2,
 * and "3:35-4:4" reads on from chapter 3 into chapter 4. The first carries
 * the reference.
 */
export function passage(book: string, ref: string): PlanReading[] {
  const out: PlanReading[] = [];
  for (const part of ref.split(";")) {
    const m = /^\s*(\d+):(\d+)(?:[^;]*?-(\d+):\d+)?/.exec(part);
    if (!m) continue;
    const from = Number(m[1]);
    const to = m[3] ? Number(m[3]) : from;
    for (let chapter = from; chapter <= to; chapter += 1) out.push({ book, chapter, verse: chapter === from ? Number(m[2]) : 1 });
  }
  if (out.length > 0) out[0] = { ...out[0], ref };
  return out;
}

/**
 * A passage's verses, chapter by chapter, as [first, last] spans: "4:6-7;
 * 5:2-4" is chapter 4 from 6 to 7 and chapter 5 from 2 to 4, and "3:35-4:4"
 * is chapter 3 from 35 to its end and chapter 4 from 1 to 4.
 */
export function passageVerses(ref: string): Map<number, [number, number][]> {
  const out = new Map<number, [number, number][]>();
  const add = (chapter: number, first: number, last: number) => out.set(chapter, [...(out.get(chapter) ?? []), [first, last]]);
  for (const part of ref.split(";")) {
    const m = /^\s*(\d+):(.+)$/.exec(part);
    if (!m) continue;
    let chapter = Number(m[1]);
    for (const piece of m[2].split(",")) {
      const across = /^\s*(\d+)-(\d+):(\d+)\s*$/.exec(piece);
      if (across) {
        add(chapter, Number(across[1]), Number.MAX_SAFE_INTEGER);
        chapter = Number(across[2]);
        add(chapter, 1, Number(across[3]));
        continue;
      }
      const r = /^\s*(\d+)(?:-(\d+))?\s*$/.exec(piece);
      if (r) add(chapter, Number(r[1]), Number(r[2] ?? r[1]));
    }
  }
  return out;
}

/** The Nativity Fast's days, as data/plans/nativity.json gives them, with where the Church reads each. */
export const NATIVITY_DAYS: readonly { book: string; ref: string; service: string }[] = NATIVITY.days;

export const READING_PLANS: readonly ReadingPlan[] = [
  { id: "psalter", strand: "reading", days: KATHISMATA.map(([from, to]) => span("psalms", from, to)) },
  {
    id: "gospels",
    strand: "gospel",
    days: [...chapters("matthew", 28), ...chapters("mark", 16), ...chapters("luke", 24), ...chapters("john", 21)].map((c) => [c]),
  },
  { id: "proverbs", strand: "reading", days: chapters("proverbs", 31).map((c) => [c]) },
  { id: "nativity", strand: "reading", season: "nativity", days: NATIVITY_DAYS.map((d) => passage(d.book, d.ref)) },
];

export function getPlan(id: string): ReadingPlan | undefined {
  return READING_PLANS.find((p) => p.id === id);
}

/**
 * A day's chapters as one reference per book: "Psalms 46–54", "Matthew 5".
 * `bookName` gives the reader's name for the book. En dash for the span, as
 * for any numeric range.
 */
export function dayLabel(day: readonly PlanReading[], bookName: (slug: string) => string): string {
  // A passage is named as the calendar names it: "Micah 4:6-7; 5:2-4".
  if (day[0]?.ref) return `${bookName(day[0].book)} ${day[0].ref}`;
  const parts: string[] = [];
  let i = 0;
  while (i < day.length) {
    const start = day[i];
    let end = start;
    while (i + 1 < day.length && day[i + 1].book === start.book && day[i + 1].chapter === end.chapter + 1) {
      i += 1;
      end = day[i];
    }
    parts.push(
      end.chapter === start.chapter
        ? `${bookName(start.book)} ${start.chapter}`
        : `${bookName(start.book)} ${start.chapter}–${end.chapter}`,
    );
    i += 1;
  }
  return parts.join(", ");
}
