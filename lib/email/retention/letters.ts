import { commemorationsOn, fastingStatus, shiftForStyle, type CalStyle, type FastKind } from "@/lib/calendar/orthodox";
import en from "@/lib/i18n/messages/en.json";
import { RULES } from "@/lib/prayers/rules";
import { workHref } from "@/lib/reading/workHref";

import { siteUrl, type EmailDay } from "../templates/build";

import type { RetentionKind } from "./kinds";
import { FAST_TITLE, dayOf, daysAhead, weekDays, type FastDay, type FastId } from "./fasts";
import type { FastingPiece, FirstWeekStep, PersonalLine, PlannedRetention } from "./plan";

/**
 * The words of the three retention emails, as content apart from any look.
 *
 * A letter is what an email says: its subject, the opening (a heading and a
 * line under it), its paragraphs, a list of days where it has one, and one
 * button. How it looks is not here. Each email's look is Fable's to design on
 * the kit (docs/brand/kit/email/), with a reason for every choice, and the
 * owner's yes or no; an approved look drops in at looks.ts and draws these
 * same letters. Until then a letter is drawn only by standInEmail below, a
 * plain stand-in that is never sent to anyone.
 *
 * WHERE EVERY WORD COMES FROM, so that nothing here is a model's framing of
 * the faith (docs/editorial-standards.md: that goes to the editorial queue,
 * never straight to a send):
 *
 *   - the app's own catalog lines, word for word (lib/i18n/messages/en.json):
 *     the calendar's setting and its hint, "Bookmark verse", the Nativity
 *     plan's line, and the calendar's own word on the fast
 *     ("calendar.fastingDisclaimer");
 *   - the prayer rules' own titles and lines (lib/prayers/rules.ts);
 *   - the calendar: each day's fast as fastingStatus names it, and the
 *     feasts by their names (lib/calendar/orthodox.ts);
 *   - the reader's own account: the book and chapter, the work and its
 *     saint, the patron saint they chose;
 *   - and a few plain sentences that say only where something is in the app
 *     or what the email holds (COPY, below), which name no teaching.
 *
 * No line of Scripture, of a Father or of a service is quoted. If a design
 * adds one, it is copied from the app's own text with its source named,
 * never typed (the editorial standards' rule on quotations).
 *
 * NO CLAIMS. Whether a reader has prayed, chosen a calendar or kept a verse
 * is not always known (a reader on the free plan keeps bookmarks on the
 * device), so no letter says it was not done. lib/email/retention/__tests__
 * holds every letter to that, to the house's copy rules (no exclamation, no
 * clock, no pressure, no praise, no em dash) and to these sources.
 */

/**
 * One day of a fast, as the list in a companion's letter carries it. `day`,
 * `name` and `kind` are what the plain stand-in draws (a feast set heavier);
 * `weekday`, `date` and `fast` are the shared day's own fields, which the
 * kit's margin draws (lib/email/kitLetters.ts kitDay), so a look on the
 * kit's pieces takes these days as they are. The rest is for a look that
 * draws the week its own way: the civil date,
 * the calendar's register for the day's fast (the kit's fasting colours,
 * docs/brand/kit/email/README.md, "Each day says its fast"), its label and
 * its rule in the calendar's words (a week drawn by register can say each
 * rule once), and the feasts by name.
 */
export type LetterDay = EmailDay & {
  weekday: string;
  date: string;
  fast: { kind: FastKind; label: string };
  /** The civil date, YYYY-MM-DD. */
  iso: string;
  /** The calendar's rule for the day's fast, beside its label. */
  fastRule: string;
  feasts: string[];
};

/**
 * What a letter is about, for a look to choose its picture and its marks by:
 * the step of the first week; the book, the work or the saint of "where you
 * left off" (a saint's own icon, unless the heritage list holds it back,
 * lib/marketing/heritagePictures.ts); the fast, its day and its length (the
 * Nativity card's star stands higher each day, lib/reading/nativityStar.ts),
 * and the reader's own reckoning, which the dates and fasts follow (a look
 * that names the calendar names this one). Nothing in here is said to the
 * reader unless a look says it.
 */
export type LetterAbout =
  | { kind: "first_week"; step: FirstWeekStep }
  | { kind: "pick_up"; line: "bible"; book: string; chapter: number }
  | { kind: "pick_up"; line: "work"; saintSlug: string; workSlug: string }
  | { kind: "pick_up"; line: "patron"; saintSlug: string; on: string }
  | { kind: "fasting_companion"; fast: FastId; fastKey: string; piece: FastingPiece; day: number; of: number; style: CalStyle };

export type RetentionLetter = {
  kind: RetentionKind;
  about: LetterAbout;
  subject: string;
  heading: string;
  /** One line under the heading. */
  deck?: string;
  paragraphs: string[];
  /** A list of days: each day's fast, and a feast set heavier. */
  days?: LetterDay[];
  /** Paragraphs after the list. */
  after?: string[];
  /** One button to an email (docs/brand/kit/email/README.md). */
  action: { label: string; href: string };
};

const CATALOG = en as Record<string, string>;

/** A catalog line, word for word. Throws on a key the catalog lacks, so a renamed line fails the tests, not a send. */
export function catalogLine(key: string): string {
  const line = CATALOG[key];
  if (typeof line !== "string" || !line.trim()) throw new Error(`catalog line missing: ${key}`);
  return line;
}

function rule(id: string) {
  const found = RULES.find((r) => r.id === id);
  if (!found) throw new Error(`prayer rule missing: ${id}`);
  return found;
}

/** "The Prayer of St. Ephrem" as it reads inside a sentence. */
const inSentence = (title: string) => title.replace(/^The /, "the ");

/**
 * The fixed sentences: where a thing is in the app, or what the email holds.
 * Nothing in here speaks of the faith. Each is checked by the tests with
 * every letter it can be part of.
 */
export const COPY = {
  firstWeekEyebrow: "Your first week",
  morningSubject: "Your first week: the morning prayers",
  morningWhere: (minutes: number) => `About ${minutes} minutes. They are in Prayers.`,
  morningAction: "Open the morning prayers",
  calendarSubject: "Your first week: the calendar",
  calendarWhere: (styleNew: string, styleOld: string, setting: string) => `${styleNew} or ${styleOld}: it is chosen in Settings, under ${setting}.`,
  calendarAction: "Open Settings",
  verseSubject: "Your first week: bookmark a verse",
  verseHeading: "Bookmark a verse",
  verseHow: (bookmark: string) => `Tap a verse on any chapter, then ${bookmark}.`,
  verseWhere: "It is kept in Saved.",
  verseAction: "Open the Bible",
  placeSubject: (place: string) => `${place}, where you were reading`,
  placeDeck: "Where you were reading",
  placeLine: (place: string) => `You were reading ${place}.`,
  placeAction: (place: string) => `Open ${place}`,
  workLine: (title: string, saint: string) => `You were reading ${title}, by ${saint}.`,
  workAction: "Open it where you were",
  patronSubject: (saint: string, weekday: string) => `${saint} is remembered on ${weekday}`,
  patronDeck: "Your patron saint",
  patronLine: (saint: string, day: string) => `${saint}, whom you chose as your patron saint, is remembered on ${day}.`,
  patronAction: (saint: string) => `Read about ${saint}`,
  fastWeekAhead: "Each day's fast for the week ahead, as the calendar gives it.",
  fastSubjectOpen: (title: string, from: string, to: string) => `${title}, ${from} to ${to}`,
  fastSubjectWeek: (title: string, week: number) => `${title}, week ${week}`,
  fastDates: (from: string, to: string) => `${from} to ${to}`,
  fastPlanAction: "Open the reading plan",
  fastPrayerAction: (title: string) => `Open ${inSentence(title)}`,
  fastCalendarAction: "Open the calendar",
} as const;

/** "Sunday, November 15", in UTC so a test and the server agree. */
export function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

/** "November 15". */
export function monthDay(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

/** "November 22 to 28", or "November 29 to December 5" across a month. */
export function dayRange(from: Date, to: Date): string {
  const sameMonth = from.getUTCMonth() === to.getUTCMonth() && from.getUTCFullYear() === to.getUTCFullYear();
  return COPY.fastDates(monthDay(from), sameMonth ? String(to.getUTCDate()) : monthDay(to));
}

const weekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

/** A Bible place's address, as lib/bible/lastRead.ts placeHref writes it: the chapter, and the verse past the first. */
export function bibleHref(book: string, chapter: number, verse = 1): string {
  return `/bible/${book}/${chapter}${verse > 1 ? `#v${verse}` : ""}`;
}

/** Each civil day's fast as the calendar names it, and the day's feasts by name, in the reader's reckoning. */
export function fastDays(days: readonly Date[], style: CalStyle): LetterDay[] {
  return days.map((d) => {
    const status = fastingStatus(d, style);
    const feasts = commemorationsOn(shiftForStyle(d, style))
      .filter((c) => c.kind === "feast")
      .map((c) => c.name);
    return {
      day: dayLabel(d),
      name: feasts.length > 0 ? `${feasts.join(". ")}. ${status.label}` : status.label,
      kind: feasts.length > 0 ? ("feast" as const) : ("saint" as const),
      weekday: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      date: String(d.getUTCDate()),
      fast: { kind: status.kind, label: status.label },
      iso: d.toISOString().slice(0, 10),
      fastRule: status.rule,
      feasts,
    };
  });
}

/** A first-week step's letter. Exported for the look's strip, which names each step by its own heading (look.ts). */
export function firstWeekLetter(step: FirstWeekStep): RetentionLetter {
  const about: LetterAbout = { kind: "first_week", step };
  if (step === "morning") {
    const morning = rule("morning");
    return {
      kind: "first_week",
      about,
      subject: COPY.morningSubject,
      heading: morning.title,
      paragraphs: [morning.description ?? "", COPY.morningWhere(morning.estimatedMinutes ?? 8)].filter(Boolean),
      action: { label: COPY.morningAction, href: siteUrl(morning.href) },
    };
  }
  if (step === "calendar") {
    return {
      kind: "first_week",
      about,
      subject: COPY.calendarSubject,
      heading: catalogLine("settings.calendar"),
      paragraphs: [
        catalogLine("settings.calendarHint"),
        COPY.calendarWhere(catalogLine("calendar.styleNew"), catalogLine("calendar.styleOld"), catalogLine("settings.calendar")),
      ],
      action: { label: COPY.calendarAction, href: siteUrl("/settings#calendar") },
    };
  }
  return {
    kind: "first_week",
    about,
    subject: COPY.verseSubject,
    heading: COPY.verseHeading,
    paragraphs: [COPY.verseHow(catalogLine("bible.bookmarkVerse")), COPY.verseWhere],
    action: { label: COPY.verseAction, href: siteUrl("/bible") },
  };
}

function pickUpLetter(line: PersonalLine): RetentionLetter {
  if (line.kind === "bible") {
    const place = `${line.bookName} ${line.chapter}`;
    return {
      kind: "pick_up",
      about: { kind: "pick_up", line: "bible", book: line.book, chapter: line.chapter },
      subject: COPY.placeSubject(place),
      heading: place,
      deck: COPY.placeDeck,
      paragraphs: [COPY.placeLine(place)],
      action: { label: COPY.placeAction(place), href: siteUrl(bibleHref(line.book, line.chapter, line.verse)) },
    };
  }
  if (line.kind === "work") {
    return {
      kind: "pick_up",
      about: { kind: "pick_up", line: "work", saintSlug: line.saintSlug, workSlug: line.workSlug },
      subject: COPY.placeSubject(line.workTitle),
      heading: line.workTitle,
      deck: line.saintName,
      paragraphs: [COPY.workLine(line.workTitle, line.saintName)],
      action: {
        label: COPY.workAction,
        href: siteUrl(`${workHref(line.saintSlug, line.workSlug)}#p-${line.sectionN}-${line.paragraph}`),
      },
    };
  }
  const on = new Date(`${line.on}T12:00:00Z`);
  return {
    kind: "pick_up",
    about: { kind: "pick_up", line: "patron", saintSlug: line.saintSlug, on: line.on },
    subject: COPY.patronSubject(line.saintName, weekday(on)),
    heading: line.saintName,
    deck: COPY.patronDeck,
    paragraphs: [COPY.patronLine(line.saintName, dayLabel(on))],
    action: { label: COPY.patronAction(line.saintName), href: siteUrl(`/saints/${line.saintSlug}`) },
  };
}

/** The one button a fast's letters carry: its reading plan where it has one, its prayer, or the calendar. */
function fastAction(fast: FastDay): RetentionLetter["action"] {
  if (fast.id === "nativity") return { label: COPY.fastPlanAction, href: siteUrl("/plans/nativity") };
  if (fast.id === "great_lent") {
    const ephrem = rule("lent-ephrem");
    return { label: COPY.fastPrayerAction(ephrem.title), href: siteUrl(ephrem.href) };
  }
  return { label: COPY.fastCalendarAction, href: siteUrl("/calendar") };
}

/** What a fast's opening note says after its days: its plan or its prayer, in the app's own words. */
function fastAfter(fast: FastDay): string[] {
  if (fast.id === "nativity") return [catalogLine("plans.nativity.body")];
  if (fast.id === "great_lent") return [rule("lent-ephrem").description ?? ""].filter(Boolean);
  return [];
}

function fastingLetter(p: Extract<PlannedRetention, { kind: "fasting_companion" }>, now: Date): RetentionLetter {
  const { fast, style } = p;
  const title = FAST_TITLE[fast.id];
  const disclaimer = catalogLine("calendar.fastingDisclaimer");
  const about: LetterAbout = {
    kind: "fasting_companion",
    fast: fast.id,
    fastKey: fast.key,
    piece: p.piece,
    day: fast.dayIndex + 1,
    of: fast.length,
    style,
  };
  if (p.piece === "open") {
    const from = monthDay(dayOf(fast.first));
    const to = monthDay(dayOf(fast.last));
    return {
      kind: "fasting_companion",
      about,
      subject: COPY.fastSubjectOpen(title, from, to),
      heading: title,
      deck: dayRange(dayOf(fast.first), dayOf(fast.last)),
      paragraphs: [COPY.fastWeekAhead],
      days: fastDays(daysAhead(fast, now), style),
      after: [...fastAfter(fast), disclaimer],
      action: fastAction(fast),
    };
  }
  const days = weekDays(fast, p.piece);
  const label = COPY.fastSubjectWeek(title, p.piece + 1);
  return {
    kind: "fasting_companion",
    about,
    subject: label,
    heading: label,
    deck: dayRange(days[0], days[days.length - 1]),
    paragraphs: [COPY.fastWeekAhead],
    days: fastDays(days, style),
    after: [disclaimer],
    action: fastAction(fast),
  };
}

/** The letter for one planned email. Pure. */
export function letterFor(p: PlannedRetention, now: Date): RetentionLetter {
  if (p.kind === "first_week") return firstWeekLetter(p.step);
  if (p.kind === "pick_up") return pickUpLetter(p.line);
  return fastingLetter(p, now);
}

/** Every line a reader reads in a letter, in order: for the copy rules and the tests. */
export function letterLines(letter: RetentionLetter): string[] {
  return [
    letter.subject,
    letter.heading,
    ...(letter.deck ? [letter.deck] : []),
    ...letter.paragraphs,
    ...(letter.days ?? []).map((d) => `${d.day}: ${d.name}`),
    ...(letter.after ?? []),
    letter.action.label,
  ];
}
