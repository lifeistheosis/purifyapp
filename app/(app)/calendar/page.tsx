import Link from "next/link";
import {
 commemorationsOn,
 currentSeason,
 fastingStatus,
 formatLongDateDual,
 greekMonthName,
 monthGrid,
 paschaInfo,
 readingsOn,
 startOfDayUtc,
 type ReadingRef,
} from "@/lib/calendar/orthodox";
import { getSaint } from "@/lib/saints/saints";
import { loadVerseRange, type Verse } from "@/lib/bible/load";
import { calendarPageVars, toneFor } from "@/lib/calendar/tone";
import { cookies } from "next/headers";
import { CALENDAR_STYLE_COOKIE } from "@/lib/calendar/styleDefault";
import { FeastPanel } from "@/components/calendar/FeastPanel";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { DayScroll } from "@/components/calendar/DayScroll";
import { OrnamentRule } from "@/components/calendar/OrnamentRule";
import { Colophon } from "@/components/calendar/Colophon";
import { SectionLabel } from "@/components/calendar/SectionLabel";
import { LocalTodaySync } from "@/components/calendar/LocalTodaySync";
import StyleToggleLink from "@/components/calendar/StyleToggleLink";
import { getServerLocale } from "@/lib/i18n/server";
import { T } from "@/components/i18n/T";

export const metadata = {
 title: "Orthodox Calendar",
 description:
 "Today's saint, today's fast, and the month at a glance, following the New (Revised Julian) calendar.",
};

// Hourly ISR so today rolls forward without a redeploy.
export const revalidate = 3600;

type SearchParams = Promise<{
 m?: string;
 d?: string;
 style?: string;
 /** Client's local date (YYYY-MM-DD), set by LocalTodaySync so "today" is
  * the reader's local day rather than the server's UTC day. */
 today?: string;
}>;
type CalStyle = "new" | "old";

// The Old (Julian) Calendar runs 13 days behind the New (Revised Julian) for
// fixed feasts; look up the Gregorian-keyed index shifted back by 13 days.
const JULIAN_OFFSET_DAYS = 13;

function shiftForStyle(d: Date, style: CalStyle): Date {
 if (style === "new") return d;
 const out = new Date(d);
 out.setUTCDate(out.getUTCDate() - JULIAN_OFFSET_DAYS);
 return out;
}

function parseMonthParam(m: string | undefined, fallback: Date) {
 if (m) {
 const match = m.match(/^(\d{4})-(\d{1,2})$/);
 if (match) {
 const y = parseInt(match[1], 10);
 const mo = parseInt(match[2], 10) - 1;
 if (Number.isInteger(y) && y >= 1900 && y <= 2200 && mo >= 0 && mo <= 11) {
 return { year: y, month: mo };
 }
 }
 }
 return { year: fallback.getUTCFullYear(), month: fallback.getUTCMonth() };
}

function parseDayParam(d: string | undefined): Date | null {
 if (!d) return null;
 const m = d.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
 if (!m) return null;
 const dt = new Date(
 Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12),
 );
 return Number.isNaN(dt.getTime()) ? null : dt;
}

function prevMonthHref(year: number, month: number): string {
 const m = month === 0 ? 11 : month - 1;
 const y = month === 0 ? year - 1 : year;
 return `/calendar?m=${y}-${String(m + 1).padStart(2, "0")}`;
}
function nextMonthHref(year: number, month: number): string {
 const m = month === 11 ? 0 : month + 1;
 const y = month === 11 ? year + 1 : year;
 return `/calendar?m=${y}-${String(m + 1).padStart(2, "0")}`;
}

type ResolvedReading = {
 ref: ReadingRef;
 passage: { name: string; verses: Verse[] } | null;
};

async function resolveReadings(refs: ReadingRef[]): Promise<ResolvedReading[]> {
 return Promise.all(
 refs.map(async (ref) => ({
 ref,
 passage: await loadVerseRange(ref.book, ref.chapter, ref.from, ref.to),
 })),
 );
}

function ReadingPanel({
 reading,
 size = "md",
}: {
 reading: ResolvedReading;
 size?: "sm" | "md";
}) {
 const { ref, passage } = reading;
 const kindKey =
 ref.kind === "epistle"
 ? "bible.kindEpistleLong"
 : ref.kind === "ot"
 ? "bible.kindOtLong"
 : "bible.kindGospelLong";
 const firstVerse = passage?.verses?.[0];
 const moreVerses = (passage?.verses?.length ?? 0) > 1;
 const verseText =
 size === "sm" ? "text-detail" : "text-ui md:text-body";
 const accent =
 ref.kind === "gospel" ? "border-gold/30 bg-gold/[0.05]" : "border-paper/12 bg-paper/[0.03]";
 return (
 <div className={`rounded-lg border p-5 md:p-6 ${accent} flex flex-col h-full`}>
 {/* Eyebrow + citation stack on the same left rail, clean vertical
 rhythm, no baseline tug-of-war between an 11px caps label and a
 14px proper noun. */}
 <p className="font-sans text-eyebrow uppercase tracking-[2px] text-gold font-semibold leading-none">
 <T k={kindKey} />
 </p>
 <p className="mt-2 font-display-serif text-lede md:text-lede text-paper leading-tight">
 {ref.label}
 </p>

 {firstVerse ? (
 <p
 className={`font-serif text-paper/85 ${verseText} leading-[1.65] mt-4`}
 >
 <span className="font-sans text-eyebrow font-semibold text-gold tracking-[0.05em] mr-2 align-baseline">
 {firstVerse.n}
 </span>
 {firstVerse.text}
 {moreVerses && <span className="text-paper/40"> …</span>}
 </p>
 ) : (
 <p className="font-sans text-detail text-paper/45 italic mt-4">
 <T k="calendar.verseUnavailable" />
 </p>
 )}

 <Link
 href={`/bible/${ref.book}/${ref.chapter}#v${ref.from}`}
 className="mt-auto pt-4 inline-block font-sans text-caption font-medium text-gold hover:text-gold-soft transition-colors"
 >
 <T k="calendar.readFullPassage" /> →
 </Link>
 </div>
 );
}

export default async function CalendarPage({
 searchParams,
}: {
 searchParams: SearchParams;
}) {
 // Android static export can't read searchParams/cookies (would force dynamic);
 // it renders the default (New calendar) and the client adjusts from the
 // ?style= param + local calendar-style preference. Website unchanged.
 const isAndroid = process.env.BUILD_TARGET === "android";
 const params = isAndroid
   ? ({} as Awaited<SearchParams>)
   : await searchParams;
 const locale = await getServerLocale();
 // Resolve the calendar style:
 //   1. ?style= query (per-visit toggle wins)
 //   2. user preference cookie (ProfileSettings writes it)
 //   3. fall back to New (Revised Julian)
 const cookieStyle = isAndroid
   ? undefined
   : (await cookies()).get(CALENDAR_STYLE_COOKIE)?.value;
 const style: CalStyle =
   params.style === "old"
     ? "old"
     : params.style === "new"
       ? "new"
       : cookieStyle === "old"
         ? "old"
         : "new";
 // "Today" is the reader's LOCAL day when LocalTodaySync has supplied it via
 // ?today=, otherwise the server's UTC day as a first-render fallback. This
 // keeps the highlighted day, the Today panel, and its readings on the
 // visitor's calendar date rather than the server's time zone.
 const today = parseDayParam(params.today) ?? startOfDayUtc(new Date());
 const serverTodayIso = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
 const { year, month } = parseMonthParam(params.m, today);

 const selectedDay =
 parseDayParam(params.d) ??
 (today.getUTCFullYear() === year && today.getUTCMonth() === month
 ? today
 : new Date(Date.UTC(year, month, 1, 12)));

 // Lookups use the style-shifted date; display strings use the real date.
 const todayLookup = shiftForStyle(today, style);
 const selectedLookup = shiftForStyle(selectedDay, style);

 const todayCommemorations = commemorationsOn(todayLookup);
 const todayFast = fastingStatus(todayLookup);
 const pascha = paschaInfo(today);
 const grid = monthGrid(year, month, today);
 const selectedCommemorations = commemorationsOn(selectedLookup);
 const selectedFast = fastingStatus(selectedLookup);

 const headline =
 todayCommemorations.find((c) => c.kind === "feast") ??
 todayCommemorations[0] ??
 null;
 const headlineSaint =
 headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null) ?? null;

 const todayTone = toneFor({
 hasFeast: todayCommemorations.some((c) => c.kind === "feast"),
 fast: todayFast.kind,
 });
 const selectedTone = toneFor({
 hasFeast: selectedCommemorations.some((c) => c.kind === "feast"),
 fast: selectedFast.kind,
 });

 const [todayReadings, selectedReadings] = await Promise.all([
 resolveReadings(readingsOn(todayLookup)),
 resolveReadings(readingsOn(selectedLookup)),
 ]);

 // Locale-aware date pieces (server locale; the web is per-request
 // correct, the native export bakes English and client islands carry
 // the switchable labels).
 const monthName = (m: number) =>
   new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
     new Date(Date.UTC(2000, m, 1)),
   );
 const monthDay = (d: Date) =>
   new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", timeZone: "UTC" }).format(d);
 const weekdayName = (d: Date) =>
   new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(d);

 const paschaPrimary =
 pascha.daysAway === 0 ? (
 <T k="today.paschaPrimaryToday" />
 ) : pascha.daysAway > 0 ? (
 <T k="today.paschaDays" count={pascha.daysAway} />
 ) : (
 <T k="today.paschaPrimaryPassed" />
 );
 const paschaSecondary =
 pascha.daysAway > 0 ? (
 <T
 k="calendar.untilPaschaDate"
 replacements={{
 date: monthDay(pascha.date),
 year: pascha.date.getUTCFullYear(),
 }}
 />
 ) : pascha.daysAway === 0 ? (
 <T k="today.paschaToday" />
 ) : (
 <T k="today.paschaPassed" />
 );

 // Toggle hrefs (preserve month/day, flip style). Both hrefs carry an explicit
 // style: without it, a persisted "old" cookie silently wins over the New
 // toggle and the switch appears stuck (community report).
 const baseQS = new URLSearchParams();
 if (params.m) baseQS.set("m", params.m);
 if (params.d) baseQS.set("d", params.d);
 const newQS = new URLSearchParams(baseQS);
 newQS.set("style", "new");
 const newStyleHref = `/calendar?${newQS.toString()}`;
 const oldQS = new URLSearchParams(baseQS);
 oldQS.set("style", "old");
 const oldStyleHref = `/calendar?${oldQS.toString()}`;

 const season = currentSeason(today);

 return (
 <div
 className="bg-night min-h-screen menaion-surface"
 data-season={season?.label ?? undefined}
 style={calendarPageVars(todayTone, season)}
 >
 {/* HERO */}
 <LocalTodaySync serverToday={serverTodayIso} />
 <section className="px-5 md:px-8 pt-10 md:pt-14 pb-10 border-b border-white/8">
 <div className="mx-auto max-w-[1280px] w-full">
 <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
 <SectionLabel>
 <T k="calendar.heroEyebrow" />
 </SectionLabel>
 {/* Typographic style toggle, no eyebrow label. */}
 <div className="inline-flex items-baseline gap-3">
 <StyleToggleLink
 href={newStyleHref}
 style="new"
 current={style === "new"}
 className={`font-sans text-caption tracking-[0.5px] transition-colors ${
 style === "new"
 ? "kalendrium-active"
 : "text-paper/55 hover:text-paper"
 }`}
 >
 <T k="calendar.styleNew" />
 </StyleToggleLink>
 <span aria-hidden className="text-gold/35 text-caption">·</span>
 <StyleToggleLink
 href={oldStyleHref}
 style="old"
 current={style === "old"}
 className={`font-sans text-caption tracking-[0.5px] transition-colors ${
 style === "old"
 ? "kalendrium-active"
 : "text-paper/55 hover:text-paper"
 }`}
 >
 <T k="calendar.styleOld" />
 </StyleToggleLink>
 </div>
 </div>

 <FeastPanel
 dateLabel={formatLongDateDual(today, style)}
 headline={headline}
 headlineSaint={headlineSaint}
 others={headline ? todayCommemorations.slice(1) : todayCommemorations}
 fast={todayFast}
 paschaPrimary={paschaPrimary}
 paschaSecondary={paschaSecondary}
 />

 {style === "old" && (
 <p className="mt-4 font-serif italic text-caption text-paper/55 text-right max-w-[1280px]">
 <T k="calendar.julianNote" />
 </p>
 )}
 </div>
 </section>

 {/* TODAY'S READINGS */}
 {todayReadings.length > 0 && (
 <section className="px-5 md:px-8 py-10 md:py-12 border-b border-white/8 bg-night-soft">
 <div className="mx-auto max-w-[1280px] w-full">
 <div className="text-center mb-7">
 <SectionLabel>
 <T k="calendar.todaysReadings" />
 </SectionLabel>
 <h2 className="mt-2 font-display-serif text-title-sm md:text-heading text-paper">
 <T k="calendar.wordFor" replacements={{ date: monthDay(today) }} />
 </h2>
 <OrnamentRule className="mt-4 max-w-[420px] mx-auto" />
 </div>
 {todayReadings.length === 1 ? (
 <div className="max-w-[560px] mx-auto">
 <ReadingPanel reading={todayReadings[0]} size="md" />
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[920px] mx-auto">
 {todayReadings.map((r, i) => (
 <ReadingPanel key={i} reading={r} size="md" />
 ))}
 </div>
 )}
 </div>
 </section>
 )}

 {/* GRID + DAY DETAIL. Solid-black panel edge to edge — matches the legend
     panel (bg-black) and the dark day-detail card, so the whole grid +
     day-detail block reads on one uninterrupted #000 surface. */}
 <section className="px-5 md:px-8 py-10 md:py-14 bg-black">
 <div className="mx-auto max-w-[1280px] w-full">
 <header className="flex items-end justify-between mb-8 gap-4 flex-wrap">
 <div className="min-w-0">
 <h2 className="font-display-serif text-heading md:text-display-lg text-paper leading-[0.95] tracking-[-0.01em]">
 {monthName(month)}{" "}
 <span className="text-paper/55 font-normal">{year}</span>
 </h2>
 <p
 lang="grc"
 className="mt-2 font-serif uppercase tracking-[3px] text-caption text-gold/80 leading-none"
 style={{ fontFamily: "var(--font-greek), serif" }}
 >
 {greekMonthName(month)}
 </p>
 </div>
 <nav className="flex items-baseline gap-4">
 <Link
 href={prevMonthHref(year, month)}
 className="font-sans text-caption tracking-[0.5px] text-paper/65 hover:text-paper transition-colors"
 >
 ‹ <T k="calendar.prevMonth" />
 </Link>
 <span aria-hidden className="text-gold/35 text-caption">·</span>
 <Link
 href="/calendar"
 className="font-sans text-caption tracking-[0.5px] text-paper/85 hover:text-paper transition-colors"
 >
 <T k="calendar.todayLink" />
 </Link>
 <span aria-hidden className="text-gold/35 text-caption">·</span>
 <Link
 href={nextMonthHref(year, month)}
 className="font-sans text-caption tracking-[0.5px] text-paper/65 hover:text-paper transition-colors"
 >
 <T k="calendar.nextMonth" /> ›
 </Link>
 </nav>
 </header>

 <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 lg:gap-10 items-start">
 <CalendarGrid
 grid={grid}
 year={year}
 month={month}
 selectedDay={selectedDay}
 style={style}
 />

 <aside className="lg:sticky lg:top-[88px]">
 <DayScroll
 weekday={weekdayName(selectedDay)}
 dateLabel={`${monthDay(selectedDay)}, ${selectedDay.getUTCFullYear()}`}
 tone={selectedTone}
 fast={selectedFast}
 commemorations={selectedCommemorations}
 readings={
 selectedReadings.length > 0 ? (
 /* Compact citation list, no verse teasers in the
 sticky day panel; the full verses are one tap
 away. Keeps the right column short so the left
 column doesn't leave a big empty rail. */
 <ul className="divide-y divide-paper/8 border-t border-b border-paper/10">
 {selectedReadings.map((r, i) => {
 const kindKey =
 r.ref.kind === "epistle"
 ? "bible.kindEpistleLong"
 : r.ref.kind === "ot"
 ? "bible.kindOtLong"
 : "bible.kindGospelLong";
 return (
 <li key={i}>
 <Link
 href={`/bible/${r.ref.book}/${r.ref.chapter}#v${r.ref.from}`}
 className="group flex items-baseline justify-between gap-3 py-2.5"
 >
 <span className="font-sans text-eyebrow uppercase tracking-[2px] text-gold font-semibold">
 <T k={kindKey} />
 </span>
 <span className="font-display-serif text-ui text-paper group-hover:text-gold transition-colors text-right">
 {r.ref.label}
 </span>
 </Link>
 </li>
 );
 })}
 </ul>
 ) : undefined
 }
 />
 </aside>
 </div>
 </div>
 </section>

 {/* COLOPHON */}
 <section className="px-5 md:px-8 py-14 md:py-16">
 <div className="mx-auto max-w-[760px] w-full">
 <Colophon />
 <p className="mt-10 font-serif text-detail text-paper/55 leading-[1.7]">
 <T k="calendar.reckoningsNote" />
 </p>
 <p className="mt-3 font-sans text-caption text-paper/40 leading-[1.6]">
 <T k="calendar.fastingDisclaimer" />
 </p>
 </div>
 </section>
 </div>
 );
}
