import type { Commemoration, FastKind } from "@/lib/calendar/orthodox";
import { toneVars, type Tone } from "@/lib/calendar/tone";
import { OrnamentRule } from "./OrnamentRule";
import { SectionLabel } from "./SectionLabel";
import { FastBadge } from "./FastBadge";
import { CommemorationRow } from "./CommemorationRow";

/**
 * The selected-day "illuminated page": a weekday eyebrow + big date, a
 * centered three-bar Cross rule, then clearly labelled sections — the
 * day's fast tablet, its commemorations as a haloed serif list, and
 * (optionally) its readings. Calm, sectioned chrome; our own serif and
 * sans faces throughout.
 */
export function DayScroll({
  weekday,
  dateLabel,
  tone,
  fast,
  commemorations,
  readings,
  locale = "en",
}: {
  weekday: string;
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
      className="rounded-xl border border-gold/15 bg-paper/[0.025] p-6 md:p-7"
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
        <SectionLabel>{isDe ? "Fasten" : "Fasting"}</SectionLabel>
      </div>
      <FastBadge kind={fast.kind} label={fast.label} rule={fast.rule} />

      <div className="mt-7 mb-3.5">
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
          <div className="mt-7 mb-3.5">
            <SectionLabel>{isDe ? "Lesungen" : "Readings"}</SectionLabel>
          </div>
          {readings}
        </>
      )}
    </div>
  );
}
