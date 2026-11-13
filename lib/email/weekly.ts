import { commemorationsOn, type Commemoration } from "@/lib/calendar/orthodox";

/**
 * The week ahead, for the Sunday email.
 *
 * The board: "Feasts and commemorations for the next seven days, from the
 * calendar the app already computes, plus one saint and a link into the
 * library. Five lines and a link, not an essay." So this reads the same
 * calendar every calendar screen reads (lib/calendar/orthodox.ts, pure, bundled
 * data, no database), takes each day's headline the way the home widget does
 * (the feast if the day has one, else the first commemoration), keeps five
 * days with feasts first, and puts them back in date order.
 *
 * New calendar. Most readers' reckoning is not readable on the server yet
 * (profiles.calendar_reckoning is probably not applied), and a line in the
 * email that is thirteen days off for them is worse than a note saying which
 * calendar it follows, which the email carries.
 *
 * Pure: `lookup` defaults to the real calendar and is a parameter so the rules
 * are tested without depending on which saints fall in which week.
 */

export type WeekLine = {
  date: Date;
  /** "Monday, September 21" */
  day: string;
  /** The day's name: a feast by its own name, a saint's day by the saint. */
  name: string;
  kind: "feast" | "saint";
  /** A registry saint the library has a page for. */
  slug: string | null;
  /** That saint's own name, for the week's saint card; null or absent when the day names no registry saint. */
  saintName?: string | null;
};

const DAY = 86_400_000;

export function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function weekAhead(
  start: Date,
  lookup: (d: Date) => Commemoration[] = commemorationsOn,
): { lines: WeekLine[]; saint: { name: string; slug: string } | null } {
  const first = startOfUtcDay(start);
  const days: WeekLine[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(first.getTime() + i * DAY);
    const all = lookup(date);
    const headline = all.find((c) => c.kind === "feast") ?? all[0];
    if (!headline) continue;
    const feast = headline.kind === "feast";
    days.push({
      date,
      day: dayLabel(date),
      // A feast is said by its own name, never by the saint it honours: the
      // Forefeast and the Entrance of the Theotokos, 20 and 21 November 2026,
      // both read "The Most Holy Theotokos" before this (found 2026-11-13,
      // docs/brand/kit/email/README.md, "For the build", 4).
      name: feast ? headline.name : (headline.saint?.name ?? headline.name),
      kind: feast ? "feast" : "saint",
      slug: headline.saint ? headline.saint.slug : null,
      saintName: headline.saint?.name ?? null,
    });
  }

  const lines = [...days]
    .sort((a, b) => (a.kind === b.kind ? a.date.getTime() - b.date.getTime() : a.kind === "feast" ? -1 : 1))
    .slice(0, 5)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // The week's saint card names the saint, whose page it opens, even on a
  // feast in the saint's honour.
  const withPage = lines.find((l) => l.slug);
  return { lines, saint: withPage ? { name: withPage.saintName ?? withPage.name, slug: withPage.slug! } : null };
}
