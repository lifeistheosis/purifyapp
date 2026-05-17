import Link from "next/link";
import { currentSeason, startOfDayUtc } from "@/lib/calendar/orthodox";

/**
 * Auto-surfacing liturgical season banner. Hidden in ordinary time;
 * appears with the season name + sub-theme + a short blurb during
 * Great Lent, Holy Week, Bright Week, Pre-Lent, the Apostles' Fast,
 * the Dormition Fast, the Nativity Fast, and the Twelve Days of
 * Christmas. Server component.
 */
export function SeasonBanner() {
  const today = startOfDayUtc(new Date());
  const season = currentSeason(today);
  if (!season) return null;

  return (
    <section className="bg-[#d4af37]/[0.06] border-y border-[#d4af37]/25 px-5 md:px-8 py-5">
      <div className="mx-auto max-w-[1240px] w-full flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[10.5px] font-semibold uppercase tracking-[2px] text-[#d4af37]/85">
            We are in
          </p>
          <p className="mt-1 font-sans text-[16px] md:text-[18px] font-semibold text-paper">
            {season.label}
            {season.subtheme ? (
              <span className="text-paper/55"> · {season.subtheme}</span>
            ) : null}
          </p>
          <p className="mt-1 font-serif text-[14px] md:text-[15px] text-paper/75 max-w-[720px] leading-[1.6]">
            {season.blurb}
          </p>
        </div>
        <Link
          href={season.href}
          className="shrink-0 inline-flex items-center gap-2 rounded-pill border border-[#d4af37]/55 bg-[#d4af37]/15 hover:bg-[#d4af37]/25 px-4 h-[40px] font-sans text-[13px] font-medium text-paper transition-colors"
        >
          Open the calendar →
        </Link>
      </div>
    </section>
  );
}
