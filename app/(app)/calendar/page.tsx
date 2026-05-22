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
import { FeastPanel } from "@/components/calendar/FeastPanel";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { DayScroll } from "@/components/calendar/DayScroll";
import { OrnamentRule } from "@/components/calendar/OrnamentRule";
import { OrnamentHeadpiece } from "@/components/calendar/OrnamentHeadpiece";
import { Colophon } from "@/components/calendar/Colophon";
import { SectionLabel } from "@/components/calendar/SectionLabel";

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
}: {
  reading: ResolvedReading;
  size?: "sm" | "md";
}) {
  const { ref, passage } = reading;
  const kindLabel =
    ref.kind === "epistle"
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
    <div className={`rounded-lg border p-4 md:p-5 ${accent}`}>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-gold/70">
          {kindLabel}
        </p>
        <p className="font-sans text-[14px] font-semibold text-paper">
          {ref.label}
        </p>
      </div>
      {firstVerse ? (
        <p className={`font-serif text-paper/80 ${verseText} leading-[1.6] mt-2`}>
          <sup className="font-sans text-[10px] font-medium text-paper/40 tracking-[0.05em] mr-1.5 align-super">
            {firstVerse.n}
          </sup>
          {firstVerse.text}
          {moreVerses && <span className="text-paper/40"> …</span>}
        </p>
      ) : (
        <p className="font-sans text-[13px] text-paper/45 italic mt-2">
          Verse text unavailable.
        </p>
      )}
      <Link
        href={`/bible/${ref.book}/${ref.chapter}#v${ref.from}`}
        className="mt-3 inline-block font-sans text-[12px] font-medium text-gold/80 hover:text-gold transition-colors"
      >
        Read full passage →
      </Link>
    </div>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const style: CalStyle = params.style === "old" ? "old" : "new";
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
      ? "Today"
      : pascha.daysAway > 0
        ? `${pascha.daysAway} days`
        : "Passed";
  const paschaSecondary =
    pascha.daysAway > 0
      ? `Until ${formatMonthDay(pascha.date)}, ${pascha.date.getUTCFullYear()}`
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
          <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
            <SectionLabel>Orthodox Calendar · Today</SectionLabel>
            {/* Kalendrium-style style toggle — typographic, not a pill. */}
            <div className="inline-flex flex-col items-end">
              <p className="font-sans text-[10px] uppercase tracking-[2px] text-gold/65 mb-1">
                Reckoning
              </p>
              <div className="inline-flex items-baseline gap-3 border-b border-gold/25 pb-1">
                <Link
                  href={newStyleHref}
                  aria-current={style === "new" ? "true" : undefined}
                  className={`font-sans text-[12px] tracking-[0.5px] transition-colors ${
                    style === "new"
                      ? "kalendrium-active"
                      : "text-paper/55 hover:text-paper"
                  }`}
                >
                  New (Revised Julian)
                </Link>
                <span aria-hidden className="text-gold/35 text-[12px]">
                  ·
                </span>
                <Link
                  href={oldStyleHref}
                  aria-current={style === "old" ? "true" : undefined}
                  className={`font-sans text-[12px] tracking-[0.5px] transition-colors ${
                    style === "old"
                      ? "kalendrium-active"
                      : "text-paper/55 hover:text-paper"
                  }`}
                >
                  Old (Julian)
                </Link>
              </div>
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
            <p className="mt-4 font-serif italic text-[12.5px] text-paper/55 text-right max-w-[1280px]">
              On the Old (Julian) calendar, today&rsquo;s liturgical date is
              thirteen days behind the civil date. Both are shown above.
            </p>
          )}
        </div>
      </section>

      {/* TODAY'S READINGS */}
      {todayReadings.length > 0 && (
        <section className="px-5 md:px-8 py-10 md:py-12 border-b border-white/8 bg-night-soft">
          <div className="mx-auto max-w-[1280px] w-full">
            <div className="text-center mb-7">
              <SectionLabel>Today&rsquo;s readings</SectionLabel>
              <h2 className="mt-2 font-display-serif text-[24px] md:text-[30px] text-paper">
                The Word for {formatMonthDay(today)}
              </h2>
              <OrnamentRule className="mt-4 max-w-[420px] mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[920px] mx-auto">
              {todayReadings.map((r, i) => (
                <ReadingPanel key={i} reading={r} size="md" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GRID + DAY DETAIL */}
      <section className="px-5 md:px-8 py-10 md:py-14">
        <div className="mx-auto max-w-[1280px] w-full">
          {/* Bilingual headpiece for the month */}
          <div className="text-center mb-2">
            <OrnamentHeadpiece className="mx-auto max-w-[480px]" tinted />
          </div>
          <header className="flex items-end justify-between mb-6 gap-4 flex-wrap">
            <div className="min-w-0">
              <p
                lang="grc"
                className="font-serif uppercase tracking-[3px] text-[12px] md:text-[13px] text-gold/80 leading-none"
                style={{ fontFamily: "var(--font-greek), serif" }}
              >
                {greekMonthName(month)} · {String(year)}
              </p>
              <h2 className="mt-2 font-display-serif text-[30px] md:text-[40px] text-paper leading-[1.05]">
                {[
                  "January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December",
                ][month]}{" "}
                {year}
              </h2>
            </div>
            <nav className="flex items-baseline gap-4 border-b border-gold/25 pb-1">
              <Link
                href={prevMonthHref(year, month)}
                className="font-sans text-[12px] tracking-[0.5px] text-paper/65 hover:text-paper transition-colors"
              >
                ‹ Prev
              </Link>
              <span aria-hidden className="text-gold/35 text-[12px]">·</span>
              <Link
                href="/calendar"
                className="font-sans text-[12px] tracking-[0.5px] text-paper/85 hover:text-paper transition-colors"
              >
                Today
              </Link>
              <span aria-hidden className="text-gold/35 text-[12px]">·</span>
              <Link
                href={nextMonthHref(year, month)}
                className="font-sans text-[12px] tracking-[0.5px] text-paper/65 hover:text-paper transition-colors"
              >
                Next ›
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
                readings={
                  selectedReadings.length > 0 ? (
                    <ul className="space-y-2.5">
                      {selectedReadings.map((r, i) => (
                        <li key={i}>
                          <ReadingPanel reading={r} size="sm" />
                        </li>
                      ))}
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
          <p className="mt-10 font-serif text-[13px] text-paper/55 leading-[1.7]">
            Two reckonings are available via the toggle above. The default,
            New (Revised Julian), is used by the Ecumenical Patriarchate of
            Constantinople and the majority of canonical Orthodox jurisdictions
            for fixed feasts. The Old (Julian) option is used by the Russian,
            Serbian, Jerusalem, and Athonite traditions, and runs thirteen days
            behind for fixed feasts. Pascha and its moveable cycle are shared
            between both, computed by the Julian-based algorithm common to
            every canonical Orthodox church.
          </p>
          <p className="mt-3 font-sans text-[12px] text-paper/40 leading-[1.6]">
            Fasting rules are a simplified reading of common Eastern Orthodox
            (Greek tradition) practice for daily orientation. Your priest&rsquo;s
            direction takes precedence for any individual question.
          </p>
        </div>
      </section>
    </div>
  );
}
