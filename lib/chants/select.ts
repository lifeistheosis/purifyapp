import { toneOfWeek } from "@/lib/calendar/octoechos";
import { orthodoxPascha } from "@/lib/calendar/pascha";

import { CHANT_TRADITIONS, type ChantIndexRow, type ChantTradition, type ChantWhen, type ChantWindow } from "./types";

/**
 * What the Chants home offers today (1.7): the chant to open on, and the rows
 * under it. Pure: handed the index, the reader's day and their calendar, so
 * it is tested without a screen, and it runs on the device (the apps' export
 * would freeze a server's "today" at its build day).
 *
 * The rows are the owner's plan of 2026-10-16: this week's tone, the feast,
 * the Psalms ("we love singing the Psalms in the Orthodox Church"), short
 * chants, and by tradition. The library starts with one chant, so the home
 * is built to read well with few: a row with nothing in it is not drawn, a
 * row is not drawn to repeat the one chant already at the top, the tradition
 * chips need two traditions to choose between, and "All chants" needs two
 * chants to list. No placeholder ever stands in for a chant
 * (docs/editorial-standards.md: empty sections render nothing).
 */
export type CalStyle = "new" | "old";

/** A chant this short or shorter is a "short chant". */
export const SHORT_SECONDS = 120;
/** A feast's chants are offered from this many days before it. */
export const FEAST_AHEAD_DAYS = 7;
/** The Old Calendar keeps a fixed feast this many days later by the civil date. */
const JULIAN_OFFSET_DAYS = 13;

const DAY_MS = 86_400_000;
function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY_MS);
}
function monthDayNumber(year: number, mmdd: string): number {
  const [m, d] = mmdd.split("-").map(Number);
  return Math.floor(Date.UTC(year, m - 1, d) / DAY_MS);
}

/** A window's days in one year of the reader's civil calendar, first and last. */
function windowSpan(w: ChantWindow, year: number, style: CalStyle): [number, number] {
  if ("paschal" in w) {
    const pascha = dayNumber(orthodoxPascha(year));
    return [pascha + w.paschal[0], pascha + w.paschal[1]];
  }
  const shift = style === "old" ? JULIAN_OFFSET_DAYS : 0;
  const from = monthDayNumber(year, w.fixed[0]) + shift;
  let to = monthDayNumber(year, w.fixed[1]) + shift;
  // A span over the new year ("12-25" to "01-06") ends in the next one.
  if (to < from) to = monthDayNumber(year + 1, w.fixed[1]) + shift;
  return [from, to];
}

/** Whether a chant is due on `date`, or within `ahead` days after it. */
export function isDue(when: ChantWhen, date: Date, style: CalStyle, ahead = 0): boolean {
  if (!when.windows?.length) return false;
  const first = dayNumber(date);
  const last = first + ahead;
  const year = date.getUTCFullYear();
  return when.windows.some((w) =>
    [year - 1, year, year + 1].some((y) => {
      const [from, to] = windowSpan(w, y, style);
      return from <= last && to >= first;
    }),
  );
}

export type HomeSection =
  | { id: "feast"; rows: ChantIndexRow[] }
  | { id: "tone"; tone: number; rows: ChantIndexRow[] }
  | { id: "psalms"; rows: ChantIndexRow[] }
  | { id: "short"; rows: ChantIndexRow[] };

export type ChantsHome = {
  /**
   * The chant at the top: today's feast, cover or not, in its own season;
   * else the one with a cover among this week's tone, else the newest with a
   * cover (restingChant).
   */
  featured: ChantIndexRow | null;
  sections: HomeSection[];
  /** The traditions to filter by: empty unless there are two to choose between. */
  traditions: ChantTradition[];
  /** Every chant, by name: null until there are two. */
  all: ChantIndexRow[] | null;
};

/** The chant added last. */
export function newestChant(index: ChantIndexRow[]): ChantIndexRow | null {
  return [...index].sort((a, b) => b.addedOn.localeCompare(a.addedOn) || a.title.localeCompare(b.title))[0] ?? null;
}

/**
 * The chant to open on when nothing is due (1.8): the newest that has a
 * cover, so the first thing on Chants is a picture and not a plate. The
 * coordinator's walk of 2026-10-30 found the home opening on Psalm 117, the
 * newest, with no cover. Only with no cover anywhere is it the newest of all.
 */
export function restingChant(index: ChantIndexRow[]): ChantIndexRow | null {
  return newestChant(index.filter((r) => r.cover)) ?? newestChant(index);
}

/** The traditions present in a list, in the order the browse row gives them. */
export function traditionsIn(index: ChantIndexRow[]): ChantTradition[] {
  const present = new Set(index.flatMap((r) => r.traditions));
  return CHANT_TRADITIONS.filter((t) => present.has(t));
}

/** The chants with a version in one tradition. */
export function inTradition(index: ChantIndexRow[], tradition: ChantTradition | null): ChantIndexRow[] {
  return tradition ? index.filter((r) => r.traditions.includes(tradition)) : index;
}

export function chantsHome(index: ChantIndexRow[], date: Date, style: CalStyle): ChantsHome {
  const tone = toneOfWeek(date)?.tone ?? null;
  const feast = index.filter((r) => isDue(r.when, date, style, FEAST_AHEAD_DAYS));
  const toned = tone ? index.filter((r) => r.tone === tone) : [];
  // A feast's chant opens the home in its own season, picture or not (the
  // Paschal Canon from Palm Sunday through Bright Week). Out of season the
  // top is a chant with a cover: this week's tone's, else the newest's; and
  // only where none has a cover, the week's tone's, else the newest's.
  const covered = index.filter((r) => r.cover);
  const featured =
    feast.find((r) => r.cover) ?? feast[0] ?? toned.find((r) => r.cover) ?? newestChant(covered) ?? toned[0] ?? newestChant(index);

  const sections: HomeSection[] = [];
  // A row with nothing in it, or only the chant already at the top, is not drawn.
  const worth = (rows: ChantIndexRow[]) => rows.length > 1 || (rows.length === 1 && rows[0].slug !== featured?.slug);
  if (worth(feast)) sections.push({ id: "feast", rows: feast });
  if (tone && worth(toned)) sections.push({ id: "tone", tone, rows: toned });
  const psalms = index.filter((r) => r.kind === "psalm");
  if (worth(psalms)) sections.push({ id: "psalms", rows: psalms });
  const short = index.filter((r) => r.shortest <= SHORT_SECONDS);
  if (worth(short)) sections.push({ id: "short", rows: short });

  const traditions = traditionsIn(index);
  return {
    featured,
    sections,
    traditions: traditions.length >= 2 ? traditions : [],
    all: index.length >= 2 ? [...index].sort((a, b) => a.title.localeCompare(b.title)) : null,
  };
}
