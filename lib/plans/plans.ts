/**
 * Reading plans (2026-09-30, a Purify Plus tool, with the streak the owner
 * asked to go all in on).
 *
 * Each a list of days, each day a list of chapters. Their names and
 * descriptions are catalogue keys (`plans.<id>.name`, `plans.<id>.body`).
 *
 *   psalter   the Psalter by kathisma: the twenty sections the Church divides
 *             it into for prayer, one a day. Septuagint numbering, which is
 *             the Psalter's numbering in Purify (Psalm 118 is kathisma 17 on
 *             its own). Psalm 151 stands outside the kathismata and outside
 *             the plan.
 *   gospels   Matthew, Mark, Luke and John, a chapter a day.
 *   john      John in 21 days (1.9, s4-02 of docs/1.9-build/ideas.json): the
 *             Gospel of John, a chapter a day. What it says around each day
 *             is the Gospels plan's own John days, word for word (data/plans:
 *             the guide, its citations and the sayings, renumbered 1 to 21).
 *   acts      Acts in 28 days (1.9, his yes of 2026-11-09 to the sheet's 19,
 *             "built with no new framing to review"): the Acts of the Apostles,
 *             a chapter a day. No intro and no question of ours: each day is
 *             its chapter and one passage of the Fathers on it, word for word
 *             from the commentary the app carries (data/plans/sayings.json).
 *   newtestament  the New Testament in a year (the same yes): Matthew to
 *             Revelation in the app's order, a chapter a day, 260 days, a year
 *             at five a week. Like Acts, the chapter and a passage of the
 *             Fathers on it, nothing of ours: the Gospels' and Acts' days carry
 *             the same passages as those plans, the rest their own. Its tile
 *             wears St Paul, whose letters are most of it, where its first
 *             book's figure is the four Gospels' already.
 *   proverbs  a chapter of Proverbs a day for a month.
 *   nativity  the Nativity Fast's (1.9, the owner's pick of 2026-11-07): the
 *             prophecies and Gospels the Church herself reads at the
 *             Nativity, one passage a day in the order of her services, as
 *             data/plans/nativity.json lists them from the calendar's own
 *             readings. A day is a passage, not whole chapters: its first
 *             reading carries the reference ("4:6-7; 5:2-4") and each chapter
 *             opens at the verse it starts on.
 *   holyweek  Holy Week's (1.9, his yes of 2026-11-09 to the sheet's 12): the
 *             Gospel the Church reads at each day's Liturgy from Lazarus
 *             Saturday to Pascha, nine days, as data/calendar/movable-readings.json
 *             gives them (checked day by day against the OCA's readings for
 *             2026). Holy Thursday's and Holy Friday's are the composite Gospels
 *             of their services, five passages each across three Gospels: a
 *             day may read from more than one book, each passage carrying its
 *             own reference. No word of ours is added to them.
 *
 * Pure: the chapters are named here and read by the reader's own Bible pages.
 */

import MOVABLE from "@/data/calendar/movable-readings.json";
import { getNewTestament } from "@/lib/bible/books";
import NATIVITY from "@/data/plans/nativity.json";

export type PlanReading = {
  book: string;
  chapter: number;
  /** The verse the chapter opens at, for a day that reads a passage. */
  verse?: number;
  /**
   * On a passage's first reading, its reference after the book's name: "4:6-7;
   * 5:2-4". A day of more than one passage (Holy Thursday's Gospel) has one on
   * the first reading of each.
   */
  ref?: string;
};
export type ReadingPlan = {
  id: string;
  days: PlanReading[][];
  /** The daily-rhythm strand a finished day is kept under (lib/rhythm/marks.ts). */
  strand: "reading" | "gospel";
  /** The season of the Church's year it belongs to, for the season's card (lib/plans/season.ts). */
  season?: Season;
  /**
   * The book whose saint its tile wears, where that is not its first book's
   * (components/plans/PlansClient.tsx). His rule (2026-11-09): a plan's cover
   * is the saint its books are attributed to. The four Gospels wear St John,
   * as the library has no icon of the four Evangelists together (his word);
   * the New Testament St Paul.
   */
  cover?: string;
};

/** The seasons of the Church's year a plan can belong to. */
export type Season = "nativity" | "holyweek";

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

/** The Gospels' names as the calendar writes them, to the app's books. */
const GOSPEL_BOOKS: Record<string, string> = { Matthew: "matthew", Mark: "mark", Luke: "luke", John: "john" };

/**
 * A Gospel as the calendar names it, one passage or several: "John 11:1-45",
 * or Holy Thursday's "Matthew 26:2-20; John 13:3-17; ...". Each passage
 * starts with its book's name; each becomes its chapters (passage, above).
 */
export function gospelPassages(label: string): PlanReading[] {
  const out: PlanReading[] = [];
  for (const part of label.split(";")) {
    const m = /^\s*(Matthew|Mark|Luke|John)\s+(\d.*?)\s*$/.exec(part);
    if (!m) throw new Error(`not a Gospel passage: "${part.trim()}" in "${label}"`);
    out.push(...passage(GOSPEL_BOOKS[m[1]], m[2]));
  }
  return out;
}

type Movable = { offsets: Record<string, { label: string; readings: { kind: string; label: string }[] }> };

/** Holy Week's days, Lazarus Saturday (Pascha less 8) to Pascha, each with its service and its Gospel's reference. */
export const HOLY_WEEK_DAYS: readonly { offset: number; service: string; gospel: string }[] = [-8, -7, -6, -5, -4, -3, -2, -1, 0].map(
  (offset) => {
    const day = (MOVABLE as unknown as Movable).offsets[String(offset)];
    const gospel = day?.readings.find((r) => r.kind === "gospel");
    if (!day || !gospel) throw new Error(`no Gospel in the calendar for Pascha ${offset}`);
    return { offset, service: day.label, gospel: gospel.label };
  },
);

export const READING_PLANS: readonly ReadingPlan[] = [
  { id: "psalter", strand: "reading", days: KATHISMATA.map(([from, to]) => span("psalms", from, to)) },
  {
    id: "gospels",
    strand: "gospel",
    cover: "john",
    days: [...chapters("matthew", 28), ...chapters("mark", 16), ...chapters("luke", 24), ...chapters("john", 21)].map((c) => [c]),
  },
  { id: "john", strand: "gospel", days: chapters("john", 21).map((c) => [c]) },
  { id: "acts", strand: "reading", days: chapters("acts", 28).map((c) => [c]) },
  {
    id: "newtestament",
    strand: "reading",
    cover: "romans",
    days: getNewTestament().flatMap((b) => chapters(b.slug, b.chapters)).map((c) => [c]),
  },
  { id: "proverbs", strand: "reading", days: chapters("proverbs", 31).map((c) => [c]) },
  { id: "nativity", strand: "reading", season: "nativity", days: NATIVITY_DAYS.map((d) => passage(d.book, d.ref)) },
  { id: "holyweek", strand: "gospel", season: "holyweek", days: HOLY_WEEK_DAYS.map((d) => gospelPassages(d.gospel)) },
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
  // A passage is named as the calendar names it: "Micah 4:6-7; 5:2-4", and a
  // day of several passages, each with its book (Holy Thursday's Gospel).
  if (day[0]?.ref) return day.filter((r) => r.ref).map((r) => `${bookName(r.book)} ${r.ref}`).join("; ");
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
