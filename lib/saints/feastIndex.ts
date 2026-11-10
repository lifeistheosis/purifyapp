import { SAINTS } from "@/lib/saints/saints";

/**
 * The saints' fixed feasts as month and day, for choosing a nameday by the
 * saint it is kept for (build 89 note 11: "the nameday chosen from a month
 * and day, or by naming the saint whose feast it is, never typed").
 *
 * Served as a file the apps carry (app/saint-feasts.json/route.ts) and
 * fetched when the choice opens, not handed over as a prop: a page carries
 * what it shows (AGENTS.md). A movable feast ("Fifth Sunday of Great Lent")
 * has no month and day, and is left out.
 */

export type SaintFeast = { slug: string; name: string; days: string[] };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "August 9" as "08-09"; null for anything that is not a plain month and day. */
export function feastMonthDay(day: string): string | null {
  const m = /^([A-Z][a-z]+) (\d{1,2})$/.exec(day.trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[1]) + 1;
  const date = Number(m[2]);
  if (month < 1 || date < 1 || date > 31) return null;
  return `${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

/** Every saint with at least one fixed feast, in the profiles' order. */
export function saintFeasts(): SaintFeast[] {
  return SAINTS.map((s) => ({ slug: s.slug, name: s.name, days: s.feastDays.map(feastMonthDay).filter((d): d is string => d !== null) })).filter(
    (s) => s.days.length > 0,
  );
}
