/**
 * A month of the Church's calendar, line by line (1.9, November's saints;
 * docs/editorial/menologion-month.md).
 *
 * The owner's word of 2026-11-10: every saint a month commemorates shown,
 * with a page, his life, his works and his links, and the arbiter's
 * recommendation he took with it, that this be a path that repeats each
 * month, so December is done the same way before December 1. This module is
 * that path's rule book. It reads the calendar's lines for a month and says,
 * for each, what the app has and what keeps the month from being done.
 *
 * THE STANDARD A NEW PAGE IS HELD TO (from November 2026). A page added for a
 * month carries no life of ours: its `shortBio` is a short entry of plain
 * facts, `entrySource` names where they are read, and its Life, where a
 * witness wrote one, is a work in the witness's own words, cited passage by
 * passage (scripts/ingest-witness-lives.mjs). Its icon is shown only with
 * settled rights. A page that has `entrySource` is held to all of that; the
 * pages written before it (with a life of ours, marked for the clergy
 * review) are reported, never failed.
 *
 * No imports: the month's script loads it with types stripped
 * (scripts/menologion-month.mjs), as it loads the registry, and the test
 * (lib/saints/__tests__/menologionMonth.test.ts) hands it the same data.
 */

export type CalendarLine = { name: string; kind?: string; slug?: string; note?: string };
export type Calendar = Record<string, CalendarLine[]>;

export type MonthSaint = {
  slug: string;
  name: string;
  shortBio: string;
  entrySource?: string;
  life: string[];
  iconUrl?: string;
  works: { slug: string }[];
};

export type WorkSection = { voice?: string; citation?: string; paragraphs: string[] };

/** A line kept without a page, and why. A month is done only when every other line has one. */
export type HeldLine = { day: string; name: string; reason: string };

/**
 * The months that are done: every saint's line has a page or a stated reason,
 * and every new page meets the standard. The test holds each to it, so a
 * month stays done. Add the next one here when its work is in.
 */
export const DONE_MONTHS: Readonly<Record<string, { month: number; held: readonly HeldLine[] }>> = {
  november: { month: 11, held: [] },
  december: { month: 12, held: [] },
  january: { month: 1, held: [] },
};

export const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

/** The longest a short entry may run: a sentence or two, never a life. */
export const ENTRY_MAX_WORDS = 80;

/** "november" or "11" to 11; null for anything else. */
export function monthNumber(month: string): number | null {
  const named = MONTH_NAMES.indexOf(month.toLowerCase() as (typeof MONTH_NAMES)[number]);
  if (named >= 0) return named + 1;
  const n = Number(month);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}

export type MonthRow = {
  day: string;
  name: string;
  feast: boolean;
  slug?: string;
  /** "entry": a page of the new standard; "older": a page with a life of ours; "none": no page. */
  page: "entry" | "older" | "none";
  works: number;
  /** Rights of the page's icon: "settled", "unsettled" or "none". */
  icon: "settled" | "unsettled" | "none";
  events: number;
  councils: number;
  held?: string;
};

export type MonthProblem = { day: string; name: string; slug?: string; problem: string };

export type MonthData = {
  calendar: Calendar;
  saints: readonly MonthSaint[];
  /** Whether an icon's rights are settled (lib/saints/iconRights.ts, iconRightsFor). */
  iconSettled: (src: string) => boolean;
  /** A work's sections, or null when its file is missing. */
  sectionsOf: (saint: string, work: string) => readonly WorkSection[] | null;
  eventsFor?: (slug: string) => number;
  councilsFor?: (slug: string) => number;
  held?: readonly HeldLine[];
};

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Every line of the month, in calendar order: "11-01" to "11-30". */
export function monthLines(calendar: Calendar, month: number): { day: string; line: CalendarLine }[] {
  const mm = String(month).padStart(2, "0");
  return Object.keys(calendar)
    .filter((k) => k.startsWith(`${mm}-`))
    .sort()
    .flatMap((day) => calendar[day].map((line) => ({ day, line })));
}

/** What the app has for each line of the month. */
export function monthRows(month: number, data: MonthData): MonthRow[] {
  const bySlug = new Map(data.saints.map((s) => [s.slug, s]));
  return monthLines(data.calendar, month).map(({ day, line }) => {
    const saint = line.slug ? bySlug.get(line.slug) : undefined;
    const held = data.held?.find((h) => h.day === day && h.name === line.name)?.reason;
    return {
      day,
      name: line.name,
      feast: line.kind === "feast",
      slug: line.slug,
      page: !saint ? "none" : saint.entrySource ? "entry" : "older",
      works: saint?.works.length ?? 0,
      icon: !saint?.iconUrl ? "none" : data.iconSettled(saint.iconUrl) ? "settled" : "unsettled",
      events: saint && data.eventsFor ? data.eventsFor(saint.slug) : 0,
      councils: saint && data.councilsFor ? data.councilsFor(saint.slug) : 0,
      ...(held ? { held } : {}),
    };
  });
}

/** A new-standard page's own faults: prose of ours, an entry run long, an unsettled icon, an uncited passage. */
export function pageProblems(saint: MonthSaint, data: Pick<MonthData, "iconSettled" | "sectionsOf">): string[] {
  const out: string[] = [];
  if (!saint.entrySource?.trim()) return out;
  if (saint.life.some((p) => p.trim())) out.push("carries a life of ours; its Life belongs in a work, in a witness's words");
  if (words(saint.shortBio) > ENTRY_MAX_WORDS) out.push(`its entry runs to ${words(saint.shortBio)} words, past ${ENTRY_MAX_WORDS}`);
  if (saint.iconUrl && !data.iconSettled(saint.iconUrl)) out.push(`its icon ${saint.iconUrl} has no settled rights`);
  for (const w of saint.works) {
    const sections = data.sectionsOf(saint.slug, w.slug);
    if (!sections) {
      out.push(`its work ${w.slug} has no file`);
      continue;
    }
    sections.forEach((s, i) => {
      if (s.voice === "editorial") out.push(`${w.slug} section ${i + 1} is prose of ours`);
      if (!s.voice) out.push(`${w.slug} section ${i + 1} does not say whose words it holds`);
      if (!s.citation?.trim()) out.push(`${w.slug} section ${i + 1} has no citation`);
    });
  }
  return out;
}

/** What keeps the month from being done. Empty when it is. */
export function monthProblems(month: number, data: MonthData): MonthProblem[] {
  const bySlug = new Map(data.saints.map((s) => [s.slug, s]));
  const problems: MonthProblem[] = [];
  for (const { day, line } of monthLines(data.calendar, month)) {
    const held = data.held?.find((h) => h.day === day && h.name === line.name);
    if (held && !held.reason.trim()) problems.push({ day, name: line.name, problem: "held with no reason given" });
    if (line.kind === "feast") continue;
    if (!line.slug) {
      if (!held) problems.push({ day, name: line.name, problem: "no page, and not held" });
      continue;
    }
    const saint = bySlug.get(line.slug);
    if (!saint) {
      problems.push({ day, name: line.name, slug: line.slug, problem: `its slug ${line.slug} names no page` });
      continue;
    }
    for (const problem of pageProblems(saint, data)) problems.push({ day, name: line.name, slug: saint.slug, problem });
  }
  return problems;
}
