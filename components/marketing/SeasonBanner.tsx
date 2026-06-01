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
    <section className="bg-gold/[0.06] border-y border-gold/25 px-5 md:px-8 py-5">
      <div className="mx-auto max-w-[1240px] w-full flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-gold/85">
            We are in
          </p>
          <p className="mt-1 font-sans text-body md:text-lede font-semibold text-paper">
            {season.label}
            {season.subtheme ? (
              <span className="text-paper/55"> · {season.subtheme}</span>
            ) : null}
          </p>
          <p className="mt-1 font-serif text-ui md:text-ui text-paper/75 max-w-[720px] leading-[1.6]">
            {season.blurb}
          </p>
        </div>
        <Link
          href={season.href}
          className="shrink-0 inline-flex items-center gap-2 rounded-pill border border-gold/55 bg-gold/15 hover:bg-gold/25 px-4 h-[40px] font-sans text-detail font-medium text-paper transition-colors"
        >
          Open the calendar →
        </Link>
      </div>
    </section>
  );
}
