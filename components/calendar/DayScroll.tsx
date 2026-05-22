import type { Commemoration, FastKind } from "@/lib/calendar/orthodox";
import { toneVars, type Tone } from "@/lib/calendar/tone";
import { OrnamentRule } from "./OrnamentRule";
import { SectionLabel } from "./SectionLabel";
import { FastBadge } from "./FastBadge";
import { CommemorationRow } from "./CommemorationRow";

/**
 * The selected-day "illuminated page": ornament header, the day's fast tablet,
 * its commemorations as a haloed serif list, and (optionally) its readings.
 */
export function DayScroll({
  dateLabel,
  tone,
  fast,
  commemorations,
  readings,
}: {
  dateLabel: string;
  tone: Tone;
  fast: { kind: FastKind; label: string; rule: string };
  commemorations: Commemoration[];
  readings?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-gold/15 bg-paper/[0.025] p-5 md:p-6"
      style={toneVars(tone)}
    >
      <SectionLabel>Selected day</SectionLabel>
      <h3 className="mt-2.5 font-display-serif text-[24px] md:text-[26px] text-paper leading-tight">
        {dateLabel}
      </h3>

      <OrnamentRule className="my-4" tinted />

      <FastBadge kind={fast.kind} label={fast.label} rule={fast.rule} />

      <p className="mt-6 mb-3.5">
        <SectionLabel>Commemorations</SectionLabel>
      </p>
      {commemorations.length > 0 ? (
        <ul className="space-y-3.5">
          {commemorations.map((c, i) => (
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

      {readings && (
        <>
          <p className="mt-6 mb-3.5">
            <SectionLabel>Readings</SectionLabel>
          </p>
          {readings}
        </>
      )}
    </div>
  );
}
