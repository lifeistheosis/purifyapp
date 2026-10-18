import type { FastRuleId } from "@/lib/calendar/orthodox";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { getRuleMeta } from "@/lib/prayers/rules";
import { EVENING_FROM_HOUR } from "@/lib/prayers/ruleForHour";

/**
 * Every word a home screen widget shows, in the reader's language: the
 * `labels` the app hands the widgets (docs/WIDGETS.md, section 2).
 *
 * A widget is drawn by the phone, which cannot look a word up in the app's
 * catalogs, so each word arrives finished: in the app's language, with its
 * number already in it, a plain string the widget sets as it is. The one
 * exception is `nameDayIn`, whose {n} the widget fills, because the days to a
 * name day go down while the app is closed.
 *
 * Most of the words are the app's own, from the keys its screens use, so a
 * widget says what the app says: "Verse of the Day" is today.verseOfDay, the
 * minutes beside a rule are the Today card's, the streak's line under its
 * number is the streak sheet's. Only what no screen says has a key of its own,
 * under `widget.` in lib/i18n/messages.
 *
 * Two of them agree with a number, and so follow it: `dayStreak` ("day in a
 * row", "days in a row") with the count the streak entry carries, which the
 * widget draws as it was handed, and `nameDayIn` with the days to the
 * patron's name day on the day the labels are handed over. That form holds
 * until the widget's own count crosses into another form (in English only on
 * the eve, in Russian every few days), and the next open puts it right.
 * `days`, under every countdown, cannot know its number at all, so it is the
 * form most numbers take.
 *
 * The dates and the hour come from the device's own calendar in the app's
 * language (lib/i18n/deviceDates.ts says why through dateLocale), so a phone
 * whose engine cannot write Georgian gets English names, as the app's own
 * screens do.
 */

type Vars = Record<string, string | number>;

/** The app's translator: `t` from useTranslate (components/i18n/MessagesProvider.tsx). */
export type Translate = (key: string, vars?: Vars) => string;
/** Its plural form, `tn`. */
export type TranslateCount = (key: string, count: number, vars?: Vars) => string;

export type WidgetLabels = Record<string, string>;

export type LabelsInput = {
  t: Translate;
  tn: TranslateCount;
  /** The app's language, for the names of the days and months. */
  locale: string;
  /** The count the streak entry carries, which `dayStreak` agrees with. */
  streak?: number | null;
  /** Days from today to the patron's name day, which `nameDayIn` agrees with. */
  nameDayIn?: number | null;
};

/**
 * Every rule the fast's chip can name, from the day table's `fastRule`. A
 * record and not a list so that a rule added to lib/calendar/orthodox.ts and
 * not here is a type error, rather than a chip that stays in English.
 */
const FAST_RULES: Record<FastRuleId, true> = {
  twelveDays: true,
  brightWeek: true,
  trinityWeek: true,
  publicanWeek: true,
  lentPalmSunday: true,
  lentAnnunciation: true,
  lentWineOil: true,
  lentStrict: true,
  dormitionTransfiguration: true,
  dormitionWineOil: true,
  dormitionStrict: true,
  nativityWeekend: true,
  nativityWedFri: true,
  nativityFinal: true,
  nativityWeekday: true,
  apostlesWeekend: true,
  apostlesWedFri: true,
  apostlesWeekday: true,
  wednesdayFast: true,
  fridayFast: true,
  noFast: true,
};

export const FAST_RULE_IDS = Object.keys(FAST_RULES) as FastRuleId[];

// The first seven days of 2023 run Sunday to Saturday, and a widget counts
// its days and months from Sunday and January, as Java and Swift do.
const WEEK = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2023, 0, 1 + i, 12)));
const YEAR = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2023, i, 15, 12)));

/** The device's names for those days, joined with "|", or nothing if it cannot write them. */
function names(locale: string, options: Intl.DateTimeFormatOptions, days: Date[]): string | undefined {
  try {
    const format = new Intl.DateTimeFormat(dateLocale(locale), { ...options, timeZone: "UTC" });
    return days.map((day) => format.format(day)).join("|");
  } catch {
    return undefined;
  }
}

/**
 * The months' short names. Asked for a short month alone, the engine writes
 * Bulgarian as a number, "10" for October, which is no name at all, so a
 * month whose short name has no letter in it is given its long name.
 */
function shortMonths(locale: string): string | undefined {
  const short = names(locale, { month: "short" }, YEAR)?.split("|");
  const long = names(locale, { month: "long" }, YEAR)?.split("|");
  if (!short || !long) return undefined;
  return short.map((name, i) => (/\p{L}/u.test(name) ? name : long[i])).join("|");
}

/** "January 6", as the device writes a date in this language. */
function feastDate(locale: string, month: number, day: number): string | undefined {
  try {
    return new Intl.DateTimeFormat(dateLocale(locale), { month: "long", day: "numeric", timeZone: "UTC" }).format(
      new Date(Date.UTC(2023, month, day, 12)),
    );
  } catch {
    return undefined;
  }
}

/**
 * The hour the Evening Rule begins (lib/prayers/ruleForHour.ts), as this
 * language tells the time: "5 PM" where the clock has twelve hours, "17:00"
 * where it has twenty-four, since "17" alone reads as a number and not an
 * hour.
 */
function eveningHour(locale: string): string | undefined {
  try {
    const lang = dateLocale(locale);
    const at = new Date(Date.UTC(2023, 0, 1, EVENING_FROM_HOUR));
    const resolved = new Intl.DateTimeFormat(lang, { hour: "numeric", timeZone: "UTC" }).resolvedOptions();
    const twelve = resolved.hourCycle ? resolved.hourCycle === "h11" || resolved.hourCycle === "h12" : resolved.hour12 === true;
    const options: Intl.DateTimeFormatOptions = twelve ? { hour: "numeric" } : { hour: "numeric", minute: "2-digit" };
    return new Intl.DateTimeFormat(lang, { ...options, timeZone: "UTC" }).format(at);
  } catch {
    return undefined;
  }
}

/**
 * A count whose plural form is the one most numbers take in this language: 2
 * in English, 5 in Russian, 11 in Arabic. For a word whose number is not
 * known when it is written.
 */
export function usualCount(locale: string): number {
  try {
    const rules = new Intl.PluralRules(locale);
    const counts = new Map<string, number[]>();
    for (let n = 2; n < 100; n++) {
      const category = rules.select(n);
      counts.set(category, [...(counts.get(category) ?? []), n]);
    }
    let usual = [2];
    for (const those of counts.values()) if (those.length > usual.length) usual = those;
    return usual[0];
  } catch {
    return 2;
  }
}

/** A whole number of at least 0, or null. */
function count(n: number | null | undefined): number | null {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

/** The labels for the widgets, in the language `t` speaks. */
export function widgetLabels(input: LabelsInput): WidgetLabels {
  // A key the catalog does not have comes back as the key itself
  // (MessagesProvider). Such a word is left out, so the widget shows its own
  // English and not "widget.coming".
  const t = (key: string, vars?: Vars): string | undefined => {
    const word = input.t(key, vars);
    return word && word !== key ? word : undefined;
  };
  const tn = (key: string, n: number): string | undefined => {
    const word = input.tn(key, n);
    return word && word !== key ? word : undefined;
  };
  const { locale } = input;
  const streak = count(input.streak);
  const nameDayIn = count(input.nameDayIn);
  const minutes = (id: "morning" | "evening") => {
    const m = getRuleMeta(id)?.estimatedMinutes;
    return typeof m === "number" && m > 0 ? t("today.minRead", { count: m }) : undefined;
  };
  const hour = eveningHour(locale);

  const words: Record<string, string | undefined> = {
    // The faces.
    verseOfTheDay: t("today.verseOfDay"),
    todayInTheChurch: t("community.feastToday"),
    thisWeek: t("widget.thisWeek"),
    today: t("calendar.today"),
    noFast: t("calendar.fast.none"),
    morning: t("prayers.tabs.morning"),
    evening: t("prayers.tabs.evening"),
    morningPrayers: t("prayers.rule.morning.title"),
    eveningPrayers: t("prayers.rule.evening.title"),
    morningMinutes: minutes("morning"),
    eveningMinutes: minutes("evening"),
    prayedToday: t("shop.prayedToday"),
    afterMorning: hour ? t("widget.afterMorning", { time: hour }) : undefined,
    afterEvening: t("widget.afterEvening"),
    dayStreak: tn("streak.daysInARow", streak ?? usualCount(locale)),
    // The streak sheet's own line: a streak to keep, or one to begin.
    keepIt: streak === 0 ? t("streak.start") : t("streak.notYet"),
    keptToday: t("streak.keptShort"),
    coming: t("widget.coming"),
    days: t("widget.days"),
    // After the number one: "1 day" on the eve of a fast, not "1 days". A
    // widget uses it only for 1; every other number takes `days`.
    day: t("widget.day"),
    today0: t("calendar.today"),
    nextUpdate: t("widget.nextUpdate"),
    soon: t("bible.translationBadgeSoon"),
    mySaint: t("desktop.presence.patronHover"),
    nameDayToday: t("profile.nameDayToday"),
    nameDayIn: tn("widget.nameDayIn", nameDayIn ?? usualCount(locale)),
    chooseSaint: t("widget.chooseSaint"),
    openToRefresh: t("widget.openToRefresh"),
    openForStreak: t("widget.openForStreak"),

    // The app's language, the one entry that is not a word to show: a widget
    // reads it to pick the day's verse in that language from the day table,
    // where it has one (verse.machine, docs/WIDGETS.md). Every other reader's
    // widget finds none and shows the English, as before.
    language: locale,

    // The dates.
    weekdaysShort: names(locale, { weekday: "short" }, WEEK),
    monthsLong: names(locale, { month: "long" }, YEAR),
    monthsShort: shortMonths(locale),

    // The configure screen.
    "variant.verse.minimal": t("widget.variant.verse.minimal"),
    "variant.verse.mosaic": t("widget.variant.verse.mosaic"),
    "variant.today.day": t("widget.variant.today.day"),
    "variant.today.week": t("widget.variant.today.week"),
    "variant.today.rotating": t("widget.variant.today.rotating"),
    "variant.streak.number": t("widget.variant.streak.number"),
    "variant.streak.ring": t("widget.variant.streak.ring"),
    "variant.countdown.fast": t("widget.variant.countdown.fast"),
    "variant.countdown.feast": t("widget.variant.countdown.feast"),
    "variant.countdown.update": t("widget.variant.countdown.update"),
    "variant.mosaic.season": t("widget.variant.mosaic.season"),
    "variant.mosaic.cross": t("widget.variant.mosaic.cross"),
    "variant.mosaic.lampada": t("widget.variant.mosaic.lampada"),
    chooseLook: t("widget.chooseLook"),
    done: t("common.done"),

    // The season words, for the themes whose words are the same every day
    // of the season. Great Lent is not among them: its line counts the days
    // ("Day 12 of 40"), and the same theme carries Palm Sunday and Holy Week
    // under titles of their own, so one word for the theme would be wrong on
    // some of its days. It keeps the table's English.
    "season.pascha.title": t("widget.season.pascha.title"),
    "season.pascha.line": t("widget.season.pascha.line"),
    "season.nativity.title": t("widget.season.nativity.title"),
    "season.nativity.line": t("widget.season.nativity.line"),
    "season.theophany.title": t("profile.theme.theophany"),
    "season.theophany.line": feastDate(locale, 0, 6),
    "season.dormition.title": t("widget.season.dormition.title"),
    "season.dormition.line": feastDate(locale, 7, 15),
  };

  // The fast's chip, by the rule the day table names: labels["fast." + rule].
  for (const rule of FAST_RULE_IDS) words[`fast.${rule}`] = t(`calendar.fast.${rule}.label`);

  const labels: WidgetLabels = {};
  for (const [name, word] of Object.entries(words)) if (word) labels[name] = word;
  return labels;
}
