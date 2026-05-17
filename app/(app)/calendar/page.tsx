import Link from "next/link";
import {
  commemorationsOn,
  fastingStatus,
  formatLongDate,
  formatMonthDay,
  formatMonthYear,
  monthGrid,
  paschaInfo,
  readingsOn,
  startOfDayUtc,
  type Commemoration,
  type FastKind,
  type ReadingRef,
} from "@/lib/calendar/orthodox";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { getSaint } from "@/lib/saints/saints";
import { loadVerseRange, type Verse } from "@/lib/bible/load";

export const metadata = {
  title: "Orthodox Calendar - Purify",
  description:
    "Today's saint, today's fast, and the month at a glance, following the New (Revised Julian) calendar.",
};

// Hourly ISR so today rolls forward without a redeploy.
export const revalidate = 3600;

type SearchParams = Promise<{ m?: string; d?: string }>;

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

function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

const FAST_STYLE: Record<FastKind, { bar: string; chip: string; dot: string }> = {
  strict:     { bar: "bg-[#c1272d]",   chip: "bg-[#c1272d]/15 border-[#c1272d]/40 text-[#f8cac7]",   dot: "bg-[#c1272d]" },
  "wine-oil": { bar: "bg-[#d4af37]",   chip: "bg-[#d4af37]/15 border-[#d4af37]/45 text-[#f4dc91]",   dot: "bg-[#d4af37]" },
  fish:       { bar: "bg-[#7b9b8f]",   chip: "bg-[#7b9b8f]/15 border-[#7b9b8f]/45 text-[#bfd6cc]",   dot: "bg-[#7b9b8f]" },
  fast:       { bar: "bg-paper/35",    chip: "bg-paper/[0.06] border-paper/20 text-paper/80",         dot: "bg-paper/35" },
  "fast-free":{ bar: "bg-emerald-500", chip: "bg-emerald-500/15 border-emerald-500/40 text-emerald-200", dot: "bg-emerald-500" },
  normal:     { bar: "bg-transparent", chip: "bg-paper/[0.04] border-paper/15 text-paper/70",         dot: "bg-paper/15" },
};

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

// Strip leading prefix labels so cell labels read at a glance.
function shortName(name: string): string {
  return name
    .replace(/^Holy\s+/i, "")
    .replace(/^St\.\s+/i, "")
    .replace(/^Hieromartyr\s+/i, "")
    .replace(/^Venerable-martyr\s+/i, "")
    .replace(/^Great-martyr\s+/i, "")
    .replace(/^Martyr\s+/i, "")
    .replace(/^Prophet\s+/i, "")
    .replace(/^Apostle\s+/i, "")
    .replace(/^Apostles\s+/i, "");
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
  const kindLabel = ref.kind === "epistle" ? "Epistle" : ref.kind === "ot" ? "Old Testament" : "Gospel";
  const accent =
    ref.kind === "gospel"
      ? "border-[#d4af37]/30 bg-[#d4af37]/[0.05]"
      : ref.kind === "epistle"
        ? "border-paper/15 bg-paper/[0.04]"
        : "border-paper/12 bg-paper/[0.04]";
  const firstVerse = passage?.verses?.[0];
  const moreVerses = (passage?.verses?.length ?? 0) > 1;
  const verseText = size === "sm" ? "text-[13.5px]" : "text-[14.5px] md:text-[15px]";
  const verseLeading = size === "sm" ? "leading-[1.5]" : "leading-[1.6]";
  return (
    <div className={`rounded-lg border p-4 md:p-5 ${accent}`}>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/55">
          {kindLabel}
        </p>
        <p className="font-sans text-[14px] font-semibold text-paper">
          {ref.label}
        </p>
      </div>
      {firstVerse ? (
        <p className={`font-serif text-paper/80 ${verseText} ${verseLeading} mt-2`}>
          <sup className="font-sans text-[10px] font-medium text-paper/40 tracking-[0.05em] mr-1.5 align-super">
            {firstVerse.n}
          </sup>
          {firstVerse.text}
          {moreVerses && <span className="text-paper/40">{" "}…</span>}
        </p>
      ) : (
        <p className="font-sans text-[13px] text-paper/45 italic mt-2">
          Verse text unavailable.
        </p>
      )}
      <Link
        href={`/bible/${ref.book}/${ref.chapter}#v${ref.from}`}
        className="mt-3 inline-block font-sans text-[12px] font-medium text-paper/70 hover:text-paper transition-colors"
      >
        Read full passage →
      </Link>
    </div>
  );
}

function CommemorationRow({ c }: { c: Commemoration }) {
  const saint = c.saint ?? (c.slug ? getSaint(c.slug) : null);
  const isFeast = c.kind === "feast";
  return (
    <div
      className={`flex items-start gap-3 rounded-md p-3 ${
        isFeast
          ? "bg-[#d4af37]/8 border border-[#d4af37]/25"
          : "bg-paper/[0.03] border border-paper/8"
      }`}
    >
      {saint ? (
        <SaintIcon saint={saint} size="sm" />
      ) : (
        <span
          aria-hidden
          className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-[14px] ${
            isFeast
              ? "bg-[#d4af37]/20 text-[#f4dc91] border border-[#d4af37]/40"
              : "bg-paper/[0.06] text-paper/60 border border-paper/15"
          }`}
        >
          {isFeast ? "✦" : "+"}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[14px] font-semibold text-paper leading-tight">
          {saint ? (
            <Link
              href={`/saints/${saint.slug}`}
              className="hover:underline underline-offset-2"
            >
              {c.name}
            </Link>
          ) : (
            c.name
          )}
        </p>
        {c.note && (
          <p className="mt-1 font-sans text-[12px] text-paper/60 leading-[1.5]">
            {c.note}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = startOfDayUtc(new Date());
  const { year, month } = parseMonthParam(params.m, today);

  const selectedDay =
    parseDayParam(params.d) ??
    (today.getUTCFullYear() === year && today.getUTCMonth() === month
      ? today
      : new Date(Date.UTC(year, month, 1, 12)));

  const todayCommemorations = commemorationsOn(today);
  const todayFast = fastingStatus(today);
  const pascha = paschaInfo(today);
  const grid = monthGrid(year, month, today);
  const selectedCommemorations = commemorationsOn(selectedDay);
  const selectedFast = fastingStatus(selectedDay);
  const headline =
    todayCommemorations.find((c) => c.kind === "feast") ?? todayCommemorations[0];
  const headlineSaint =
    headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);

  // Resolve today's and the selected day's lectionary readings in parallel.
  const [todayReadings, selectedReadings] = await Promise.all([
    resolveReadings(readingsOn(today)),
    resolveReadings(readingsOn(selectedDay)),
  ]);

  return (
    <div className="bg-night min-h-screen">
      {/* HERO STRIP */}
      <section className="px-5 md:px-8 pt-10 md:pt-14 pb-10 border-b border-white/8">
        <div className="mx-auto max-w-[1280px] w-full">
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
            Orthodox Calendar · Today
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-12 items-start">
            {/* Headline saint card */}
            <div className="rounded-lg border border-paper/12 bg-paper/[0.03] p-5 md:p-6">
              <p className="font-sans text-[13px] uppercase tracking-[1.2px] text-paper/55 mb-1">
                {formatLongDate(today)}
              </p>
              {headline ? (
                <>
                  <div className="mt-5 flex items-start gap-5">
                    {headlineSaint ? (
                      <div className="shrink-0">
                        <SaintIcon saint={headlineSaint} size="md" />
                      </div>
                    ) : (
                      <span
                        aria-hidden
                        className={`shrink-0 h-12 w-12 md:h-14 md:w-14 rounded-full flex items-center justify-center text-[20px] ${
                          headline.kind === "feast"
                            ? "bg-[#d4af37]/20 text-[#f4dc91] border border-[#d4af37]/40"
                            : "bg-paper/[0.06] text-paper/70 border border-paper/15"
                        }`}
                      >
                        {headline.kind === "feast" ? "✦" : "+"}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-[#d4af37]/85 mb-1">
                        Commemorated today
                      </p>
                      <h1 className="font-sans text-[20px] md:text-[26px] lg:text-[30px] font-bold text-paper leading-[1.1] tracking-[-0.015em]">
                        {headlineSaint ? (
                          <Link
                            href={`/saints/${headlineSaint.slug}`}
                            className="hover:underline underline-offset-2"
                          >
                            {headline.name}
                          </Link>
                        ) : (
                          headline.name
                        )}
                      </h1>
                      {headline.note && (
                        <p className="mt-2 font-serif text-[15px] md:text-[16px] text-paper/75 leading-[1.55]">
                          {headline.note}
                        </p>
                      )}
                    </div>
                  </div>
                  {todayCommemorations.length > 1 && (
                    <div className="mt-6 pt-5 border-t border-paper/8">
                      <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/45 mb-3">
                        Also today
                      </p>
                      <ul className="space-y-1.5">
                        {todayCommemorations.slice(1).map((c, i) => (
                          <li
                            key={i}
                            className="font-sans text-[13px] text-paper/75 leading-[1.5]"
                          >
                            <span className="text-paper">{c.name}</span>
                            {c.note && (
                              <span className="text-paper/45"> · {c.note}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-5 font-sans text-[14px] text-paper/60">
                  No saints indexed for this day yet.{" "}
                  <Link
                    href="/saints"
                    className="text-paper/85 hover:text-paper underline-offset-2 hover:underline"
                  >
                    Browse all saints →
                  </Link>
                </p>
              )}
            </div>

            {/* Side cards: fasting + Pascha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <div
                className={`rounded-lg border p-5 ${FAST_STYLE[todayFast.kind].chip}`}
              >
                <p className="font-sans text-[11px] uppercase tracking-[1.5px] opacity-75 mb-1">
                  Today&rsquo;s fast
                </p>
                <p className="font-sans text-[16px] md:text-[18px] font-semibold leading-tight">
                  {todayFast.label}
                </p>
                <p className="mt-2 font-sans text-[12.5px] opacity-90 leading-[1.55]">
                  {todayFast.rule}
                </p>
              </div>
              <div className="rounded-lg border border-paper/12 bg-paper/[0.03] p-5">
                <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/55 mb-1">
                  Pascha
                </p>
                <p className="font-sans text-[16px] md:text-[18px] font-semibold text-paper leading-tight">
                  {pascha.daysAway === 0
                    ? "Today"
                    : pascha.daysAway > 0
                      ? `${pascha.daysAway} days`
                      : "Passed"}
                </p>
                <p className="mt-2 font-sans text-[12.5px] text-paper/65 leading-[1.55]">
                  {pascha.daysAway > 0
                    ? `Until ${formatMonthDay(pascha.date)}, ${pascha.date.getUTCFullYear()}`
                    : pascha.label}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TODAY'S READINGS */}
      {todayReadings.length > 0 && (
        <section className="px-5 md:px-8 py-10 md:py-12 border-b border-white/8 bg-night-soft">
          <div className="mx-auto max-w-[1280px] w-full">
            <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
              <div>
                <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55">
                  Today&rsquo;s readings
                </p>
                <h2 className="mt-1 font-sans text-[18px] md:text-[22px] font-bold text-paper tracking-[-0.02em]">
                  The Word for {formatMonthDay(today)}
                </h2>
              </div>
              <p className="font-sans text-[12px] text-paper/45 max-w-[420px]">
                Paired with the day&rsquo;s commemoration. Major fixed feasts carry
                their proper liturgical readings.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <header className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <h2 className="font-sans text-[20px] md:text-[26px] font-bold text-paper tracking-[-0.02em]">
              {formatMonthYear(year, month)}
            </h2>
            <nav className="flex items-center gap-2">
              <Link
                href={prevMonthHref(year, month)}
                className="rounded-pill border border-paper/15 bg-paper/[0.04] px-3.5 py-2 font-sans text-[13px] font-medium text-paper/85 hover:bg-paper/10 hover:border-paper/30 transition-colors"
              >
                ‹ Prev
              </Link>
              <Link
                href="/calendar"
                className="rounded-pill border border-paper/15 bg-paper/[0.04] px-3.5 py-2 font-sans text-[13px] font-medium text-paper/85 hover:bg-paper/10 hover:border-paper/30 transition-colors"
              >
                Today
              </Link>
              <Link
                href={nextMonthHref(year, month)}
                className="rounded-pill border border-paper/15 bg-paper/[0.04] px-3.5 py-2 font-sans text-[13px] font-medium text-paper/85 hover:bg-paper/10 hover:border-paper/30 transition-colors"
              >
                Next ›
              </Link>
            </nav>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 lg:gap-10 items-start">
            {/* Month grid */}
            <div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="font-sans text-[10.5px] font-semibold uppercase tracking-[1.5px] text-paper/45 text-center"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {grid.map((cell, i) => {
                  const dayIso = isoDate(cell.date);
                  const isSelected =
                    cell.date.getUTCFullYear() === selectedDay.getUTCFullYear() &&
                    cell.date.getUTCMonth() === selectedDay.getUTCMonth() &&
                    cell.date.getUTCDate() === selectedDay.getUTCDate();
                  const label = cell.headline ? shortName(cell.headline.name) : "";
                  return (
                    <Link
                      key={i}
                      href={`/calendar?m=${year}-${String(month + 1).padStart(2, "0")}&d=${dayIso}`}
                      scroll={false}
                      className={`relative aspect-square min-h-[60px] md:min-h-[80px] rounded-md flex flex-col text-left p-1.5 transition-colors duration-150 overflow-hidden ${
                        !cell.inMonth
                          ? "text-paper/25 bg-transparent border border-transparent"
                          : isSelected
                            ? "bg-paper/15 text-paper border-2 border-paper/55"
                            : cell.isToday
                              ? "bg-[#d4af37]/15 text-paper border border-[#d4af37]/45"
                              : cell.hasFeast
                                ? "bg-[#d4af37]/[0.06] text-paper/85 border border-[#d4af37]/25 hover:bg-[#d4af37]/12 hover:border-[#d4af37]/40"
                                : "bg-paper/[0.03] text-paper/85 border border-paper/8 hover:bg-paper/10 hover:border-paper/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-sans text-[13px] md:text-[14px] font-semibold leading-none ${cell.isToday ? "text-[#f4dc91]" : ""}`}
                        >
                          {cell.day}
                        </span>
                        {cell.inMonth && cell.hasFeast && (
                          <span
                            aria-label="Major feast"
                            className="text-[10px] text-[#d4af37]"
                          >
                            ✦
                          </span>
                        )}
                      </div>
                      {cell.inMonth && label && (
                        <span className="mt-auto font-sans text-[9.5px] md:text-[10.5px] leading-[1.2] text-paper/65 line-clamp-2 break-words">
                          {label}
                        </span>
                      )}
                      {cell.inMonth && cell.fast !== "normal" && (
                        <span
                          aria-hidden
                          className={`absolute left-0 right-0 bottom-0 h-[3px] ${FAST_STYLE[cell.fast].bar}`}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-sans text-[11.5px] text-paper/55">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#d4af37]">✦</span>
                  Major feast
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-[3px] w-3 bg-[#c1272d] rounded-full" />
                  Strict fast
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-[3px] w-3 bg-[#d4af37] rounded-full" />
                  Wine and oil
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-[3px] w-3 bg-[#7b9b8f] rounded-full" />
                  Fish allowed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-[3px] w-3 bg-emerald-500 rounded-full" />
                  Fast-free
                </span>
              </div>
            </div>

            {/* Selected day detail (sticky on lg+) */}
            <aside className="lg:sticky lg:top-[88px]">
              <div className="rounded-lg border border-paper/12 bg-paper/[0.03] p-5">
                <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/55 mb-1">
                  Selected day
                </p>
                <h3 className="font-sans text-[20px] md:text-[22px] font-bold text-paper tracking-[-0.01em] leading-tight">
                  {formatLongDate(selectedDay)}
                </h3>

                <div
                  className={`mt-4 rounded-md border p-3.5 ${FAST_STYLE[selectedFast.kind].chip}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${FAST_STYLE[selectedFast.kind].dot}`}
                    />
                    <p className="font-sans text-[13.5px] font-semibold">
                      {selectedFast.label}
                    </p>
                  </div>
                  <p className="mt-1.5 font-sans text-[12px] opacity-90 leading-[1.5]">
                    {selectedFast.rule}
                  </p>
                </div>

                <p className="mt-5 font-sans text-[11px] uppercase tracking-[1.5px] text-paper/55 mb-3">
                  Commemorations
                </p>
                {selectedCommemorations.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedCommemorations.map((c, i) => (
                      <li key={i}>
                        <CommemorationRow c={c} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-sans text-[13px] text-paper/55">
                    No commemoration listed for this day.
                  </p>
                )}

                {selectedReadings.length > 0 && (
                  <>
                    <p className="mt-5 font-sans text-[11px] uppercase tracking-[1.5px] text-paper/55 mb-3">
                      Readings
                    </p>
                    <ul className="space-y-2">
                      {selectedReadings.map((r, i) => (
                        <li key={i}>
                          <ReadingPanel reading={r} size="sm" />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* FOOTNOTE */}
      <section className="px-5 md:px-8 py-10 border-t border-white/8 bg-night-soft">
        <div className="mx-auto max-w-[860px] w-full">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
            About this calendar
          </p>
          <p className="font-sans text-[13px] text-paper/65 leading-[1.65]">
            This calendar follows the New (Revised Julian) reckoning used by
            the Ecumenical Patriarchate of Constantinople and the majority of
            canonical Orthodox jurisdictions for fixed feasts. Pascha and its
            moveable cycle are computed by the Julian-based algorithm shared
            by all canonical Orthodox churches. An Old-Calendar (Julian) toggle
            for the Russian, Serbian, Jerusalem, and Athonite traditions is on
            the roadmap.
          </p>
          <p className="font-sans text-[12px] text-paper/45 mt-3 leading-[1.6]">
            Fasting rules are a simplified reading of common Eastern Orthodox
            (Greek tradition) practice for daily orientation. Your priest&rsquo;s
            direction takes precedence for any individual question.
          </p>
        </div>
      </section>
    </div>
  );
}
