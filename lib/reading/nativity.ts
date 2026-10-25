/**
 * The Nativity Fast path on Today (1.8, the owner's yes of 2026-10-24): for
 * a reader on the path, the day they are on; in the week before the fast and
 * through it, for a reader not on it yet, an invitation. The path itself is
 * an ordinary reading path (lib/reading/paths.ts, id "nativity"), so its days
 * are kept where every path keeps them (purify:path:<id>), and a reader
 * starts it whenever they start.
 *
 * The fast runs from 15 November to 24 December; on the old calendar the
 * same days fall thirteen days later by the civil date, 28 November to
 * 6 January. Pure.
 */

export const NATIVITY_PATH = "nativity";

const DAY_MS = 86_400_000;

function dayNumber(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

/** The fast that is on or next to come, as local day numbers [first, last]. */
export function nativityFastAround(now: Date, style: "new" | "old"): [number, number] {
  const shift = style === "old" ? 13 : 0;
  const fastOf = (year: number): [number, number] => {
    const first = dayNumber(new Date(year, 10, 15)) + shift;
    return [first, first + 39];
  };
  const today = dayNumber(now);
  // The fast that began last year can still be running in early January.
  const last = fastOf(now.getFullYear() - 1);
  return today <= last[1] ? last : fastOf(now.getFullYear());
}

export type NativityRow = { kind: "invite" } | { kind: "day"; n: number; of: number } | null;

/**
 * What Today shows: the next day to read for a reader on the path (any time
 * of year, until it is done); otherwise an invitation, from a week before
 * the fast to its last day; otherwise nothing.
 */
export function nativityRow(now: Date, style: "new" | "old", done: readonly number[], days: number): NativityRow {
  if (days <= 0) return null;
  if (done.length > 0) {
    const read = new Set(done);
    const next = Array.from({ length: days }, (_, i) => i).find((i) => !read.has(i));
    return next === undefined ? null : { kind: "day", n: next + 1, of: days };
  }
  const [first, last] = nativityFastAround(now, style);
  const today = dayNumber(now);
  return today >= first - 7 && today <= last ? { kind: "invite" } : null;
}
