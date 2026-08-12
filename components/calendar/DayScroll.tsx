import type { Commemoration, FastingStatus } from "@/lib/calendar/orthodox";
import { toneVars, type Tone } from "@/lib/calendar/tone";
import { OrnamentRule } from "./OrnamentRule";
import { SectionLabel } from "./SectionLabel";
import { FastBadge } from "./FastBadge";
import { CommemorationRow } from "./CommemorationRow";
import { T } from "@/components/i18n/T";

/**
 * The selected-day "illuminated page": a weekday eyebrow + big date, a
 * centered three-bar Cross rule, then clearly labelled sections — the
 * day's fast tablet, its commemorations as a haloed serif list, and
 * (optionally) its readings. Calm, sectioned chrome; our own serif and
 * sans faces throughout. Section labels are <T> client islands so they
 * follow native locale switches.
 */
export function DayScroll({
  weekday,
  dateLabel,
  tone,
  fast,
  commemorations,
  readings,
}: {
  weekday: string;
  dateLabel: string;
  tone: Tone;
  fast: FastingStatus;
  commemorations: Commemoration[];
  readings?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-paper/12 bg-paper/[0.03] p-6 md:p-7"
      style={toneVars(tone)}
    >
      {/* Weekday eyebrow + big date */}
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[2.5px] text-gold/70">
        {weekday}
      </p>
      <h3 className="mt-2 font-display-serif text-title-sm md:text-title text-paper leading-tight">
        {dateLabel}
      </h3>

      <OrnamentRule className="my-5" />

      {/* Fasting — kept explicit (the reference omitted it). */}
      <div className="mb-3">
        <SectionLabel>
          <T k="calendar.fasting" />
        </SectionLabel>
      </div>
      <FastBadge fast={fast} />

      <div className="mt-7 mb-3.5">
        <SectionLabel>
          <T k="calendar.commemorations" />
        </SectionLabel>
      </div>
      {commemorations.length > 0 ? (
        <ul className="space-y-3.5">
          {commemorations.map((c, i) => (
            <li key={i}>
              <CommemorationRow c={c} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-sans text-detail text-paper/55">
          <T k="calendar.noCommemoration" />
        </p>
      )}

      {readings && (
        <>
          <div className="mt-7 mb-3.5">
            <SectionLabel>
              <T k="calendar.readings" />
            </SectionLabel>
          </div>
          {readings}
        </>
      )}
    </div>
  );
}
