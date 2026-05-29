import Link from "next/link";
import {
 commemorationsOn,
 currentSeason,
 fastingStatus,
 formatLongDate,
 formatLongDateDual,
 formatMonthDay,
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
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = {
 title: "Orthodox Calendar",
 description:
 "Today's saint, today's fast, and the month at a glance, following the New (Revised Julian) calendar.",
};

// Hourly ISR so today rolls forward without a redeploy.
export const revalidate = 3600;

type SearchParams = Promise<{ m?: string; d?: string; style?: string }>;
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
 isDe = false,
}: {
 reading: ResolvedReading;
 size?: "sm" | "md";
 isDe?: boolean;
}) {
 const { ref, passage } = reading;
 const kindLabel = isDe
 ? ref.kind === "epistle"
 ? "Apostel"
 : ref.kind === "ot"
 ? "Altes Testament"
 : "Evangelium"
 : ref.kind === "epistle"
 ? "Epistle"
 : ref.kind === "ot"
 ? "Old Testament"
 : "Gospel";
 const firstVerse = passage?.verses?.[0];
 const moreVerses = (passage?.verses?.length ?? 0) > 1;
 const verseText =
 size === "sm" ? "text-[13.5px]" : "text-[15px] md:text-[16px]";
 const accent =
 ref.kind === "gospel" ? "border-gold/30 bg-gold/[0.05]" : "border-paper/12 bg-paper/[0.03]";
 return (
 <div className={`rounded-lg border p-5 md:p-6 ${accent} flex flex-col h-full`}>
 {/* Eyebrow + citation stack on the same left rail, clean vertical
 rhythm, no baseline tug-of-war between an 11px caps label and a
 14px proper noun. */}
 <p className="font-sans text-[10.5px] uppercase tracking-[2px] text-gold/75 font-semibold leading-none">
 {kindLabel}
 </p>
 <p className="mt-2 font-display-serif text-[18px] md:text-[19px] text-paper leading-tight">
 {ref.label}
 </p>

 {firstVerse ? (
 <p
 className={`font-serif text-paper/85 ${verseText} leading-[1.65] mt-4`}
 >
 <span className="font-sans text-[10px] font-semibold text-gold/65 tracking-[0.05em] mr-2 align-baseline">
 {firstVerse.n}
 </span>
 {firstVerse.text}
 {moreVerses && <span className="text-paper/40"> …</span>}
 </p>
 ) : (
 <p className="font-sans text-[13px] text-paper/45 italic mt-4">
 {isDe ? "Versetext nicht verfügbar." : "Verse text unavailable."}
 </p>
 )}

 <Link
 href={`/bible/${ref.book}/${ref.chapter}#v${ref.from}`}
 className="mt-auto pt-4 inline-block font-sans text-[12px] font-medium text-gold/80 hover:text-gold transition-colors"
 >
 {isDe ? "Vollständigen Abschnitt lesen →" : "Read full passage →"}
 </Link>
 </div>
 );
}

const MONTH_NAMES_EN = [
 "January", "February", "March", "April", "May", "June",
 "July", "August", "September", "October", "November", "December",
];
const MONTH_NAMES_DE = [
 "Januar", "Februar", "März", "April", "Mai", "Juni",
 "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default async function CalendarPage({
 searchParams,
}: {
 searchParams: SearchParams;
}) {
 const params = await searchParams;
 const locale = await getServerLocale();
 const isDe = locale === "de";
 // Resolve the calendar style:
 //   1. ?style= query (per-visit toggle wins)
 //   2. user preference cookie (ProfileSettings writes it)
 //   3. fall back to New (Revised Julian)
 const cookieStore = await cookies();
 const cookieStyle = cookieStore.get(CALENDAR_STYLE_COOKIE)?.value;
 const style: CalStyle =
   params.style === "old"
     ? "old"
     : params.style === "new"
       ? "new"
       : cookieStyle === "old"
         ? "old"
         : "new";
 const today = startOfDayUtc(new Date());
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

 const paschaPrimary =
 pascha.daysAway === 0
 ? isDe
 ? "Heute"
 : "Today"
 : pascha.daysAway > 0
 ? isDe
 ? `${pascha.daysAway} Tage`
 : `${pascha.daysAway} days`
 : isDe
 ? "Vergangen"
 : "Passed";
 const paschaSecondary =
 pascha.daysAway > 0
 ? isDe
 ? `Bis zum ${formatMonthDay(pascha.date)}, ${pascha.date.getUTCFullYear()}`
 : `Until ${formatMonthDay(pascha.date)}, ${pascha.date.getUTCFullYear()}`
 : pascha.label;

 // Toggle hrefs (preserve month/day, flip style).
 const baseQS = new URLSearchParams();
 if (params.m) baseQS.set("m", params.m);
 if (params.d) baseQS.set("d", params.d);
 const newStyleHref = `/calendar?${baseQS.toString()}`;
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
 <section className="px-5 md:px-8 pt-10 md:pt-14 pb-10 border-b border-white/8">
 <div className="mx-auto max-w-[1280px] w-full">
 <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
 <SectionLabel>
 {isDe
 ? "Orthodoxer Kalender · Heute"
 : "Orthodox Calendar · Today"}
 </SectionLabel>
 {/* Typographic style toggle, no eyebrow label. */}
 <div className="inline-flex items-baseline gap-3">
 <Link
 href={newStyleHref}
 aria-current={style === "new" ? "true" : undefined}
 className={`font-sans text-[12px] tracking-[0.5px] transition-colors ${
 style === "new"
 ? "kalendrium-active"
 : "text-paper/55 hover:text-paper"
 }`}
 >
 {isDe ? "Neu" : "New"}
 </Link>
 <span aria-hidden className="text-gold/35 text-[12px]">·</span>
 <Link
 href={oldStyleHref}
 aria-current={style === "old" ? "true" : undefined}
 className={`font-sans text-[12px] tracking-[0.5px] transition-colors ${
 style === "old"
 ? "kalendrium-active"
 : "text-paper/55 hover:text-paper"
 }`}
 >
 {isDe ? "Alt" : "Old"}
 </Link>
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
 locale={locale}
 />

 {style === "old" && (
 <p className="mt-4 font-serif italic text-[12.5px] text-paper/55 text-right max-w-[1280px]">
 {isDe
 ? "Im Alten (Julianischen) Kalender steht das liturgische Datum heute dreizehn Tage hinter dem bürgerlichen Datum. Beide sind oben angegeben."
 : "On the Old (Julian) calendar, today’s liturgical date is thirteen days behind the civil date. Both are shown above."}
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
 {isDe ? "Lesungen für heute" : "Today’s readings"}
 </SectionLabel>
 <h2 className="mt-2 font-display-serif text-[24px] md:text-[30px] text-paper">
 {isDe
 ? `Das Wort für den ${formatMonthDay(today)}`
 : `The Word for ${formatMonthDay(today)}`}
 </h2>
 <OrnamentRule className="mt-4 max-w-[420px] mx-auto" />
 </div>
 {todayReadings.length === 1 ? (
 <div className="max-w-[560px] mx-auto">
 <ReadingPanel reading={todayReadings[0]} size="md" isDe={isDe} />
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[920px] mx-auto">
 {todayReadings.map((r, i) => (
 <ReadingPanel key={i} reading={r} size="md" isDe={isDe} />
 ))}
 </div>
 )}
 </div>
 </section>
 )}

 {/* GRID + DAY DETAIL */}
 <section className="px-5 md:px-8 py-10 md:py-14">
 <div className="mx-auto max-w-[1280px] w-full">
 <header className="flex items-end justify-between mb-8 gap-4 flex-wrap">
 <div className="min-w-0">
 <h2 className="font-display-serif text-[44px] md:text-[64px] text-paper leading-[0.95] tracking-[-0.01em]">
 {(isDe ? MONTH_NAMES_DE : MONTH_NAMES_EN)[month]}{" "}
 <span className="text-paper/55 font-normal">{year}</span>
 </h2>
 <p
 lang="grc"
 className="mt-2 font-serif uppercase tracking-[3px] text-[11.5px] text-gold/65 leading-none"
 style={{ fontFamily: "var(--font-greek), serif" }}
 >
 {greekMonthName(month)}
 </p>
 </div>
 <nav className="flex items-baseline gap-4">
 <Link
 href={prevMonthHref(year, month)}
 className="font-sans text-[12px] tracking-[0.5px] text-paper/65 hover:text-paper transition-colors"
 >
 {isDe ? "‹ Zurück" : "‹ Prev"}
 </Link>
 <span aria-hidden className="text-gold/35 text-[12px]">·</span>
 <Link
 href="/calendar"
 className="font-sans text-[12px] tracking-[0.5px] text-paper/85 hover:text-paper transition-colors"
 >
 {isDe ? "Heute" : "Today"}
 </Link>
 <span aria-hidden className="text-gold/35 text-[12px]">·</span>
 <Link
 href={nextMonthHref(year, month)}
 className="font-sans text-[12px] tracking-[0.5px] text-paper/65 hover:text-paper transition-colors"
 >
 {isDe ? "Weiter ›" : "Next ›"}
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
 dateLabel={formatLongDate(selectedDay)}
 tone={selectedTone}
 fast={selectedFast}
 commemorations={selectedCommemorations}
 locale={locale}
 readings={
 selectedReadings.length > 0 ? (
 /* Compact citation list, no verse teasers in the
 sticky day panel; the full verses are one tap
 away. Keeps the right column short so the left
 column doesn't leave a big empty rail. */
 <ul className="divide-y divide-paper/8 border-t border-b border-paper/10">
 {selectedReadings.map((r, i) => {
 const kindLabel = isDe
 ? r.ref.kind === "epistle"
 ? "Apostel"
 : r.ref.kind === "ot"
 ? "Altes Testament"
 : "Evangelium"
 : r.ref.kind === "epistle"
 ? "Epistle"
 : r.ref.kind === "ot"
 ? "Old Testament"
 : "Gospel";
 return (
 <li key={i}>
 <Link
 href={`/bible/${r.ref.book}/${r.ref.chapter}#v${r.ref.from}`}
 className="group flex items-baseline justify-between gap-3 py-2.5"
 >
 <span className="font-sans text-[10.5px] uppercase tracking-[2px] text-gold/75 font-semibold">
 {kindLabel}
 </span>
 <span className="font-display-serif text-[15px] text-paper group-hover:text-gold transition-colors text-right">
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
 <Colophon locale={locale} />
 <p className="mt-10 font-serif text-[13px] text-paper/55 leading-[1.7]">
 {isDe
 ? "Zwei Reckonungen stehen über die Umschaltung oben zur Verfügung. Die voreingestellte, Neue (Revidierte Julianische), wird vom Ökumenischen Patriarchat von Konstantinopel und der Mehrheit der kanonischen orthodoxen Jurisdiktionen für die festen Feste gebraucht. Die Alte (Julianische) Wahl wird von der russischen, serbischen, jerusalemischen und athonitischen Überlieferung gebraucht und steht für die festen Feste dreizehn Tage zurück. Pascha und sein beweglicher Zyklus sind beiden gemein, berechnet nach dem Julianisch gegründeten Algorithmus, der allen kanonischen orthodoxen Kirchen gemein ist."
 : "Two reckonings are available via the toggle above. The default, New (Revised Julian), is used by the Ecumenical Patriarchate of Constantinople and the majority of canonical Orthodox jurisdictions for fixed feasts. The Old (Julian) option is used by the Russian, Serbian, Jerusalem, and Athonite traditions, and runs thirteen days behind for fixed feasts. Pascha and its moveable cycle are shared between both, computed by the Julian-based algorithm common to every canonical Orthodox church."}
 </p>
 <p className="mt-3 font-sans text-[12px] text-paper/40 leading-[1.6]">
 {isDe
 ? "Die Fastenregeln sind eine vereinfachte Lesung gemeiner ostorthodoxer (griechischer) Praxis zur täglichen Orientierung. Die Anweisung deines Priesters hat in jeder einzelnen Frage Vorrang."
 : "Fasting rules are a simplified reading of common Eastern Orthodox (Greek tradition) practice for daily orientation. Your priest’s direction takes precedence for any individual question."}
 </p>
 </div>
 </section>
 </div>
 );
}
