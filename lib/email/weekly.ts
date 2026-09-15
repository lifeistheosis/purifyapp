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
  name: string;
  kind: "feast" | "saint";
  /** A registry saint the library has a page for. */
  slug: string | null;
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
    days.push({
      date,
      day: dayLabel(date),
      name: headline.saint?.name ?? headline.name,
      kind: headline.kind === "feast" ? "feast" : "saint",
      slug: headline.saint ? headline.saint.slug : null,
    });
  }

  const lines = [...days]
    .sort((a, b) => (a.kind === b.kind ? a.date.getTime() - b.date.getTime() : a.kind === "feast" ? -1 : 1))
    .slice(0, 5)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const withPage = lines.find((l) => l.slug);
  return { lines, saint: withPage ? { name: withPage.name, slug: withPage.slug! } : null };
}
