// When to bow and when to stand, in the Hours (1.9): the guide, as data.
//
// The owner's ask, through the arbiter on 2026-11-11: in the Hours, say when
// to bow and when to prostrate, following the Church year. The bar he set:
// every rule from a named public-domain source, quoted and cited; nothing
// invented; where no such text says it, the plain sentence that the custom is
// given by the Typikon and differs, and to ask your priest.
//
// So this file holds exactly three rules, each under its own quotation, and
// one sentence for every other day:
//
//   1. The Lord's Day: prayer is made standing (First Nicaea, canon 20; the
//      Council in Trullo, canon 90, for when the day begins and ends; St
//      Basil, On the Holy Spirit 27).
//   2. The days of Pentecost, Pascha to Pentecost: the same (First Nicaea,
//      canon 20; St Basil 27).
//   3. The weekdays of the Great Fast: the Prayer of St Ephraim with
//      reverences to the earth, at the First, Third and Sixth Hours (Hapgood's
//      Service Book of 1906, each Hour on its own page).
//
// WHAT IS NOT HERE, on purpose. The feasts: no public-domain text Purify
// holds says what is done on them. Saturdays in the Great Fast: Hapgood says
// "if it be the Great Fast" and names no days. Holy Week: Hapgood ends "the
// Great Fast proper" on the eve of Lazarus Saturday. The Ninth Hour and
// Compline in the Fast: Hapgood's rubric on p. 57 stands under the
// Interhour's heading, and her Compline is the Grand one, so neither is put
// under an Hour it was not printed for; they say only that more reverences
// are appointed in the Fast (p. xvi). All of these get the plain sentence.
//
// The Annunciation, when it falls on a weekday of the Forty Days on the
// reader's calendar, gets the plain sentence too: a great feast is not told
// the Fast's rule on the strength of a rubric that does not name it.
//
// WHERE RULES MEET. The Lord's Day is first: a Sunday in the Fast stands.
// The days of Pentecost and the Fast never fall together.
//
// The canons and St Basil are held, letter for letter, to the files the app
// already carries; Hapgood, which it does not carry, to
// data/prayers/metanies/hapgood-1906.json, where each rubric was read on the
// page image of the scan (lib/prayers/__tests__/metanies.test.ts). The whole
// guide is worship guidance and is marked for the clergy's review
// (docs/editorial-standards.md, clergy queue).
//
// The Church year here is the movable one, counted from Pascha, which both
// calendars keep on the same day (lib/calendar/pascha.ts), so the guide is
// the same for a reader on the old calendar and on the new, but for the one
// fixed feast it knows, the Annunciation.

import { orthodoxPascha } from "@/lib/calendar/pascha";

/**
 * The mark a clergy review looks for. It stays here and in the admin's queue: a
 * reader is never told that a text awaits review (the owner's standing note of
 * 2026-11-06, docs/editorial-standards.md, clergy queue item 27).
 */
export const METANY_GUIDE_REVIEW = {
  status: "awaiting-clergy-review",
  since: "2026-11-11",
} as const;

/** One line: its catalog key, and the English it says. */
export type Line = { key: string; en: string };
const line = (key: string, en: string): Line => ({ key, en });

// ---- Sources ------------------------------------------------------------

export type SourceId = "nicaea1" | "trullo" | "basil" | "hapgood";

export type Source = {
  id: SourceId;
  /** How it is cited, in English as it is printed. */
  cite: string;
  /** The file every quotation from it is held to. */
  file: string;
  /** Where Purify carries it, when it does. */
  href?: string;
};

export const SOURCES: Record<SourceId, Source> = {
  nicaea1: {
    id: "nicaea1",
    cite: "First Council of Nicaea, Canon 20",
    file: "data/councils/first-nicaea/the-twenty-canons.json",
    href: "/councils/first-nicaea/the-twenty-canons#s21",
  },
  trullo: {
    id: "trullo",
    cite: "Council in Trullo, Canon 90",
    file: "data/councils/third-constantinople/the-canons-of-trullo.json",
    href: "/councils/third-constantinople/the-canons-of-trullo#s91",
  },
  basil: {
    id: "basil",
    cite: "St Basil the Great, On the Holy Spirit, 27",
    file: "data/saints/basil-the-great/on-the-holy-spirit.json",
    href: "/saints/basil-the-great/on-the-holy-spirit#s27",
  },
  hapgood: {
    id: "hapgood",
    cite: "Hapgood, Service Book (1906)",
    file: "data/prayers/metanies/hapgood-1906.json",
  },
};

/** Words in their source's own English, with the page where the source has pages. */
export type Quote = { source: SourceId; text: string; page?: string };

export const QUOTES = {
  standing: {
    source: "nicaea1",
    text: "it seems good to the holy Synod that prayer be made to God standing.",
  },
  pentecostDays: {
    source: "nicaea1",
    text: "certain persons who kneel on the Lord's Day and in the days of Pentecost",
  },
  saturdayToSunday: {
    source: "trullo",
    text: "after the priests have gone to the Altar for Vespers on Saturdays (according to the prevailing custom) no one shall kneel in prayer until the evening of Sunday",
  },
  firstDay: {
    source: "basil",
    text: "We pray standing, on the first day of the week, but we do not all know the reason.",
  },
  allPentecost: {
    source: "basil",
    text: "Moreover all Pentecost is a reminder of the resurrection expected in the age to come.",
  },
  lentMore: {
    source: "hapgood",
    page: "xvi",
    text: "More reverences to the earth are appointed for the Great Fast (Lent) than for the services at other seasons",
  },
  firstHourLent: {
    source: "hapgood",
    page: "41",
    text: "And if it be the Great Fast, we make three great reverences to the earth, reciting the prescribed Prayer of St. Ephraim the Syrian.",
  },
  thirdHourLent: {
    source: "hapgood",
    page: "47",
    text: "And if it be the Great Fast (Lent), we make three great reverences, reciting the prescribed Prayer of St. Ephraim the Syrian.",
  },
  sixthHourLent: {
    source: "hapgood",
    page: "52",
    text: "And if it be a Fast, we make three great reverences to the very earth and say the prescribed Prayer of St. Ephraim the Syrian.",
  },
  twelveLesser: {
    source: "hapgood",
    page: "41",
    text: "Then twelve lesser reverences, saying at each: O God, cleanse thou me, a sinner. Then the whole Prayer is repeated; with one great reverence in conclusion.",
  },
} as const satisfies Record<string, Quote>;

export type QuoteId = keyof typeof QUOTES;

// ---- The lines a reader sees --------------------------------------------

export const WORDS = {
  title: line("prayers.metany.title", "Bows and prostrations"),
  lead: line("prayers.metany.lead", "When the Church bows, and when she stands. Each rule here is given in the words of its source."),
  /** Every day no rule here speaks to, and the foot of the guide. */
  ask: line(
    "prayers.metany.ask",
    "When to bow and when to bow to the earth is given by the Typikon, and the custom differs between traditions and between parishes. Ask your priest.",
  ),
  /** The editorials' own sentence, not a quotation: Hapgood's two terms, said plainly once. */
  kinds: line("prayers.metany.kinds", "A lesser reverence is a bow from the waist. A great reverence is made to the earth."),
  open: line("prayers.metany.open", "Bows and prostrations: the guide"),
  english: line("prayers.metany.english", "The sources are quoted in the English they were published in."),
} as const;

export type RuleId = "lordsDay" | "pentecost" | "lent";

export type Rule = {
  id: RuleId;
  /** Its name on the guide page. */
  name: Line;
  /** The line under an Hour's title on its days. */
  today: Line;
  /** The words beside that line. */
  cite: QuoteId;
  /** What the guide page quotes for it, in order. */
  quotes: readonly QuoteId[];
};

export const RULES: Record<RuleId, Rule> = {
  lordsDay: {
    id: "lordsDay",
    name: line("prayers.metany.lordsDay.name", "The Lord's Day"),
    today: line("prayers.metany.lordsDay.today", "Today is the Lord's Day. The canon asks that prayer be made to God standing."),
    cite: "standing",
    quotes: ["standing", "saturdayToSunday", "firstDay"],
  },
  pentecost: {
    id: "pentecost",
    name: line("prayers.metany.pentecost.name", "From Pascha to Pentecost"),
    today: line("prayers.metany.pentecost.today", "These are the days of Pentecost, the fifty days from Pascha. The canon asks that prayer be made to God standing."),
    cite: "pentecostDays",
    quotes: ["pentecostDays", "standing", "allPentecost"],
  },
  lent: {
    id: "lent",
    name: line("prayers.metany.lent.name", "The weekdays of the Great Fast"),
    today: line("prayers.metany.lent.today", "It is the Great Fast. The service book appoints the Prayer of St Ephraim here, with reverences to the earth."),
    cite: "lentMore",
    quotes: ["lentMore", "firstHourLent", "thirdHourLent", "sixthHourLent", "twelveLesser"],
  },
};

/** At Compline on Saturday, when the Lord's Day has begun (Trullo 90). */
export const LORDS_DAY_EVE = line("prayers.metany.lordsDay.eve", "The Lord's Day has begun. The canon asks that no one kneel in prayer until the evening of Sunday.");

/** In the Fast, at an Hour whose own page has no rubric to quote. */
export const LENT_GENERAL = line("prayers.metany.lent.general", "It is the Great Fast. The service book appoints more reverences to the earth in these days.");

export const RULE_ORDER: readonly RuleId[] = ["lordsDay", "pentecost", "lent"];

// ---- The day ------------------------------------------------------------

export const HOUR_IDS = ["first-hour", "third-hour", "sixth-hour", "ninth-hour", "compline"] as const;
export type HourId = (typeof HOUR_IDS)[number];

/** The Hours whose own page in Hapgood carries the Fast's rubric. */
const LENT_AT: Partial<Record<HourId, QuoteId>> = {
  "first-hour": "firstHourLent",
  "third-hour": "thirdHourLent",
  "sixth-hour": "sixthHourLent",
};

const DAY = 86_400_000;
const noon = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12);

/** Days from Pascha of the date's own year (a calendar day at noon UTC, as lib/calendar gives it). */
export function daysFromPascha(day: Date): number {
  return Math.round((noon(day) - noon(orthodoxPascha(day.getUTCFullYear()))) / DAY);
}

export type MetanyToday =
  | { rule: RuleId; line: Line; quote: Quote; also?: Quote }
  /** No rule here speaks to this day at this Hour. */
  | { rule: null; line: Line };

/**
 * What the guide says at this Hour on this day.
 *
 * `day` is the reader's calendar day at noon UTC (startOfDayLocal). The
 * Lord's Day runs from Saturday's Vespers to Sunday's evening (Trullo 90:
 * kneeling returns "after the entrance for compline"), so the Hours of the
 * day keep it on Sunday, and Compline on Saturday and not on Sunday. The days
 * of Pentecost run the same way, from Pascha to Pentecost Sunday.
 */
export function metanyFor(hour: HourId, day: Date, style: "new" | "old" = "new"): MetanyToday {
  const evening = hour === "compline";
  const weekday = day.getUTCDay(); // 0 is Sunday
  const p = daysFromPascha(day);

  if (evening && weekday === 6) return { rule: "lordsDay", line: LORDS_DAY_EVE, quote: QUOTES.saturdayToSunday };
  if (!evening && weekday === 0) return ruled("lordsDay");

  // Pascha is day 0, Pentecost day 49. Compline belongs to the day that follows it.
  if (evening ? p >= -1 && p <= 48 : p >= 0 && p <= 49) return ruled("pentecost");

  // Clean Monday is day -48; the Fast proper ends on the eve of Lazarus Saturday, day -9.
  // Compline belongs to the day that follows it: Sunday's evening to Thursday's.
  const fastDay = evening ? p >= -49 && p <= -10 && weekday <= 4 : p >= -48 && p <= -9 && weekday >= 1 && weekday <= 5;
  if (fastDay && !annunciation(day, style, evening)) {
    const own = LENT_AT[hour];
    if (own) return { rule: "lent", line: RULES.lent.today, quote: QUOTES[own], also: QUOTES.twelveLesser };
    return { rule: "lent", line: LENT_GENERAL, quote: QUOTES.lentMore };
  }

  return { rule: null, line: WORDS.ask };
}

/**
 * The Annunciation, 25 March on the reader's calendar (7 April by the civil
 * date on the old). A great feast inside the Forty Days: no public-domain
 * text here says what is done on it, so the Fast's rule is not spoken over it
 * (the arbiter's mend, 2026-11-11). Compline keeps quiet on its eve and its
 * evening both.
 */
function annunciation(day: Date, style: "new" | "old", evening: boolean): boolean {
  const feast = Date.UTC(day.getUTCFullYear(), 2, 25, 12) + (style === "old" ? 13 * DAY : 0);
  const n = Math.round((noon(day) - feast) / DAY);
  return evening ? n === -1 || n === 0 : n === 0;
}

function ruled(id: Exclude<RuleId, "lent">): MetanyToday {
  return { rule: id, line: RULES[id].today, quote: QUOTES[RULES[id].cite] };
}

/** How a quotation is cited: its source, and its page where it has one. */
export function citeOf(q: Quote): string {
  const s = SOURCES[q.source].cite;
  return q.page ? `${s}, p. ${q.page}` : s;
}

/** Every line this file shows, for the catalog's test. */
export function allLines(): Line[] {
  return [...Object.values(WORDS), LENT_GENERAL, LORDS_DAY_EVE, ...RULE_ORDER.flatMap((id) => [RULES[id].name, RULES[id].today])];
}
