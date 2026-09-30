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
 *
 * Pure: the chapters are named here and read by the reader's own Bible pages.
 */

export type PlanReading = { book: string; chapter: number };
export type ReadingPlan = {
  id: string;
  days: PlanReading[][];
  /** The daily-rhythm strand a finished day is kept under (lib/rhythm/marks.ts). */
  strand: "reading" | "gospel";
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

export const READING_PLANS: readonly ReadingPlan[] = [
  { id: "psalter", strand: "reading", days: KATHISMATA.map(([from, to]) => span("psalms", from, to)) },
  {
    id: "gospels",
    strand: "gospel",
    days: [...chapters("matthew", 28), ...chapters("mark", 16), ...chapters("luke", 24), ...chapters("john", 21)].map((c) => [c]),
  },
  { id: "proverbs", strand: "reading", days: chapters("proverbs", 31).map((c) => [c]) },
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
