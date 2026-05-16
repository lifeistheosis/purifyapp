import Link from "next/link";
import {
  fastingStatus,
  feastsOn,
  formatLongDate,
  formatMonthYear,
  monthGrid,
  paschaInfo,
  startOfDayUtc,
  type FastKind,
} from "@/lib/calendar/orthodox";
import { SaintIcon } from "@/components/saints/SaintIcon";

export const metadata = {
  title: "Orthodox Calendar - Purify",
  description:
    "Today's saint, today's fast, and the month at a glance, following the New (Revised Julian) calendar.",
};

// Auto-refresh once per hour at the edge so today rolls forward without
// a redeploy. The page also reads new Date() at render time.
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

const FAST_STYLE: Record<FastKind, { dot: string; pill: string }> = {
  strict:    { dot: "bg-[#c1272d]",     pill: "bg-[#c1272d]/20 border-[#c1272d]/40 text-[#f8cac7]" },
  "wine-oil":{ dot: "bg-[#d4af37]",     pill: "bg-[#d4af37]/20 border-[#d4af37]/45 text-[#f4dc91]" },
  fish:      { dot: "bg-[#7b9b8f]",     pill: "bg-[#7b9b8f]/20 border-[#7b9b8f]/45 text-[#bfd6cc]" },
  fast:      { dot: "bg-paper/40",      pill: "bg-paper/[0.06] border-paper/20 text-paper/80" },
  "fast-free":{dot: "bg-emerald-500",   pill: "bg-emerald-500/15 border-emerald-500/40 text-emerald-200" },
  normal:    { dot: "bg-transparent border border-paper/15", pill: "bg-paper/[0.04] border-paper/15 text-paper/70" },
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

  const todaysSaints = feastsOn(today);
  const todaysFast = fastingStatus(today);
  const pascha = paschaInfo(today);
  const grid = monthGrid(year, month, today);
  const selectedSaints = feastsOn(selectedDay);
  const selectedFast = fastingStatus(selectedDay);

  return (
    <div className="bg-night">
      {/* HERO STRIP */}
      <section className="px-5 md:px-8 pt-12 md:pt-16 pb-10 border-b border-white/8">
        <div className="mx-auto max-w-[1200px] w-full">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
            Orthodox Calendar
          </p>
          <h1 className="font-sans text-[36px] md:text-[52px] font-bold text-paper tracking-[-0.025em] leading-[1.05]">
            {formatLongDate(today)}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-pill border px-4 py-2 font-sans text-[13px] font-medium ${FAST_STYLE[todaysFast.kind].pill}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${FAST_STYLE[todaysFast.kind].dot}`}
              />
              {todaysFast.label}
            </span>
            <span className="font-sans text-[14px] text-paper/65">
              {pascha.label}
            </span>
          </div>

          <p className="mt-3 font-sans text-[14px] text-paper/65 max-w-[640px] leading-[1.55]">
            {todaysFast.rule}
          </p>

          <div className="mt-10">
            <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
              Commemorated today
            </p>
            {todaysSaints.length > 0 ? (
              <ul className="flex flex-wrap gap-3">
                {todaysSaints.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/saints/${s.slug}`}
                      className="group flex items-center gap-3 rounded-pill border border-paper/15 bg-paper/[0.04] hover:bg-paper/10 hover:border-paper/30 transition-colors duration-150 pr-5 pl-2 py-2"
                    >
                      <SaintIcon saint={s} size="sm" />
                      <span>
                        <span className="block font-sans text-[14px] font-semibold text-paper">
                          {s.name}
                        </span>
                        {s.byname && (
                          <span className="block font-serif text-[12px] italic text-[#d4af37]/90">
                            &ldquo;{s.byname}&rdquo;
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-sans text-[14px] text-paper/55">
                No saint in our index for this day yet.{" "}
                <Link
                  href="/saints"
                  className="text-paper/85 hover:text-paper underline-offset-2 hover:underline"
                >
                  Browse all saints →
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* MONTH GRID */}
      <section className="px-5 md:px-8 py-12 md:py-16">
        <div className="mx-auto max-w-[1200px] w-full">
          <header className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <h2 className="font-sans text-[24px] md:text-[32px] font-bold text-paper tracking-[-0.02em]">
              {formatMonthYear(year, month)}
            </h2>
            <nav className="flex items-center gap-2">
              <Link
                href={prevMonthHref(year, month)}
                className="rounded-pill border border-paper/15 bg-paper/[0.04] px-4 py-2 font-sans text-[13px] font-medium text-paper/85 hover:bg-paper/10 hover:border-paper/30 transition-colors"
              >
                ← Prev
              </Link>
              <Link
                href="/calendar"
                className="rounded-pill border border-paper/15 bg-paper/[0.04] px-4 py-2 font-sans text-[13px] font-medium text-paper/85 hover:bg-paper/10 hover:border-paper/30 transition-colors"
              >
                Today
              </Link>
              <Link
                href={nextMonthHref(year, month)}
                className="rounded-pill border border-paper/15 bg-paper/[0.04] px-4 py-2 font-sans text-[13px] font-medium text-paper/85 hover:bg-paper/10 hover:border-paper/30 transition-colors"
              >
                Next →
              </Link>
            </nav>
          </header>

          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45 text-center"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {grid.map((cell, i) => {
              const isoDate = `${cell.date.getUTCFullYear()}-${String(cell.date.getUTCMonth() + 1).padStart(2, "0")}-${String(cell.date.getUTCDate()).padStart(2, "0")}`;
              const isSelected =
                cell.date.getUTCFullYear() === selectedDay.getUTCFullYear() &&
                cell.date.getUTCMonth() === selectedDay.getUTCMonth() &&
                cell.date.getUTCDate() === selectedDay.getUTCDate();
              return (
                <Link
                  key={i}
                  href={`/calendar?m=${year}-${String(month + 1).padStart(2, "0")}&d=${isoDate}`}
                  scroll={false}
                  className={`relative aspect-square rounded-md flex flex-col items-center justify-center text-center transition-colors duration-150 ${
                    !cell.inMonth
                      ? "text-paper/25 bg-transparent"
                      : isSelected
                        ? "bg-paper/15 text-paper border border-paper/40"
                        : cell.isToday
                          ? "bg-[#d4af37]/20 text-paper border border-[#d4af37]/45"
                          : "bg-paper/[0.04] text-paper/85 border border-paper/8 hover:bg-paper/10 hover:border-paper/20"
                  }`}
                >
                  <span className="font-sans text-[15px] font-medium leading-none">
                    {cell.day}
                  </span>
                  <div className="mt-1.5 flex items-center gap-1 h-2">
                    {cell.saints.length > 0 && (
                      <span
                        aria-label="Saint commemorated"
                        className="block h-1.5 w-1.5 rounded-full bg-[#d4af37]"
                      />
                    )}
                    {cell.inMonth && cell.fast !== "normal" && (
                      <span
                        aria-label={`Fast: ${cell.fast}`}
                        className={`block h-1.5 w-1.5 rounded-full ${FAST_STYLE[cell.fast].dot}`}
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-4 font-sans text-[12px] text-paper/55">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
              Saint commemorated
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c1272d]" />
              Strict fast
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7b9b8f]" />
              Fish allowed
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Fast-free
            </span>
          </div>
        </div>
      </section>

      {/* SELECTED DAY DETAIL */}
      <section className="px-5 md:px-8 py-12 bg-night-soft border-t border-white/8">
        <div className="mx-auto max-w-[1200px] w-full">
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
            Selected day
          </p>
          <h2 className="font-sans text-[24px] md:text-[28px] font-bold text-paper tracking-[-0.02em] mb-5">
            {formatLongDate(selectedDay)}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
            <div>
              <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
                Commemorations
              </p>
              {selectedSaints.length > 0 ? (
                <ul className="space-y-3">
                  {selectedSaints.map((s) => (
                    <li key={s.slug}>
                      <Link
                        href={`/saints/${s.slug}`}
                        className="group flex items-start gap-4 rounded-md border border-paper/10 bg-paper/[0.04] p-4 hover:border-paper/25 transition-colors"
                      >
                        <SaintIcon saint={s} size="sm" />
                        <div className="min-w-0">
                          <p className="font-sans text-[15px] font-semibold text-paper leading-tight">
                            {s.name}
                          </p>
                          <p className="font-sans text-[12px] text-paper/55 mt-1">
                            {s.epithet}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-sans text-[14px] text-paper/55">
                  No saint in our index for this day yet.
                </p>
              )}
            </div>

            <aside>
              <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
                Fasting
              </p>
              <div
                className={`rounded-md border p-4 ${FAST_STYLE[selectedFast.kind].pill}`}
              >
                <p className="font-sans text-[15px] font-semibold mb-1">
                  {selectedFast.label}
                </p>
                <p className="font-sans text-[13px] opacity-90 leading-[1.55]">
                  {selectedFast.rule}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* FOOTNOTE */}
      <section className="px-5 md:px-8 py-10 border-t border-white/8">
        <div className="mx-auto max-w-[860px] w-full">
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
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
