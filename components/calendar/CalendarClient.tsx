"use client";

// The calendar, resolved on the device.
//
// WHY THIS IS A CLIENT COMPONENT, and why it must stay one.
//
// Under `output: "export"` there is no server. A server component answers
// "what day is it" once, at build time, and the APK then shows the build day
// for the life of the install. This page also read `searchParams`, which the
// export forces empty, so on Android and iOS neither `?today=` nor month
// navigation ever reached it: /calendar was frozen on the build day AND the
// build month, and the only way to move it was to ship a new build.
//
// Today, the Bible tab and /prayers/today were all moved to the client date
// path in Beta 2.7. The calendar was the one that was not, and
// lib/calendar/__tests__/noFrozenDay.test.ts carried a named exemption saying
// so. That exemption is deleted with this file's arrival.
//
// The blocker recorded at the time was the verse teaser: it printed the
// appointed passage, which is read by `server-only` code with no filesystem on
// device, and unlike the Verse of the Day there is no bounded window to
// precompute because the reader can select ANY day. The teaser is gone. The
// readings band now shows citations and a link, which is what the sticky day
// panel and the Bible tab's appointed-readings block already do deliberately.
//
// Everything else here is pure computation over bundled JSON, and
// lib/calendar/useChurchDay.ts already imports exactly these functions into
// the client for ChurchTodayRail, so the corpus chunk is already loaded by the
// time a reader reaches this screen. Nothing here touches the network.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import {
  commemorationsOn,
  currentSeason,
  fastingStatus,
  formatLongDateDual,
  greekMonthName,
  isoDay,
  monthGrid,
  paschaInfo,
  readingsOn,
  shiftForStyle,
  type ReadingRef,
} from "@/lib/calendar/orthodox";
import { getSaint } from "@/lib/saints/saints";
import { calendarPageVars, toneFor } from "@/lib/calendar/tone";
import { useToday } from "@/lib/calendar/useToday";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { FeastPanel } from "@/components/calendar/FeastPanel";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton";
import { DayScroll } from "@/components/calendar/DayScroll";
import { OrnamentRule } from "@/components/calendar/OrnamentRule";
import { Colophon } from "@/components/calendar/Colophon";
import { SectionLabel } from "@/components/calendar/SectionLabel";
import StyleToggleLink from "@/components/calendar/StyleToggleLink";
import { T } from "@/components/i18n/T";
import { useTranslate } from "@/components/i18n/MessagesProvider";

type CalStyle = "new" | "old";

function parseMonthParam(m: string | null, fallback: Date) {
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

function parseDayParam(d: string | null): Date | null {
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

/**
 * One appointed reading, as a citation and a way in.
 *
 * This used to print the first verse of the passage. That text comes from
 * lib/bible/load.ts, which is `server-only` and reads the filesystem, and it
 * was the single thing keeping this whole screen on the server and therefore
 * frozen in the app. The sticky day panel already showed citations only, on
 * purpose, and so does the Bible tab; this now matches them. The passage is
 * one tap away and the tap target says so.
 */
function ReadingCard({ reading: r }: { reading: ReadingRef }) {
  const kindKey =
    r.kind === "epistle"
      ? "bible.kindEpistleLong"
      : r.kind === "ot"
        ? "bible.kindOtLong"
        : "bible.kindGospelLong";
  const accent =
    r.kind === "gospel"
      ? "border-gold/30 bg-gold/[0.05]"
      : "border-paper/12 bg-paper/[0.03]";
  return (
    <Link
      href={`/bible/${r.book}/${r.chapter}#v${r.from}`}
      className={`group rounded-lg border p-5 md:p-6 ${accent} flex flex-col h-full min-h-[44px] transition-colors hover:border-paper/25`}
    >
      <p className="font-sans text-eyebrow uppercase tracking-[2px] text-gold font-semibold leading-none">
        <T k={kindKey} />
      </p>
      <p className="mt-2 font-display-serif text-lede text-paper leading-tight">
        {r.label}
      </p>
      <span className="mt-auto pt-4 inline-block font-sans text-caption font-medium text-gold group-hover:text-gold-soft transition-colors">
        <T k="calendar.readFullPassage" /> →
      </span>
    </Link>
  );
}

export function CalendarClient() {
  const { locale } = useTranslate();
  const params = useSearchParams();
  // The reader's own local day, resolved after mount. Null for the first
  // frame, which is the whole point: a value baked at build time is the bug
  // this component exists to fix.
  const today = useToday();
  const [persistedStyle] = useCalendarStyleDefault();

  const styleParam = params?.get("style") ?? null;
  const style: CalStyle =
    styleParam === "old"
      ? "old"
      : styleParam === "new"
        ? "new"
        : persistedStyle === "old"
          ? "old"
          : "new";

  const mParam = params?.get("m") ?? null;
  const dParam = params?.get("d") ?? null;

  const view = useMemo(() => {
    if (!today) return null;
    // useToday already hands back the reader's local day mapped to UTC noon
    // (startOfDayLocal), which is the frame every lookup here expects. Do not
    // re-normalise it: useChurchDay consumes it raw for the same reason, and
    // rebuilding the Date would throw away the stable identity useToday keeps
    // on purpose.
    const day = today;
    const { year, month } = parseMonthParam(mParam, day);
    const selectedDay =
      parseDayParam(dParam) ??
      (day.getUTCFullYear() === year && day.getUTCMonth() === month
        ? day
        : new Date(Date.UTC(year, month, 1, 12)));

    // Lookups use the style-shifted date; display strings use the real date.
    const todayLookup = shiftForStyle(day, style);
    const selectedLookup = shiftForStyle(selectedDay, style);

    const todayCommemorations = commemorationsOn(todayLookup);
    const todayFast = fastingStatus(todayLookup);
    const selectedCommemorations = commemorationsOn(selectedLookup);
    const selectedFast = fastingStatus(selectedLookup);
    const headline =
      todayCommemorations.find((c) => c.kind === "feast") ??
      todayCommemorations[0] ??
      null;

    return {
      day,
      year,
      month,
      selectedDay,
      todayCommemorations,
      todayFast,
      selectedCommemorations,
      selectedFast,
      headline,
      headlineSaint:
        headline?.saint ??
        (headline?.slug ? getSaint(headline.slug) : null) ??
        null,
      pascha: paschaInfo(day),
      grid: monthGrid(year, month, day),
      // NOTE, carried over unchanged and worth a second pair of eyes: these
      // read from the STYLE-SHIFTED date, which is what this page has always
      // done. lib/calendar/useChurchDay.ts deliberately does the opposite,
      // `readingsOn(today)` on the civil date, and its docblock explains why:
      // both styles compute Pascha from the same Julian algorithm, so shifting
      // the readings moves the paschal cycle twice. The two therefore disagree
      // for an Old Calendar reader, which is precisely the class of drift
      // useChurchDay was extracted to end. Behaviour is preserved here rather
      // than corrected, because which readings an Old Calendar reader is shown
      // is an editorial call, not a refactor.
      todayRefs: readingsOn(todayLookup),
      selectedRefs: readingsOn(selectedLookup),
      season: currentSeason(day),
    };
  }, [today, mParam, dParam, style]);

  // Locale-aware date pieces. Formatters are built once per locale, not per
  // call: constructing an Intl.DateTimeFormat is expensive and this used to
  // make three of them on every render.
  const fmt = useMemo(
    () => ({
      month: new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }),
      monthDay: new Intl.DateTimeFormat(locale, {
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }),
      weekday: new Intl.DateTimeFormat(locale, {
        weekday: "long",
        timeZone: "UTC",
      }),
    }),
    [locale],
  );

  if (!view) return <CalendarSkeleton />;

  const {
    day,
    year,
    month,
    selectedDay,
    todayCommemorations,
    todayFast,
    selectedCommemorations,
    selectedFast,
    headline,
    headlineSaint,
    pascha,
    grid,
    todayRefs,
    selectedRefs,
    season,
  } = view;

  const monthName = (m: number) => fmt.month.format(new Date(Date.UTC(2000, m, 1)));
  const monthDay = (d: Date) => fmt.monthDay.format(d);
  const weekdayName = (d: Date) => fmt.weekday.format(d);

  const todayTone = toneFor({
    hasFeast: todayCommemorations.some((c) => c.kind === "feast"),
    fast: todayFast.kind,
  });
  const selectedTone = toneFor({
    hasFeast: selectedCommemorations.some((c) => c.kind === "feast"),
    fast: selectedFast.kind,
  });

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

  // Toggle hrefs preserve month/day and flip style. Both carry an explicit
  // style: without it a persisted "old" preference silently wins over the New
  // toggle and the switch appears stuck (community report).
  const baseQS = new URLSearchParams();
  if (mParam) baseQS.set("m", mParam);
  if (dParam) baseQS.set("d", dParam);
  const newQS = new URLSearchParams(baseQS);
  newQS.set("style", "new");
  const oldQS = new URLSearchParams(baseQS);
  oldQS.set("style", "old");

  return (
    <div
      className="bg-night min-h-dvh menaion-surface"
      data-season={season?.label ?? undefined}
      style={calendarPageVars(todayTone, season)}
    >
      {/* HERO */}
      <section className="px-5 md:px-8 pt-10 md:pt-14 pb-10 border-b border-paper/10">
        <div className="mx-auto max-w-[1280px] w-full">
          <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
            <SectionLabel>
              <T k="calendar.heroEyebrow" />
            </SectionLabel>
            <div className="inline-flex items-baseline gap-3">
              <StyleToggleLink
                href={`/calendar?${newQS.toString()}`}
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
              <span aria-hidden className="text-gold/35 text-caption">
                ·
              </span>
              <StyleToggleLink
                href={`/calendar?${oldQS.toString()}`}
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
            dateLabel={formatLongDateDual(day, style)}
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
      {todayRefs.length > 0 && (
        <section className="px-5 md:px-8 py-10 md:py-12 border-b border-paper/10 bg-night-soft">
          <div className="mx-auto max-w-[1280px] w-full">
            <div className="text-center mb-7">
              <SectionLabel>
                <T k="calendar.todaysReadings" />
              </SectionLabel>
              <h2 className="mt-2 font-display-serif text-title-sm md:text-heading text-paper">
                <T k="calendar.wordFor" replacements={{ date: monthDay(day) }} />
              </h2>
              <OrnamentRule className="mt-4 max-w-[420px] mx-auto" />
            </div>
            {todayRefs.length === 1 ? (
              <div className="max-w-[560px] mx-auto">
                <ReadingCard reading={todayRefs[0]} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[920px] mx-auto">
                {todayRefs.map((r, i) => (
                  <ReadingCard key={i} reading={r} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* GRID + DAY DETAIL, on one recessed surface edge to edge, so the block
          reads as set into the page rather than stacked on it. See the note on
          --color-night-deep in globals.css for why this is not bg-black. */}
      <section className="px-5 md:px-8 py-10 md:py-14 bg-night-deep">
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
              <span aria-hidden className="text-gold/35 text-caption">
                ·
              </span>
              <Link
                href="/calendar"
                className="font-sans text-caption tracking-[0.5px] text-paper/85 hover:text-paper transition-colors"
              >
                <T k="calendar.todayLink" />
              </Link>
              <span aria-hidden className="text-gold/35 text-caption">
                ·
              </span>
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
              selectedIso={isoDay(selectedDay)}
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
                  selectedRefs.length > 0 ? (
                    <ul className="divide-y divide-paper/8 border-t border-b border-paper/10">
                      {selectedRefs.map((r, i) => {
                        const kindKey =
                          r.kind === "epistle"
                            ? "bible.kindEpistleLong"
                            : r.kind === "ot"
                              ? "bible.kindOtLong"
                              : "bible.kindGospelLong";
                        return (
                          <li key={i}>
                            <Link
                              href={`/bible/${r.book}/${r.chapter}#v${r.from}`}
                              className="group flex items-baseline justify-between gap-3 py-2.5"
                            >
                              <span className="font-sans text-eyebrow uppercase tracking-[2px] text-gold font-semibold">
                                <T k={kindKey} />
                              </span>
                              <span className="font-display-serif text-ui text-paper group-hover:text-gold transition-colors text-right">
                                {r.label}
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
