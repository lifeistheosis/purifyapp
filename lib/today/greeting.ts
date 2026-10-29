// The greeting at the top of Today, one design for each type of reader (1.8):
// the owner's round 14, TRANSITIONARY, his word of 2026-10-28 for a screen or
// section that shows different things to each type of reader
// (Homebase/boards/purify-master/r18/choose/14b-greeting-transitionary.png).
//
//   orthodox  the date with the day's marks (a great feast, the fast), the
//             feast's or the day's saint's name as the headline with their
//             icon where the app has one, "Hymns of the feast" where the app
//             holds their hymns, and the hour's prayers as one pill.
//   learning  the greeting as it was, one line naming the day's feast or
//             saint by the calendar's own name, and "See the day".
//   new       the greeting as it was, and a verse for the hour from the app's
//             own Psalter (Brenton), its reference in small capitals.
//
// The type is the reader's own answer (lib/onboarding/readerType.ts), never
// decided here. No tone of the week anywhere: the owner parked it on
// 2026-10-15. Pure: components/today/GreetingHeader.tsx draws what this says.

import type { Commemoration, FastingStatus } from "@/lib/calendar/orthodox";
import type { ReaderType } from "@/lib/onboarding/readerType";
import { fastView, type FastingRule } from "@/lib/onboarding/space";
import type { HourRuleId } from "@/lib/prayers/ruleForHour";
import { getRuleMeta } from "@/lib/prayers/rules";
import { hymnsOf } from "@/lib/saints/hymns";
// The great feasts are the shop's list (it drops a piece before each one):
// the calendar's own names, which lib/shop/__tests__/feasts.test.ts holds to
// the calendar's files, and nothing else of the shop.
import { GREAT_FEASTS, feastDate, type GreatFeast } from "@/lib/shop/feasts";

/** The part of the day the greeting names: morning, afternoon or evening. */
export type DayPart = "morning" | "afternoon" | "evening";

/**
 * A verse for each part of the day, from the app's own Psalter (Brenton, the
 * Septuagint's numbering, as the app has it). The brief named the morning's
 * and the evening's; the afternoon's is the one psalm verse that names noon
 * with the morning and the evening, chosen here for the owner to change. The
 * words are read from data/bible/psalms at build time
 * (lib/today/hourVerse.server.ts), never typed.
 */
export const HOUR_VERSES: Readonly<Record<DayPart, { chapter: number; verse: number }>> = {
  morning: { chapter: 5, verse: 3 },
  afternoon: { chapter: 54, verse: 17 },
  evening: { chapter: 140, verse: 2 },
};

/** A verse's words and its place in the Psalter ("5:3"). */
export type HourVerse = { text: string; ref: string };
export type HourVerses = Readonly<Record<DayPart, HourVerse>>;

/** What leads the day: a great feast, a feast, or the day's saint. */
export type DayLead = {
  /** As the calendar names it. */
  name: string;
  kind: "great-feast" | "feast" | "saint";
  /** The profile's icon, where the app has one. */
  iconUrl: string | null;
  /** The saint page's Hymns door, where the app holds their hymns (lib/saints/hymns.ts). */
  hymnsHref: string | null;
};

const DAY_MS = 86_400_000;
const dayOf = (d: Date) => Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY_MS);

/**
 * The great feast kept on this day, or null. `civil` is the reader's day and
 * `lookup` the same day on their calendar (lib/calendar/useChurchDay.ts): the
 * fixed feasts hang off the menaion's date, so the old calendar keeps them
 * thirteen days later; the feasts reckoned from Pascha fall on the same civil
 * day for both, as Pascha does.
 */
export function greatFeastOn(civil: Date, lookup: Date): GreatFeast | null {
  for (const feast of GREAT_FEASTS) {
    if ("fromPascha" in feast.on) {
      if (dayOf(feastDate(feast, civil.getUTCFullYear())) === dayOf(civil)) return feast;
    } else if (lookup.getUTCMonth() + 1 === feast.on.month && lookup.getUTCDate() === feast.on.day) {
      return feast;
    }
  }
  return null;
}

/**
 * Who leads the day: a great feast by its name, else the calendar's headline,
 * which is the day's feast when it has one and its first saint otherwise. The
 * feasts reckoned from Pascha are not in the menaion's days, so on those the
 * feast's name comes from the great feasts' list, with no icon.
 */
export function dayLead(day: { today: Date; headline: Commemoration | undefined }, lookup: Date): DayLead | null {
  const great = greatFeastOn(day.today, lookup);
  if (great) return leadOf(great.name, "great-feast", day.headline?.name === great.name ? day.headline : undefined);
  const headline = day.headline;
  if (!headline) return null;
  return leadOf(headline.name, headline.kind === "feast" ? "feast" : "saint", headline);
}

function leadOf(name: string, kind: DayLead["kind"], from: Commemoration | undefined): DayLead {
  const slug = from?.saint?.slug ?? null;
  return {
    name,
    kind,
    iconUrl: from?.saint?.iconUrl ?? null,
    hymnsHref: slug && hymnsOf(slug).length > 0 ? `/saints/${slug}#hymns` : null,
  };
}

/** The day's marks after the date, for the Orthodox reader. */
export type DayMarks = {
  feast: "great" | "feast" | null;
  /** The fast as the reader keeps it: the calendar's rule, the plain line, or nothing (hidden). */
  fast: { kind: "calendar"; ruleId: FastingStatus["ruleId"] } | { kind: "plain" } | null;
};

export function dayMarks(lead: DayLead | null, fast: FastingStatus, rule: FastingRule): DayMarks {
  const shown = fastView(fast.kind, rule);
  return {
    feast: lead?.kind === "great-feast" ? "great" : lead?.kind === "feast" ? "feast" : null,
    fast: shown === null ? null : shown.mode === "plain" ? { kind: "plain" } : { kind: "calendar", ruleId: fast.ruleId },
  };
}

/** The learning reader's one line, by what leads the day. */
export function learningLineKey(lead: DayLead): "today.greet.greatFeastLine" | "today.greet.feastLine" | "today.greet.saintLine" {
  return lead.kind === "great-feast"
    ? "today.greet.greatFeastLine"
    : lead.kind === "feast"
      ? "today.greet.feastLine"
      : "today.greet.saintLine";
}

/**
 * Which greeting a reader is given. A day with nothing to name, or a verse
 * that could not be read, falls back to the greeting as it always was.
 */
export function greetingKind(type: ReaderType, lead: DayLead | null, verse: boolean): "lead" | "line" | "verse" | "plain" {
  if (type === "new") return verse ? "verse" : "plain";
  if (!lead) return "plain";
  return type === "orthodox" ? "lead" : "line";
}

/** The hour's prayer: what the Pray rail on Today leads with. */
export type HourPrayer = { href: string; titleKey: string; minutes: number | null };

/**
 * The same choice components/today/PrayNowCard.tsx makes for its first card:
 * the reader's own rule when it has the part the hour calls for
 * (lib/prayers/myRule.ts, todayRuleCard), else the Morning or Evening Rule by
 * the hour (lib/prayers/ruleForHour.ts).
 */
export function hourPrayer(
  ruleId: HourRuleId,
  mine: { part: "morning" | "evening"; href: string; minutes: number } | null,
): HourPrayer {
  if (mine) {
    return {
      href: mine.href,
      titleKey: mine.part === "evening" ? "prayers.mine.eveningTitle" : "prayers.mine.morningTitle",
      minutes: mine.minutes || null,
    };
  }
  const meta = getRuleMeta(ruleId);
  return {
    href: meta?.href ?? `/prayers/${ruleId}`,
    titleKey: ruleId === "evening" ? "today.prayNow.eveningFallback" : "today.prayNow.morningFallback",
    minutes: meta?.estimatedMinutes ?? null,
  };
}
