// "On this day in Orthodox History", shown on the Today page only when a
// curated event carries a firm calendar date matching today (integrity
// checks guarantee `calendar` exists only on exact-precision events, so an
// approximate year can never masquerade as a calendar anniversary). Most
// days render nothing; that is correct, not a bug. Pure registry lookup:
// no network, works identically in the offline Android bundle.

import Link from "next/link";

import { historyEventsOn } from "@/lib/history/events";
import { T } from "@/components/i18n/T";
import { TodayHeading } from "@/components/prayers/TodayHeading";
import { cn } from "@/lib/cn";

export function OnThisDayHistory({
  date,
  className,
}: {
  date: Date;
  /** The caller owns the spacing; single-caller, so no default margin. */
  className?: string;
}) {
  const mmdd = `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
  const events = historyEventsOn(mmdd).slice(0, 2);
  if (!events.length) return null;

  return (
    <section aria-labelledby="today-onthisday" className={cn(className)}>
      <TodayHeading id="today-onthisday" className="mb-4 tracking-[2.5px]">
        <T k="study.history.onThisDay" />
      </TodayHeading>
      <div className="space-y-3">
        {events.map((e) => (
          <Link
            key={e.slug}
            href={`/history/${e.slug}`}
            className="tap-press block rounded-lg border border-paper/12 bg-night-soft/50 px-5 py-4 transition-colors duration-200 hover:border-paper/25 hover:bg-night-soft/80 focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-4"
          >
            <p className="font-sans text-caption font-semibold uppercase tracking-[1.4px] text-paper/60">
              {e.displayDate}
              {/* Julian/conventional dates are commemorations, not civil
                  anniversaries, say so instead of implying a Gregorian date. */}
              {e.calendar && e.calendar.basis !== "gregorian" ? (
                <span className="normal-case tracking-normal text-paper/55">
                  {" "}
                  <T k="study.commemoratedToday" />
                </span>
              ) : null}
            </p>
            {/* Was a <p className="font-heading">: heading appearance
                without heading semantics. The unlayered h1..h6 rule in
                globals.css supplies the same face. */}
            <h3 className="mt-1 text-title-sm text-paper leading-snug">
              {e.title}
            </h3>
            <p className="mt-1 font-serif text-detail text-paper/60 leading-[1.55]">
              {e.preview}
            </p>
            <p className="mt-2 font-sans text-detail font-medium text-gold/80">
              <T k="study.history.viewInHistoryArrow" />
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
