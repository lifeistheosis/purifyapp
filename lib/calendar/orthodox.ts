// Orthodox liturgical calendar helpers, pure functions, no I/O.
// Used by app/(app)/calendar/page.tsx.
//
// Follows the New (Revised Julian) calendar for FIXED feasts:
// most canonical Eastern Orthodox jurisdictions use this for everything
// except Pascha and the Paschal cycle, which both calendars compute
// from the Julian-based algorithm.
//
// Pascha = the Orthodox date (Meeus's algorithm), converted to Gregorian.

// The profiled saints in brief, and never lib/saints/saints.ts. That file is
// every saint's whole life, 484 KB of it, and this module is read by every
// screen: the streak host in the root layout reaches it through the day key.
// See lib/saints/brief.ts.
import profiledSaints from "@/data/calendar/profiled-saints.json";
import type { SaintBrief } from "@/lib/saints/brief";
import dailyCommemorations from "@/data/calendar/daily-saints.json";
import dailyReadings from "@/data/calendar/daily-readings.json";
import movableReadings from "@/data/calendar/movable-readings.json";
// Through the "@/" alias, never "./pascha": the native build's scripts import
// this file in plain Node (scripts/lib/alias-hooks.mjs), which resolves the
// alias with its extension guessed but a bare relative path not at all.
import { orthodoxPascha } from "@/lib/calendar/pascha";
import { bookSlug, officialDay, type OfficialDay, type OfficialReading, type ProperReadings } from "@/lib/calendar/officialReadings";
import { getBook } from "@/lib/bible/books";
import { writesDatesIn } from "@/lib/i18n/deviceDates";

// ----- Pascha -----

// The computation lives in ./pascha.ts, import-free, so a client page can
// have it without this module's data files. Re-exported here unchanged.
export { orthodoxPascha };

// ----- Calendar style ----------------------------------------------------
// Fixed-cycle commemorations + the fast table are keyed by Gregorian
// MM-DD. Users observing the Old (Julian) calendar see the same data
// shifted back 13 days. Pascha-relative content is the same for both
// styles because both compute Pascha from the Julian algorithm.

export type CalStyle = "new" | "old";
export const JULIAN_OFFSET_DAYS = 13;

export function shiftForStyle(d: Date, style: CalStyle): Date {
 if (style === "new") return d;
 const out = new Date(d);
 out.setUTCDate(out.getUTCDate() - JULIAN_OFFSET_DAYS);
 return out;
}

// ----- Day helpers (calendar math in UTC noon to dodge DST) -----

export function startOfDayUtc(d: Date): Date {
 return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
}

/**
 * The reader's OWN calendar day, mapped into the UTC-noon frame the lookups
 * above expect. This is what every "today" surface must use.
 *
 * `startOfDayUtc` reads the UTC day, which runs ahead of local time for the
 * whole Western hemisphere: a reader in Florida asking "who is commemorated
 * today" at 9pm on the 30th was being shown the 31st. Use this instead
 * wherever the question is "what day is it for the person holding the
 * phone", and keep `startOfDayUtc` only for normalising a date that is
 * already a calendar day rather than an instant.
 *
 * Client-only by nature: on the server "local" is the server's timezone,
 * which is meaningless to the reader. Every caller is a client component.
 */
export function startOfDayLocal(d: Date): Date {
 return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
}

function addDays(d: Date, days: number): Date {
 const out = new Date(d);
 out.setUTCDate(out.getUTCDate() + days);
 return out;
}

function diffDays(a: Date, b: Date): number {
 return Math.round(
 (startOfDayUtc(a).getTime() - startOfDayUtc(b).getTime()) /
 (24 * 3600 * 1000),
 );
}

function sameDay(a: Date, b: Date): boolean {
 return diffDays(a, b) === 0;
}

function inRangeInclusive(d: Date, start: Date, end: Date): boolean {
 return diffDays(d, start) >= 0 && diffDays(d, end) <= 0;
}

// ----- Fasting -----

export type FastKind =
 | "strict" // Great Lent, Dormition, Holy Week, no fish/oil/wine
 | "wine-oil" // Lenten Sundays, etc, wine and oil allowed
 | "fish" // fast period but fish allowed
 | "fast" // generic fast (no meat/dairy)
 | "fast-free" // intentionally no fast
 | "normal"; // no special rule

export type FastRuleId =
 | "twelveDays"
 | "brightWeek"
 | "trinityWeek"
 | "publicanWeek"
 | "lentPalmSunday"
 | "lentAnnunciation"
 | "lentWineOil"
 | "lentStrict"
 | "dormitionTransfiguration"
 | "dormitionWineOil"
 | "dormitionStrict"
 | "nativityWeekend"
 | "nativityWedFri"
 | "nativityFinal"
 | "nativityWeekday"
 | "apostlesWeekend"
 | "apostlesWedFri"
 | "apostlesWeekday"
 | "wednesdayFast"
 | "fridayFast"
 | "noFast";

export type FastingStatus = {
 kind: FastKind;
 /** Stable id for catalog lookup: calendar.fast.{ruleId}.label|rule.
  * The label/rule fields below stay the canonical English. */
 ruleId: FastRuleId;
 /** Short human label for the badge. */
 label: string;
 /** Longer one-line explanation. */
 rule: string;
};

/**
 * Returns the fasting status for a calendar date according to common
 * Eastern Orthodox practice (Constantinople/Greek tradition). This is a
 * simplified reading suitable for daily orientation, your priest's
 * direction takes precedence for any individual question.
 */
/**
 * Every date fastingStatus needs that depends only on the year: one Pascha
 * computation and the eighteen anchors hung off it.
 *
 * All of this used to run on every call, and fastingStatus is called once per
 * grid cell, so drawing a month recomputed Pascha 42 times and allocated
 * roughly 700 Date objects to answer 42 questions about a single year.
 *
 * Cached per year, which is the only input any of it varies on. Safe to share
 * because nothing here is ever mutated: `addDays` copies before it calls
 * setUTCDate, `inRangeInclusive` and `diffDays` only read, and `startOfDayUtc`
 * builds a new Date. Keep it that way. If a caller ever needs to shift one of
 * these, it must copy first.
 */
type PaschalAnchors = {
 pascha: Date;
 cleanMonday: Date;
 holySaturday: Date;
 palmSunday: Date;
 annunciation: Date;
 transfiguration: Date;
 brightWeekEnd: Date;
 pentecost: Date;
 allSaintsSunday: Date;
 apostlesFastStart: Date;
 apostlesFastEnd: Date;
 dormitionStart: Date;
 dormitionEnd: Date;
 nativityStart: Date;
 nativityEnd: Date;
 christmasFreeStart: Date;
 publicanFeast: Date;
 publicanFreeEnd: Date;
 /** Jan 4 of the FOLLOWING year, the close of the twelve days. */
 twelfthNightNext: Date;
};

const PASCHAL_ANCHORS = new Map<number, PaschalAnchors>();

function paschalAnchors(year: number): PaschalAnchors {
 const hit = PASCHAL_ANCHORS.get(year);
 if (hit) return hit;

 const pascha = orthodoxPascha(year);
 const allSaintsSunday = addDays(pascha, 56);
 const publicanFeast = addDays(pascha, -70); // approx Sunday of Publican & Pharisee
 const anchors: PaschalAnchors = {
 pascha,
 cleanMonday: addDays(pascha, -48),
 holySaturday: addDays(pascha, -1),
 palmSunday: addDays(pascha, -7),
 annunciation: new Date(Date.UTC(year, 2, 25, 12)), // Mar 25
 transfiguration: new Date(Date.UTC(year, 7, 6, 12)), // Aug 6
 brightWeekEnd: addDays(pascha, 7), // Thomas Sunday eve
 pentecost: addDays(pascha, 49),
 allSaintsSunday,
 apostlesFastStart: addDays(allSaintsSunday, 1),
 apostlesFastEnd: new Date(Date.UTC(year, 5, 28, 12)), // June 28
 dormitionStart: new Date(Date.UTC(year, 7, 1, 12)),
 dormitionEnd: new Date(Date.UTC(year, 7, 14, 12)),
 nativityStart: new Date(Date.UTC(year, 10, 15, 12)),
 nativityEnd: new Date(Date.UTC(year, 11, 24, 12)),
 christmasFreeStart: new Date(Date.UTC(year, 11, 25, 12)),
 publicanFeast,
 publicanFreeEnd: addDays(publicanFeast, 7),
 twelfthNightNext: new Date(Date.UTC(year + 1, 0, 4, 12)),
 };
 PASCHAL_ANCHORS.set(year, anchors);
 return anchors;
}

/**
 * The fast for a CIVIL day, in the reader's reckoning.
 *
 * The rule reads three things, and they do not all move with the calendar.
 * The weekday is the civil one: a Wednesday is a Wednesday in both
 * calendars. Everything counted from Pascha (Lent, Holy Week, Bright Week,
 * Trinity Week, the start of the Apostles' Fast) is civil too, because both
 * reckonings keep the same Pascha on the same day. Only the menaion's dates
 * (the Nativity and Dormition fasts, the Twelve Days, the Annunciation, the
 * Transfiguration, the end of the Apostles' Fast) fall 13 days later for an
 * Old Calendar reader.
 *
 * Until 2026-10-29 every caller handed this function the date already moved
 * back 13 days and it read all three from it, so an Old Calendar reader was
 * shown the Wednesday and Friday fast on Tuesday and Thursday (13 days back
 * is one weekday on), and Lent and Bright Week 13 days late: in 2026 Clean
 * Monday read as no fast and Bright Monday as strict Lent. A reader found it
 * ("The fast days on my Android always show on Tuesday and Thursday"). So the
 * function takes the civil day and the style, and moves only what moves.
 */
export function fastingStatus(date: Date, style: CalStyle): FastingStatus {
 // The civil day: its weekday, and the Paschal cycle.
 const d = startOfDayUtc(date);
 const dow = d.getUTCDay(); // 0 = Sunday
 // The same day in the reader's fixed calendar, for the menaion's dates.
 const f = shiftForStyle(d, style);
 const month = f.getUTCMonth(); // 0-11
 const day = f.getUTCDate();

 const {
 pascha,
 cleanMonday,
 holySaturday,
 palmSunday,
 brightWeekEnd,
 pentecost,
 apostlesFastStart,
 publicanFeast,
 publicanFreeEnd,
 } = paschalAnchors(d.getUTCFullYear());
 // The fixed anchors of the fixed calendar's year, which for an Old
 // Calendar reader is the year before from January 1 to 13.
 const {
 annunciation,
 transfiguration,
 apostlesFastEnd,
 dormitionStart,
 dormitionEnd,
 nativityStart,
 nativityEnd,
 christmasFreeStart,
 twelfthNightNext,
 } = paschalAnchors(f.getUTCFullYear());

 // ----- Fast-free windows -----
 if (
 (month === 0 && day <= 4) ||
 (month === 11 && day >= 25) ||
 inRangeInclusive(f, christmasFreeStart, twelfthNightNext)
 ) {
 return {
 kind: "fast-free",
 ruleId: "twelveDays",
 label: "Fast-free",
 rule: "Twelve Days of Christmas. No fast through Theophany Eve (Jan 4).",
 };
 }
 if (inRangeInclusive(d, pascha, brightWeekEnd)) {
 return {
 kind: "fast-free",
 ruleId: "brightWeek",
 label: "Bright Week, fast-free",
 rule: "The week of the Resurrection. No fast, even on Wednesday and Friday.",
 };
 }
 if (inRangeInclusive(d, addDays(pentecost, 1), addDays(pentecost, 7))) {
 return {
 kind: "fast-free",
 ruleId: "trinityWeek",
 label: "Trinity Week, fast-free",
 rule: "Week after Pentecost. No fast on Wednesday or Friday.",
 };
 }
 if (inRangeInclusive(d, addDays(publicanFeast, 1), publicanFreeEnd)) {
 return {
 kind: "fast-free",
 ruleId: "publicanWeek",
 label: "Fast-free week",
 rule: "Week after the Sunday of the Publican and the Pharisee.",
 };
 }

 // ----- Great Lent + Holy Week -----
 if (inRangeInclusive(d, cleanMonday, holySaturday)) {
 if (sameDay(f, annunciation) || sameDay(d, palmSunday)) {
 return {
 kind: "fish",
 ruleId: sameDay(d, palmSunday) ? "lentPalmSunday" : "lentAnnunciation",
 label: "Lent, fish allowed",
 rule: sameDay(d, palmSunday)
 ? "Palm Sunday. Fish, wine, and oil allowed."
 : "Feast of the Annunciation. Fish, wine, and oil allowed.",
 };
 }
 if (dow === 0 || dow === 6) {
 return {
 kind: "wine-oil",
 ruleId: "lentWineOil",
 label: "Lent, wine and oil",
 rule: "Saturday or Sunday of Great Lent. Wine and oil allowed.",
 };
 }
 return {
 kind: "strict",
 ruleId: "lentStrict",
 label: "Great Lent, strict",
 rule: "Strict fast. No meat, dairy, fish, wine, or oil.",
 };
 }

 // ----- Dormition Fast -----
 if (inRangeInclusive(f, dormitionStart, dormitionEnd)) {
 if (sameDay(f, transfiguration)) {
 return {
 kind: "fish",
 ruleId: "dormitionTransfiguration",
 label: "Transfiguration, fish allowed",
 rule: "Feast of the Transfiguration. Fish, wine, and oil allowed.",
 };
 }
 if (dow === 0 || dow === 6) {
 return {
 kind: "wine-oil",
 ruleId: "dormitionWineOil",
 label: "Dormition Fast, wine and oil",
 rule: "Saturday or Sunday of the Dormition Fast. Wine and oil allowed.",
 };
 }
 return {
 kind: "strict",
 ruleId: "dormitionStrict",
 label: "Dormition Fast, strict",
 rule: "Strict fast. No meat, dairy, fish, wine, or oil.",
 };
 }

 // ----- Nativity Fast -----
 if (inRangeInclusive(f, nativityStart, nativityEnd)) {
 const stricter = day >= 20 && month === 11;
 if (dow === 0 || dow === 6) {
 return {
 kind: "fish",
 ruleId: "nativityWeekend",
 label: "Nativity Fast, fish allowed",
 rule: "Saturday or Sunday of the Nativity Fast. Fish, wine, and oil allowed.",
 };
 }
 if (dow === 3 || dow === 5) {
 return {
 kind: "strict",
 ruleId: "nativityWedFri",
 label: "Nativity Fast, strict",
 rule: "Wednesday/Friday of the Nativity Fast. No meat, dairy, fish, wine, or oil.",
 };
 }
 return {
 kind: stricter ? "wine-oil" : "fish",
 ruleId: stricter ? "nativityFinal" : "nativityWeekday",
 label: stricter ? "Nativity Fast, wine and oil" : "Nativity Fast, fish allowed",
 rule: stricter
 ? "The final stretch before Nativity (Dec 20 to 24). Wine and oil only on weekdays."
 : "Nativity Fast. Fish allowed on weekdays, except Wednesday and Friday.",
 };
 }

 // ----- Apostles' Fast -----
 // From a Paschal day (the Monday after All Saints, civil) to a fixed one
 // (June 28 in the reader's calendar).
 if (diffDays(d, apostlesFastStart) >= 0 && diffDays(f, apostlesFastEnd) <= 0) {
 if (dow === 0 || dow === 6) {
 return {
 kind: "fish",
 ruleId: "apostlesWeekend",
 label: "Apostles' Fast, fish allowed",
 rule: "Saturday or Sunday of the Apostles' Fast. Fish, wine, and oil allowed.",
 };
 }
 if (dow === 3 || dow === 5) {
 return {
 kind: "wine-oil",
 ruleId: "apostlesWedFri",
 label: "Apostles' Fast, wine and oil",
 rule: "Wednesday/Friday of the Apostles' Fast. Wine and oil allowed.",
 };
 }
 return {
 kind: "fish",
 ruleId: "apostlesWeekday",
 label: "Apostles' Fast, fish allowed",
 rule: "Apostles' Fast. Fish allowed on weekdays.",
 };
 }

 // ----- Year-round weekly Wed/Fri fast -----
 if (dow === 3 || dow === 5) {
 return {
 kind: "wine-oil",
 ruleId: dow === 3 ? "wednesdayFast" : "fridayFast",
 label: dow === 3 ? "Wednesday fast" : "Friday fast",
 rule: "Wednesday/Friday year-round fast. Wine and oil allowed.",
 };
 }

 return {
 kind: "normal",
 ruleId: "noFast",
 label: "No fast",
 rule: "No fast scheduled for this day.",
 };
}

// ----- Feast / saint of the day -----

const MONTHS = [
 "January", "February", "March", "April", "May", "June",
 "July", "August", "September", "October", "November", "December",
] as const;

/** Parses one of our feastDays strings like "January 27" → { month: 0, day: 27 }. */
function parseFeastString(s: string): { month: number; day: number } | null {
 const m = s.trim().match(/^([A-Za-z]+)\s+(\d{1,2})$/);
 if (!m) return null;
 const monthIdx = MONTHS.findIndex(
 (mo) => mo.toLowerCase() === m[1].toLowerCase(),
 );
 if (monthIdx < 0) return null;
 const day = parseInt(m[2], 10);
 if (!Number.isInteger(day) || day < 1 || day > 31) return null;
 return { month: monthIdx, day };
}

const PROFILED = profiledSaints as SaintBrief[];
const PROFILED_BY_SLUG = new Map(PROFILED.map((s) => [s.slug, s]));

// Build once: { "0-27": [john-chrysostom], ... } where key is "month-day".
const FEAST_INDEX: Map<string, SaintBrief[]> = (() => {
 const idx = new Map<string, SaintBrief[]>();
 for (const s of PROFILED) {
 for (const fd of s.feastDays ?? []) {
 const parsed = parseFeastString(fd);
 if (!parsed) continue;
 const key = `${parsed.month}-${parsed.day}`;
 if (!idx.has(key)) idx.set(key, []);
 idx.get(key)!.push(s);
 }
 }
 return idx;
})();

/** All saints in our index commemorated on this calendar date, in brief. */
export function feastsOn(date: Date): SaintBrief[] {
 const d = startOfDayUtc(date);
 const key = `${d.getUTCMonth()}-${d.getUTCDate()}`;
 return FEAST_INDEX.get(key) ?? [];
}

// ----- Daily commemorations (the full corpus, ~366 days) -----

export type Commemoration = {
 /** Display name, e.g. "St. Nicholas the Wonderworker of Myra". */
 name: string;
 /** Brief one-line description. */
 note?: string;
 /** "feast" for major Lord/Theotokos feasts and events. Default "saint". */
 kind?: "feast" | "saint";
 /** Slug of a Saint record in our registry. When present, the saint has
 * a profile at /saints/<slug>. */
 slug?: string;
 /** That saint in brief, when `slug` names a profile: enough for the icon,
 * the name and the link. A page that shows the life reads the registry
 * itself (lib/saints/saints.ts); nothing that only names the day should. */
 saint?: SaintBrief;
};

// Type the JSON import. The keys are "MM-DD" strings.
const DAILY: Record<string, Commemoration[]> = dailyCommemorations as Record<
 string,
 Commemoration[]
>;

function mmdd(date: Date): string {
 const d = startOfDayUtc(date);
 return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * The daily-saints corpus marks repose years with an ASCII plus ("+400",
 * "+304, in Rome"). On screen that reads as arithmetic, not as the
 * traditional cross before the year, so renderers receive the dagger
 * form ("†400") instead. The data files keep the plus convention.
 *
 * A plus before a word ("+ca. 290", 83 notes, and "+early") became a
 * dagger only before a digit, so those still showed the plus (Pelagia of
 * Tarsus on May 4, 1.7.1). Before a word the dagger is followed by a
 * space: "† ca. 290".
 */
export function formatReposeNote(note: string | undefined): string | undefined {
 if (!note) return note;
 return note
  .replace(/(^|\s|\()\+(\d)/g, "$1†$2")
  .replace(/(^|\s|\()\+\s?(?=\p{L})/gu, "$1† ");
}

/**
 * Every commemoration we list for the given calendar date: major feasts,
 * named saints, plus any registry saints whose feast day matches. Items
 * with a `slug` that names a profile carry that saint in brief, so the UI
 * can show the icon and link the profile.
 */
export function commemorationsOn(date: Date): Commemoration[] {
 const entries = (DAILY[mmdd(date)] ?? []).map((c) => {
 const saint = c.slug ? PROFILED_BY_SLUG.get(c.slug) : undefined;
 return { ...c, note: formatReposeNote(c.note), saint };
 });

 // Fold in any registry saints whose feast day matches but are not already
 // in the daily JSON (rare safety net, the JSON should cover the major ones).
 const inJson = new Set(entries.map((e) => e.slug).filter(Boolean));
 for (const s of feastsOn(date)) {
 if (!inJson.has(s.slug)) {
 entries.push({
 name: s.name,
 note: s.epithet,
 slug: s.slug,
 saint: s,
 kind: "saint",
 });
 }
 }
 return entries;
}

// ----- Daily readings (lectionary references) -----

export type ReadingKind = "epistle" | "gospel" | "ot";

export type ReadingRef = {
 kind: ReadingKind;
 /** Bible book slug, matches /bible/<book>/<chapter>. */
 book: string;
 chapter: number;
 /** First verse of the passage (inclusive). */
 from: number;
 /** Last verse of the passage (inclusive). */
 to: number;
 /** Human-readable reference, e.g. "Matthew 11:27-30". */
 label: string;
};

const READINGS: Record<string, ReadingRef[]> = dailyReadings as Record<
 string,
 ReadingRef[]
>;

type MovableEntry = { label: string; readings: ReadingRef[] };
const MOVABLE: Record<string, MovableEntry> = (
 movableReadings as { offsets: Record<string, MovableEntry> }
).offsets;

/**
 * Number of days from Pascha (negative = before, 0 = Pascha, positive = after).
 */
function daysFromPascha(date: Date): number {
 const pascha = orthodoxPascha(date.getUTCFullYear());
 // Both at UTC noon to dodge DST; diffDays is integer-rounded.
 return diffDays(date, pascha);
}

/** What a caller knows about the reader that the date alone does not say. */
export type ReadingsOptions = {
 /**
  * False keeps the official calendar's list out of the answer.
  *
  * The list is a New Calendar one (lib/calendar/officialReadings.ts). An
  * Old Calendar parish reads the same Epistle course on the same civil day,
  * but its Gospels run a week or two behind from late September into the
  * new year, because the turn to Luke hangs on the Elevation of the Cross
  * and that feast falls thirteen days later for them. Handing an Old
  * Calendar reader this list would name the wrong Gospel for months, so
  * every surface passes `readingsOptionsFor(style)` and they keep what the
  * app showed before, until a list for their calendar is in hand.
  */
 official?: boolean;
 /**
  * The reader's calendar, for the date's own table only. That table is a
  * menaion (the proper of the day's saints and feasts), so it moves 13 days
  * for an Old Calendar reader, as the commemorations do: on civil January 7
  * they keep the Nativity and read its Epistle and Gospel. The Paschal table
  * and the official list stay on the civil day. Until 2026-10-29 Today asked
  * the menaion on the civil day and the calendar asked everything on the
  * shifted one, so each was half wrong for an Old Calendar reader, and in
  * different halves.
  */
 style?: CalStyle;
};

/** The options for a reader's calendar. One place, so no surface decides alone. */
export function readingsOptionsFor(style: CalStyle): ReadingsOptions {
 return { official: style !== "old", style };
}

export type ReadingsSource = "paschal" | "official" | "fixed";

export type DayReadings = {
 /**
  * Which table answered, so a surface can say what the reading IS.
  *
  *   "paschal"   the app's own Paschal table: the great Sundays, Holy Week,
  *               Pascha, Ascension.
  *   "official"  an official Church calendar's list for that civil date:
  *               the day's own Epistle and Gospel, or on a weekday of Great
  *               Lent its Old Testament lessons.
  *   "fixed"     the date's own table, which is a menaion: the proper of the
  *               day's saints and feasts. Where this answers, the reading is
  *               NOT the course reading a printed calendar lists first.
  *   null        nothing appointed at all.
  */
 source: ReadingsSource | null;
 /**
  * The day's readings: what a reader is shown first. The day's own Epistle
  * and Gospel, or, on a great feast that the calendar lists with a pair of
  * its own beside them, the feast's (FEAST_LEADS).
  */
 readings: ReadingRef[];
 /**
  * Only on a great feast whose pair leads: the day's ordinary Epistle and
  * Gospel, shown under the feast's and said to be the day's.
  */
 ordinary: ReadingRef[];
 /**
  * With an official day only: the reading proper to the day's saint or
  * feast. The owner's ruling of 2026-10-10 is that it stays, under the day's
  * own and labelled for what it is; his ruling of 2026-10-12 is whose list
  * it comes from: the official calendar's where it names one that day, and
  * the app's own date table where it names none. Empty where it would
  * repeat a reading already shown.
  */
 commemoration: ReadingRef[];
};

/**
 * A reference as the calendar prints it, with its book named in full.
 *
 * The calendar now and then shortens a book ("Gal 1:11-19" on the feast of
 * Saint James). A screen names the book in the reader's language by finding
 * its full English name at the head of the label (referenceIn in
 * lib/bible/books.ts), so a shortened one would stay English, and shortened,
 * for every reader. Only the book's name is restored: the chapter and verses
 * are the calendar's. A label that names more than one book is left alone.
 */
function fullLabel(raw: string, slug: string): string {
 const name = getBook(slug)?.name;
 const found = /^((?:[1-4] )?[A-Za-z]+\.?)\s+(\d[\d:,;\s-]*)$/.exec(raw);
 if (!name || !found || found[1] === name || bookSlug(found[1]) !== slug) return raw;
 return `${name} ${found[2]}`;
}

function fromOfficial(r: OfficialReading): ReadingRef | null {
 const first = r.segments[0];
 // A composite named by chapter has no verse to open the Bible at.
 if (!first) return null;
 // `to` is the end of the FIRST run, which for a passage that crosses into
 // the next chapter is END_OF_CHAPTER. The label carries the whole of it.
 return { kind: r.kind, book: first.book, chapter: first.chapter, from: first.from, to: first.to, label: fullLabel(r.raw, first.book) };
}

/**
 * The great feasts of the Lord and of the Theotokos that the calendar lists
 * with a pair of their own BESIDE the day's ordinary pair: the civil date on
 * the New Calendar, and the name the calendar gives the feast's pair.
 *
 * The owner's ruling of 2026-10-12, for his priest to confirm before it
 * ships: at the Liturgy on such a day it is the feast's Epistle and Gospel
 * that are read, so they come first and the day's ordinary pair goes under
 * them. The one exception is a feast of the Theotokos that falls on a Sunday,
 * when the Sunday's pair leads, as it does in church.
 *
 * Nativity, Theophany, the Elevation of the Cross and the feasts reckoned
 * from Pascha are not here: the calendar gives one pair on those days. The
 * Annunciation is here for the year it falls outside Great Lent; inside it
 * the feast's pair is the only one the day has.
 */
const FEAST_LEADS: Record<string, { whose: string; ofTheTheotokos: boolean }> = {
 "01-01": { whose: "Circumcision", ofTheTheotokos: false },
 "02-02": { whose: "Meeting", ofTheTheotokos: false },
 "03-25": { whose: "Theotokos", ofTheTheotokos: true },
 "08-06": { whose: "Transfiguration", ofTheTheotokos: false },
 "08-15": { whose: "Theotokos", ofTheTheotokos: true },
 "09-08": { whose: "Theotokos", ofTheTheotokos: true },
 "11-21": { whose: "Theotokos", ofTheTheotokos: true },
};

/**
 * Pairs the calendar gives for a service that is not the day's Liturgy (the
 * blessing of waters, a Matins or Vespers Gospel, the offices of Holy Week),
 * and a second wording of a pair already given. None of them is "the reading
 * for the day's saint", so none is shown as one.
 */
const NOT_THE_LITURGY = /Blessing of Waters|^At |^After |Matins|Vespers|Presanctified|Composite|variant/i;

/**
 * A weekday of Great Lent's own lessons: Isaiah at the Sixth Hour, Genesis
 * and Proverbs at Vespers. A feast's or a saint's Vespers readings are a
 * third, fourth and fifth, or carry its name, and are not these.
 */
const LENT_LESSON = /^(6th Hour|Vespers, (1st|2nd) reading)$/i;

type OfficialAnswer = {
 readings: ReadingRef[];
 ordinary: ReadingRef[];
 /** The saints' and feasts' own pairs the calendar names, in its order. */
 proper: ReadingRef[];
};

/**
 * The great feast whose own readings lead on this day of the official list,
 * or null. Null on most days; on a feast the calendar gives the whole day to
 * (`ownedBy` is set when the day's pair IS a named pair already); and on a
 * feast of the Theotokos that falls on a Sunday, when the Sunday's pair leads.
 */
function feastThatLeads(day: OfficialDay, date: Date): ProperReadings | null {
 const feast = FEAST_LEADS[mmdd(date)];
 if (!feast || day.ownedBy) return null;
 const its = day.proper.find((p) => !NOT_THE_LITURGY.test(p.whose) && p.whose === feast.whose);
 if (!its) return null;
 const onSunday = startOfDayUtc(date).getUTCDay() === 0;
 return feast.ofTheTheotokos && onSunday ? null : its;
}

/**
 * The Epistle and Gospel that lead on a day of the official list, whole: the
 * day's own pair, or a great feast's on the days its readings lead. A
 * ReadingRef says where a reading begins; this says all of it, which is what
 * the Verse of the Day's rule needs to tell whether a verse is inside the
 * day's reading (lib/today/__tests__/versePicks.test.ts). Null for a day the
 * list does not hold.
 */
export function leadingOfficialPair(date: Date): { epistle: OfficialReading | null; gospel: OfficialReading | null } | null {
 const day = officialDay(isoDay(startOfDayUtc(date)));
 if (!day) return null;
 const its = feastThatLeads(day, date);
 return its && (its.epistle || its.gospel) ? { epistle: its.epistle, gospel: its.gospel } : { epistle: day.epistle, gospel: day.gospel };
}

/**
 * The official calendar's answer for a date, or null when it has none: the
 * day's own Epistle and Gospel, or, on a day with neither (a weekday of
 * Great Lent has no Liturgy), the Old Testament lessons it lists.
 *
 * Three rulings of 2026-10-12 are applied here, each a question about the
 * services that the owner answered and his priest is to confirm:
 *  - a great feast's pair leads the day's ordinary pair (FEAST_LEADS);
 *  - the pair for the day's saint or feast is the calendar's own, where it
 *    names one (`proper`);
 *  - a saint's or feast's day inside Great Lent keeps its Epistle and
 *    Gospel first and shows the day's Old Testament lessons after them,
 *    where until then it showed the pair and dropped the lessons.
 */
function officialAnswerOn(date: Date): OfficialAnswer | null {
 const day = officialDay(isoDay(startOfDayUtc(date)));
 if (!day) return null;
 const refs = (list: (OfficialReading | null)[]) =>
  list.flatMap((r) => (r ? [fromOfficial(r)] : [])).filter((r): r is ReadingRef => r !== null);
 const pair = (p: { epistle: OfficialReading | null; gospel: OfficialReading | null }) => refs([p.epistle, p.gospel]);

 let readings = pair(day);
 if (readings.length === 0) {
  if (!day.all.every((r) => r.kind === "ot")) return null;
  const lessons = refs(day.all);
  return lessons.length > 0 ? { readings: lessons, ordinary: [], proper: [] } : null;
 }

 let ordinary: ReadingRef[] = [];
 let others = day.proper.filter((p) => !NOT_THE_LITURGY.test(p.whose));
 const its = feastThatLeads(day, date);
 if (its && pair(its).length > 0) {
  ordinary = readings;
  readings = pair(its);
  others = others.filter((p) => p !== its);
 }

 // The mark of a Lenten weekday is its lesson at the Sixth Hour.
 const lessons = day.all.some((r) => /^6th Hour$/i.test(r.label)) ? refs(day.all.filter((r) => LENT_LESSON.test(r.label))) : [];
 return { readings: [...readings, ...lessons], ordinary, proper: others.flatMap(pair) };
}

/**
 * The readings for a date and where they come from. Composes, in order:
 *   - the app's Paschal table, data/calendar/movable-readings.json
 *   - an official calendar's list, data/calendar/official-readings.json
 *   - the date's own table, data/calendar/daily-readings.json
 *
 * The Paschal table wins on the days it names, so a Sunday of the Triodion
 * or Pentecostarion shows its own readings. The official list answers every
 * other day it holds. Past its last day, and for a reader it is not for
 * (ReadingsOptions), the date's own table answers as it always did.
 */
export function dayReadings(date: Date, { official = true, style = "new" }: ReadingsOptions = {}): DayReadings {
 // Movable cycle: a window of ±90 days around Pascha so the Paschal
 // calendar reaches the Sunday of All Saints (+56) on one side and the
 // pre-Triodion Sunday of Zacchaeus (−77) on the other without bleeding
 // into the next/prior year's cycle.
 const offset = daysFromPascha(date);
 if (offset >= -90 && offset <= 90) {
 const movable = MOVABLE[String(offset)];
 if (movable) {
 return { source: movable.readings.length > 0 ? "paschal" : null, readings: movable.readings, ordinary: [], commemoration: [] };
 }
 }
 // The menaion moves with the reader's calendar; see ReadingsOptions.style.
 const fixed = READINGS[mmdd(shiftForStyle(startOfDayUtc(date), style))] ?? [];
 const listed = official ? officialAnswerOn(date) : null;
 if (listed) {
 const same = (a: ReadingRef, b: ReadingRef) => a.book === b.book && a.chapter === b.chapter && a.from === b.from;
 const shown = [...listed.readings, ...listed.ordinary];
 // The calendar's own pair for the day's saint or feast where it names one,
 // and the app's date table where it names none.
 const under = listed.proper.length > 0 ? listed.proper : fixed;
 return {
 source: "official",
 readings: listed.readings,
 ordinary: listed.ordinary,
 commemoration: under.filter((f, i) => !shown.some((l) => same(l, f)) && under.findIndex((u) => same(u, f)) === i),
 };
 }
 return { source: fixed.length > 0 ? "fixed" : null, readings: fixed, ordinary: [], commemoration: [] };
}

/**
 * The lectionary references (Epistle and Gospel, occasionally Old Testament)
 * for a date. `dayReadings` is the whole answer; this is its readings.
 */
export function readingsOn(date: Date, options?: ReadingsOptions): ReadingRef[] {
 return dayReadings(date, options).readings;
}

/**
 * Which table `readingsOn` answered from (see DayReadings.source).
 *
 * Added 2026-09-25 after a reader compared the app with a St Tikhon's
 * calendar and asked why they differ. They differed because Purify showed
 * the commemoration and the calendar shows the course. From 1.6 the course
 * is what is shown wherever an official list holds the day, and this still
 * lets a surface say so on the days it does not. It is the same call as
 * readingsOn, so the label and the text can never disagree.
 */
export function readingsSourceOn(date: Date, options?: ReadingsOptions): ReadingsSource | null {
 return dayReadings(date, options).source;
}

/**
 * If the day is a named Pascha-cycle Sunday, return its display label.
 * Useful for headers ("Sunday of the Paralytic") and the calendar grid.
 */
export function movableLabelOn(date: Date): string | null {
 const offset = daysFromPascha(date);
 if (offset < -90 || offset > 90) return null;
 return MOVABLE[String(offset)]?.label ?? null;
}

// ----- Month grid -----

/**
 * One tile in the month grid, and DELIBERATELY NOTHING MORE.
 *
 * This type crosses the RSC boundary: `page.tsx` builds the array on the
 * server and hands it to `CalendarGrid`, which is a client component, so
 * every field here is serialized into the flight payload for all 42 cells.
 *
 * It used to carry `saints: Saint[]` and `commemorations: Commemoration[]`
 * with each commemoration's `saint` resolved. No client component ever read
 * either one. They cost 151,385 of the page's 201,837 characters, 75% of the
 * payload, including 51 complete Saint records with their `shortBio`,
 * `life[]`, `works[]` and `quotes[]`. The tile renders a day number, a fast
 * icon, a cross and a name.
 *
 * So: add a field here only if a cell actually paints it, and prefer the
 * narrowest form of it. `iso` is a string rather than a Date because a Date
 * costs a revival per cell on the client for something used only to build an
 * href and compare selection. The rich records still exist and are still
 * read, on the server, by the day panel and the hero, which is where they
 * belong. `lib/calendar/__tests__/monthGrid.shape.test.ts` locks this down.
 */
export type MonthCell = {
 /** `YYYY-MM-DD`, UTC. */
 iso: string;
 day: number;
 inMonth: boolean;
 isToday: boolean;
 /** Is at least one of the commemorations a major feast? */
 hasFeast: boolean;
 /** Name of the headline commemoration: a major feast if there is one, else
 * the first listed for the day. The name only, never the record. */
 headlineName?: string;
 fast: FastKind;
};

/** `YYYY-MM-DD` in UTC, the key the calendar routes and compares on. */
export function isoDay(d: Date): string {
 return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Returns 42 cells (6 weeks x 7 days) for the given year/month, Sun first.
 *
 * `style` is not optional by accident. Every cell names a commemoration, a
 * fixed-cycle lookup that moves back 13 days for an Old Calendar reader, and
 * a fast, which fastingStatus splits itself (the civil weekday and Paschal
 * cycle, the reader's fixed calendar for the rest; see its comment). This
 * function once did neither: it passed the civil date to both
 * for all 42 cells, so an Old Calendar reader opening /calendar saw the
 * correct saint and fast in the day panel and NEW CALENDAR names and fast dots
 * in the grid directly beneath it. Two answers, one screen, which is the drift
 * useChurchDay was extracted to end.
 *
 * oneReckoning.test.ts excused this with an EXEMPT entry claiming the grid
 * "does its own per-cell shifting". It did not. The claim is now true.
 *
 * `today` stays CIVIL: isToday asks which square is physically today, not
 * which liturgical day the reader is keeping.
 */
export function monthGrid(
 year: number,
 month: number,
 today: Date,
 style: CalStyle,
): MonthCell[] {
 const first = new Date(Date.UTC(year, month, 1, 12));
 const startDow = first.getUTCDay(); // 0 = Sun
 const gridStart = addDays(first, -startDow);
 const cells: MonthCell[] = [];
 for (let i = 0; i < 42; i++) {
 const d = addDays(gridStart, i);
 // The cell's own lookup date, shifted per reader. `d` stays civil below
 // for iso, day, inMonth and isToday, which are facts about the square
 // on the page rather than about the liturgical day it carries.
 const lookup = shiftForStyle(d, style);
 const commemorations = commemorationsOn(lookup);
 const feast = commemorations.find((c) => c.kind === "feast");
 // No second feastsOn(d) here. It existed only to fill the `saints` field
 // that MonthCell no longer carries, and commemorationsOn already calls it
 // internally, so this loop was resolving every day's feasts twice.
 cells.push({
 iso: isoDay(d),
 day: d.getUTCDate(),
 inMonth: d.getUTCMonth() === month,
 isToday: sameDay(d, today),
 hasFeast: !!feast,
 headlineName: (feast ?? commemorations[0])?.name,
 fast: fastingStatus(d, style).kind,
 });
 }
 return cells;
}

// ----- Pascha countdown -----

export type PaschaInfo = {
 date: Date;
 daysAway: number;
 /** "Bright Monday", "12 days until Pascha", etc. */
 label: string;
};

export function paschaInfo(today: Date): PaschaInfo {
 const t = startOfDayUtc(today);
 const year = t.getUTCFullYear();
 const thisYear = orthodoxPascha(year);
 const nextYear = orthodoxPascha(year + 1);
 // If this year's Pascha has passed, use next year's.
 const target = diffDays(t, thisYear) <= 0 ? thisYear : nextYear;
 const daysAway = diffDays(target, t);
 let label: string;
 if (daysAway === 0) label = "Pascha is today. Christ is risen!";
 else if (daysAway < 0) label = "Pascha has passed.";
 else if (daysAway === 1) label = "Pascha is tomorrow.";
 else label = `${daysAway} days until Pascha (${formatMonthDay(target)})`;
 return { date: target, daysAway, label };
}

// ----- Formatting -----

/**
 * LOCALE-AWARE, and it was not.
 *
 * These three built their output from module-level English arrays, so the
 * dateline on the Prayers tab read "SATURDAY - AUGUST 30, 2026" in all
 * twenty-one locales. components/prayers/TodayMasthead.tsx found this on one
 * surface and worked around it locally, leaving the root cause in place for
 * the other three callers. This is that fix, moved to the root.
 *
 * `locale` is optional so every existing caller keeps its exact English
 * output, including scripts/native-build.mjs, which prebakes a year of this
 * offline and has no locale to pass. Intl is in the standard library, so this
 * module stays pure and synchronous with no I/O, which the widget prebake
 * depends on.
 *
 * The separator is kept out of Intl on purpose: a plain
 * `dateStyle: "full"` renders "Saturday, August 30, 2026" and the design wants
 * the weekday set off by a middot.
 */
export function formatLongDate(d: Date, locale?: string): string {
  // A language the device has no data for is written in English as well:
  // asked anyway, it answers "Sun · M11 13, 2026" (lib/i18n/deviceDates.ts).
  if (locale && writesDatesIn(locale)) {
    const weekday = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      timeZone: "UTC",
    }).format(d);
    const rest = new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
    return `${weekday} · ${rest}`;
  }
  const dow = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    d.getUTCDay()
  ];
  return `${dow} · ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/**
 * Long-date format with both the civil (Gregorian) and the liturgical
 * (Julian) reckonings when the Old Calendar style is selected, e.g.
 * Saturday · May 17 / May 4, 2026
 * For New Calendar, falls back to the single-style `formatLongDate`.
 *
 * `locale` is the reader's language. Without it the date is written in
 * English, which is how the calendar's own heading read on every phone
 * until 1.6, whatever the phone was set to.
 */
export function formatLongDateDual(d: Date, style: "new" | "old", locale?: string): string {
 if (style === "new") return formatLongDate(d, locale);
 const julian = new Date(d);
 julian.setUTCDate(julian.getUTCDate() - 13);
 if (locale && writesDatesIn(locale)) {
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(d);
  const dayOf = new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", timeZone: "UTC" });
  return `${weekday} · ${dayOf.format(d)} / ${dayOf.format(julian)}, ${d.getUTCFullYear()}`;
 }
 const dow = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
 d.getUTCDay()
 ];
 return `${dow} · ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} / ${MONTHS[julian.getUTCMonth()]} ${julian.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/**
 * Greek capital month name for the bilingual calendar heading. Returns the
 * polytonic form used in modern Greek service-books.
 */
const GREEK_MONTHS = [
 "ΙΑΝΟΥΑΡΙΟΣ",
 "ΦΕΒΡΟΥΑΡΙΟΣ",
 "ΜΑΡΤΙΟΣ",
 "ΑΠΡΙΛΙΟΣ",
 "ΜΑΪΟΣ",
 "ΙΟΥΝΙΟΣ",
 "ΙΟΥΛΙΟΣ",
 "ΑΥΓΟΥΣΤΟΣ",
 "ΣΕΠΤΕΜΒΡΙΟΣ",
 "ΟΚΤΩΒΡΙΟΣ",
 "ΝΟΕΜΒΡΙΟΣ",
 "ΔΕΚΕΜΒΡΙΟΣ",
] as const;

export function greekMonthName(month: number): string {
 return GREEK_MONTHS[month] ?? "";
}

export function formatMonthDay(d: Date, locale?: string): string {
  if (locale && writesDatesIn(locale)) {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(d);
  }
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatMonthYear(year: number, month: number, locale?: string): string {
  if (locale && writesDatesIn(locale)) {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month, 1)));
  }
  return `${MONTHS[month]} ${year}`;
}

// ----- Liturgical greeting for the home-page eyebrow -----

/**
 * Returns the appropriate Orthodox liturgical greeting for the given
 * date, e.g. "Christ is risen!" during the Paschal season, "Christ is
 * born!" during the Twelve Days of Christmas, "Open to me the doors of
 * repentance" in Great Lent. Falls back to the standard everyday
 * Orthodox greeting in ordinary time.
 */
export function liturgicalGreeting(date: Date): string {
 const d = startOfDayUtc(date);
 const year = d.getUTCFullYear();
 const month = d.getUTCMonth();
 const day = d.getUTCDate();

 const pascha = orthodoxPascha(year);
 const previousPascha = orthodoxPascha(year - 1);
 const ascension = addDays(pascha, 39);
 const pentecost = addDays(pascha, 49);
 const palmSunday = addDays(pascha, -7);
 const cleanMonday = addDays(pascha, -48);

 // Paschal season: from Pascha through Ascension (Greek tradition
 // greets each other this way for forty days).
 if (inRangeInclusive(d, pascha, ascension)) {
 return "Christ is risen! Truly He is risen!";
 }
 // Ascension to Pentecost, still in the Pentecostarion but past
 // Ascension itself.
 if (inRangeInclusive(d, addDays(ascension, 1), pentecost)) {
 return "Christ is ascended! Glorify Him!";
 }
 // Holy Week (between Palm Sunday and Pascha).
 if (inRangeInclusive(d, addDays(palmSunday, 1), addDays(pascha, -1))) {
 return "Behold, the Bridegroom comes.";
 }
 // Great Lent (Clean Monday through Palm Sunday).
 if (inRangeInclusive(d, cleanMonday, palmSunday)) {
 return "Open to me the doors of repentance.";
 }
 // The Twelve Days (Dec 25 through Jan 6 either year).
 if (
 (month === 11 && day >= 25) ||
 (month === 0 && day <= 6)
 ) {
 return "Christ is born! Glorify Him!";
 }

 // Check whether we're inside the previous year's Pentecostarion (if
 // someone visits in early-year Pascha 2027 from Jan 2027, the above
 // year check uses 2027's Pascha, not 2026's, so we cross-check the
 // previous-year window for January overlap.)
 const prevAscension = addDays(previousPascha, 39);
 if (inRangeInclusive(d, previousPascha, prevAscension)) {
 return "Christ is risen! Truly He is risen!";
 }

 // Ordinary time.
 return "Glory to Jesus Christ. Glory forever.";
}

// ----- Named Orthodox seasons (for the home-page season banner) -----

export type SeasonInfo = {
 label: string;
 subtheme?: string;
 blurb: string;
 href: string;
};

/**
 * Classifies the given date into a named Orthodox season (Great Lent,
 * Holy Week, Bright Week, Pre-Lent, Apostles' Fast, Dormition Fast,
 * Nativity Fast, Twelve Days of Christmas) and returns label + subtheme
 * for surface display. Returns null in ordinary time.
 *
 * `date` is the CIVIL day, split the way fastingStatus splits it: the
 * Paschal seasons from the civil day, the fixed ones (the end of the
 * Apostles' Fast, the Dormition and Nativity fasts, the Twelve Days) from
 * the reader's own calendar.
 */
export function currentSeason(date: Date, style: CalStyle): SeasonInfo | null {
 const d = startOfDayUtc(date);
 const year = d.getUTCFullYear();
 const dow = d.getUTCDay();
 const f = shiftForStyle(d, style);
 const fixedYear = f.getUTCFullYear();
 const month = f.getUTCMonth();
 const day = f.getUTCDate();

 const pascha = orthodoxPascha(year);
 const previousPascha = orthodoxPascha(year - 1);
 const palmSunday = addDays(pascha, -7);
 const cleanMonday = addDays(pascha, -48);
 const holySaturday = addDays(pascha, -1);
 const brightWeekEnd = addDays(pascha, 7);
 const allSaintsSunday = addDays(pascha, 56);
 const apostlesFastStart = addDays(allSaintsSunday, 1);
 const apostlesFastEnd = new Date(Date.UTC(fixedYear, 5, 28, 12));
 const dormitionStart = new Date(Date.UTC(fixedYear, 7, 1, 12));
 const dormitionEnd = new Date(Date.UTC(fixedYear, 7, 14, 12));
 const nativityStart = new Date(Date.UTC(fixedYear, 10, 15, 12));
 const nativityEnd = new Date(Date.UTC(fixedYear, 11, 24, 12));

 const SUNDAYS_OF_LENT = [
 "Sunday of Orthodoxy",
 "St. Gregory Palamas",
 "Veneration of the Cross",
 "St. John Climacus",
 "St. Mary of Egypt",
 ];

 // Holy Week (Palm Sunday's Monday through Holy Saturday).
 if (inRangeInclusive(d, addDays(palmSunday, 1), holySaturday)) {
 const daysIntoHolyWeek = diffDays(d, palmSunday);
 const dayLabel = [
 null,
 "Bridegroom Monday",
 "Bridegroom Tuesday",
 "Bridegroom Wednesday",
 "Holy Thursday",
 "Holy Friday",
 "Holy Saturday",
 ][daysIntoHolyWeek];
 return {
 label: "Holy Week",
 subtheme: dayLabel ?? undefined,
 blurb:
 "The final week of Great Lent. The Church walks with Christ from the Bridegroom services through the Passion to the empty tomb.",
 href: "/calendar",
 };
 }

 // Palm Sunday itself.
 if (sameDay(d, palmSunday)) {
 return {
 label: "Palm Sunday",
 subtheme: "Entry into Jerusalem",
 blurb: "The Lord enters Jerusalem on a colt. The crowds spread branches and cry Hosanna. Holy Week begins this evening.",
 href: "/calendar",
 };
 }

 // Bright Week (Pascha through following Sunday).
 if (inRangeInclusive(d, pascha, brightWeekEnd)) {
 const daysIntoBright = diffDays(d, pascha);
 const dayLabel = [
 "Pascha",
 "Bright Monday",
 "Bright Tuesday",
 "Bright Wednesday",
 "Bright Thursday",
 "Bright Friday",
 "Bright Saturday",
 "Thomas Sunday",
 ][daysIntoBright];
 return {
 label: "Bright Week",
 subtheme: dayLabel,
 blurb:
 "The week of the Resurrection. The Royal Doors of the iconostasis stay open all week; the fast is set aside.",
 href: "/calendar",
 };
 }

 // Great Lent (Clean Monday through Holy Saturday eve, but Holy Week
 // matched first above; Palm Sunday matched above; so this catches
 // Clean Monday through the Friday before Palm Sunday).
 if (inRangeInclusive(d, cleanMonday, addDays(palmSunday, -1))) {
 // Which Sunday of Lent are we in or approaching?
 const weeksIn = Math.floor(diffDays(d, cleanMonday) / 7);
 const sundayName = SUNDAYS_OF_LENT[Math.min(weeksIn, SUNDAYS_OF_LENT.length - 1)];
 return {
 label: "Great Lent",
 subtheme: dow === 0 ? `Sunday of ${sundayName}` : `Week of ${sundayName}`,
 blurb:
 "The forty days of preparation before Holy Week and Pascha. A season for fasting, prayer, almsgiving, and the lengthened services of the Church.",
 href: "/calendar",
 };
 }

 // Pre-Lent (the three Sundays before Lent: Publican & Pharisee,
 // Prodigal Son, Last Judgment, Forgiveness Sunday).
 const publicanSunday = addDays(pascha, -70);
 const prodigalSunday = addDays(pascha, -63);
 const meatfareSunday = addDays(pascha, -56);
 if (inRangeInclusive(d, publicanSunday, addDays(cleanMonday, -1))) {
 let sub: string;
 if (diffDays(d, publicanSunday) <= 6) sub = "Publican and Pharisee";
 else if (diffDays(d, prodigalSunday) <= 6) sub = "Prodigal Son";
 else if (diffDays(d, meatfareSunday) <= 6) sub = "Last Judgment (Meatfare)";
 else sub = "Forgiveness Sunday (Cheesefare)";
 return {
 label: "Pre-Lent",
 subtheme: sub,
 blurb:
 "The three weeks of preparation before Great Lent. The Church reads the parables that frame the coming fast.",
 href: "/calendar",
 };
 }

 // Apostles' Fast (Monday after All Saints Sunday → June 28).
 if (diffDays(d, apostlesFastStart) >= 0 && diffDays(f, apostlesFastEnd) <= 0) {
 const remaining = diffDays(apostlesFastEnd, f) + 1;
 return {
 label: "Apostles' Fast",
 subtheme: `${remaining} day${remaining === 1 ? "" : "s"} until the feast of Sts. Peter and Paul`,
 blurb:
 "Preparation for the feast of the Holy Apostles Peter and Paul (June 29). Length varies with the date of Pascha.",
 href: "/calendar",
 };
 }

 // Dormition Fast (Aug 1-14).
 if (inRangeInclusive(f, dormitionStart, dormitionEnd)) {
 const remaining = diffDays(dormitionEnd, f) + 1;
 return {
 label: "Dormition Fast",
 subtheme: `${remaining} day${remaining === 1 ? "" : "s"} until the Dormition of the Theotokos`,
 blurb:
 "Two weeks of preparation before the Dormition (the falling-asleep) of the Theotokos on August 15.",
 href: "/calendar",
 };
 }

 // Nativity Fast (Nov 15 - Dec 24).
 if (inRangeInclusive(f, nativityStart, nativityEnd)) {
 const remaining = diffDays(nativityEnd, f) + 1;
 return {
 label: "Nativity Fast",
 subtheme: `${remaining} day${remaining === 1 ? "" : "s"} until the Nativity of Christ`,
 blurb:
 "Forty days of preparation before the Nativity of Christ on December 25. A quieter Lent, looking toward the manger.",
 href: "/calendar",
 };
 }

 // Twelve Days of Christmas (Dec 25 - Jan 6).
 if (
 (month === 11 && day >= 25) ||
 (month === 0 && day <= 6)
 ) {
 return {
 label: "The Twelve Days",
 subtheme: "Christmas through Theophany",
 blurb:
 "The fast-free days between the Nativity of Christ (Dec 25) and the Theophany (Jan 6). The Church celebrates the Incarnation.",
 href: "/calendar",
 };
 }

 // Cross-year Pentecostarion edge case.
 const prevAscension = addDays(previousPascha, 39);
 if (inRangeInclusive(d, previousPascha, prevAscension)) {
 return {
 label: "Paschal season",
 subtheme: "The Pentecostarion",
 blurb:
 "The forty days from Pascha to the Ascension. Christians greet one another with Christ is risen.",
 href: "/calendar",
 };
 }

 return null;
}
