// "On this day in Orthodox History" — shown on the Today page only when a
// curated event carries a firm calendar date matching today (integrity
// checks guarantee `calendar` exists only on exact-precision events, so an
// approximate year can never masquerade as a calendar anniversary). Most
// days render nothing; that is correct, not a bug. Pure registry lookup —
// no network, works identically in the offline Android bundle.

import Link from "next/link";

import { historyEventsOn } from "@/lib/history/events";

export function OnThisDayHistory({ date }: { date: Date }) {
  const mmdd = `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
  const events = historyEventsOn(mmdd).slice(0, 2);
  if (!events.length) return null;

  return (
    <div className="my-12">
      <p className="mb-4 font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40">
        On this day in Orthodox History
      </p>
      <div className="space-y-3">
        {events.map((e) => (
          <Link
            key={e.slug}
            href={`/history/${e.slug}`}
            className="tap-press block rounded-lg border border-paper/12 bg-night-soft/50 px-5 py-4 hover:border-paper/25"
          >
            <p className="font-sans text-caption font-semibold uppercase tracking-[1.4px] text-paper/50">
              {e.displayDate}
              {/* Julian/conventional dates are commemorations, not civil
                  anniversaries — say so instead of implying a Gregorian date. */}
              {e.calendar && e.calendar.basis !== "gregorian" ? (
                <span className="normal-case tracking-normal text-paper/35">
                  {" "}
                  · commemorated today
                </span>
              ) : null}
            </p>
            <p className="mt-1 font-heading text-title-sm text-paper leading-snug">
              {e.title}
            </p>
            <p className="mt-1 font-serif text-detail text-paper/60 leading-[1.55]">
              {e.preview}
            </p>
            <p className="mt-2 font-sans text-detail font-medium text-gold/80">
              View in History →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
