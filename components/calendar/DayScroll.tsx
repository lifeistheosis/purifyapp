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
  locale = "en",
}: {
  dateLabel: string;
  tone: Tone;
  fast: { kind: FastKind; label: string; rule: string };
  commemorations: Commemoration[];
  readings?: React.ReactNode;
  locale?: string;
}) {
  const isDe = locale === "de";
  return (
    <div
      className="rounded-xl border border-gold/15 bg-paper/[0.025] p-5 md:p-6"
      style={toneVars(tone)}
    >
      <SectionLabel>{isDe ? "Ausgewählter Tag" : "Selected day"}</SectionLabel>
      <h3 className="mt-2.5 font-display-serif text-title-sm md:text-title text-paper leading-tight">
        {dateLabel}
      </h3>

      <OrnamentRule className="my-4" tinted />

      <FastBadge kind={fast.kind} label={fast.label} rule={fast.rule} />

      <div className="mt-6 mb-3.5">
        <SectionLabel>{isDe ? "Gedenken" : "Commemorations"}</SectionLabel>
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
          {isDe
            ? "Für diesen Tag ist kein Gedenken vermerkt."
            : "No commemoration listed for this day."}
        </p>
      )}

      {readings && (
        <>
          <div className="mt-6 mb-3.5">
            <SectionLabel>{isDe ? "Lesungen" : "Readings"}</SectionLabel>
          </div>
          {readings}
        </>
      )}
    </div>
  );
}
