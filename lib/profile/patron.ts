// The patron saint's card on a Community profile (r3-28 A, notes 75 and 81):
// his icon, only where its rights are settled, and his name day.
//
// From the library in brief (data/calendar/profiled-saints.json, which the
// calendar already carries on every screen), never the registry, and the
// rights record (lib/saints/iconRights.ts). The profile asks for this with
// import() when a patron is shown, as the widget does (lib/widget/state.ts):
// the rights record is large, and most of Community never needs it.
//
// The icon is the one the app carries (public/saints/icons/), so it opens
// with no network in the apps; a saint whose icon is still in the debt
// (UNVERIFIED_ICONS) stands with the lit cross instead, never a stand-in face.

import profiledSaints from "@/data/calendar/profiled-saints.json";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { parseFeast } from "@/lib/profile/nameDay";
import type { SaintBrief } from "@/lib/saints/brief";
import { iconRightsFor } from "@/lib/saints/iconRights";

export type PatronFacts = {
  slug: string;
  /** /saints/icons/<file>, only when its rights are settled; else null. */
  icon: string | null;
  /** The feast a name day keeps, his first in the calendar (lib/profile/nameDay.ts). */
  feast: { month: number; day: number } | null;
};

const BY_SLUG = new Map((profiledSaints as SaintBrief[]).map((s) => [s.slug, s]));

/** The card's facts for a patron, or null for a saint this build does not carry. */
export function patronFacts(slug: string | null | undefined): PatronFacts | null {
  const saint = slug ? BY_SLUG.get(slug) : undefined;
  if (!saint) return null;
  const icon = saint.iconUrl && iconRightsFor(saint.iconUrl) ? saint.iconUrl : null;
  return { slug: saint.slug, icon, feast: parseFeast(saint.feastDays[0]) };
}

/**
 * A feast as the reader's language writes a day of the year: "November 13",
 * "13. November". In UTC, as every date of record on a profile is
 * (lib/profile/dates.ts), on a leap year so February 29 is a day.
 */
export function feastLabel(feast: { month: number; day: number }, locale: string): string {
  return new Intl.DateTimeFormat(dateLocale(locale), { month: "long", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, feast.month, feast.day, 12)),
  );
}
