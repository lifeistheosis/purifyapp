"use client";

import { useEffect, useState } from "react";
import { useReaderPrefs, type ReaderSize, type ReaderFont } from "@/components/reader/ReaderPrefs";
import { useInterlinear } from "@/lib/bible/interlinear";
import {
  CALENDAR_STYLE_KEY,
  readCalendarStyleDefault,
  writeCalendarStyleDefault,
  type CalendarStyleDefault,
} from "@/lib/calendar/styleDefault";

/**
 * Reading preferences that live in localStorage and persist across visits.
 * Surfaces the four user-facing knobs in one place: reader font + size
 * (from ReaderPrefs), interlinear default (the Bible reader's
 * Interlinear toggle persists here), and the calendar reckoning default
 * (New / Old Julian).
 */
export function ProfileSettings() {
  const { size, setSize, font, setFont } = useReaderPrefs();
  const { on: interlinearOn, toggle: toggleInterlinear } = useInterlinear();

  const [calStyle, setCalStyle] =
    useState<CalendarStyleDefault>("new");
  const [calHydrated, setCalHydrated] = useState(false);
  useEffect(() => {
    setCalStyle(readCalendarStyleDefault());
    setCalHydrated(true);
    function on(e: StorageEvent) {
      if (e.key === CALENDAR_STYLE_KEY) {
        setCalStyle(readCalendarStyleDefault());
      }
    }
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);
  function pickCalStyle(v: CalendarStyleDefault) {
    setCalStyle(v);
    writeCalendarStyleDefault(v);
  }

  const sizeOptions: { value: ReaderSize; label: string }[] = [
    { value: "sm", label: "Small" },
    { value: "md", label: "Medium" },
    { value: "lg", label: "Large" },
    { value: "xl", label: "Extra large" },
  ];

  const fontOptions: { value: ReaderFont; label: string }[] = [
    { value: "serif", label: "Serif (Lora)" },
    { value: "display", label: "Display" },
    { value: "sans", label: "Sans" },
  ];

  return (
    <section className="mt-10 rounded-lg border border-paper/12 bg-paper/[0.02] p-6 md:p-7">
      <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
        Settings
      </p>

      <div className="space-y-6">
        <Row label="Reader font" description="The face of the body text in the Bible and saint readers.">
          <SegGroup
            value={font}
            options={fontOptions}
            onChange={(v) => setFont(v as ReaderFont)}
          />
        </Row>
        <Row label="Reader size" description="How large the body text appears at default zoom.">
          <SegGroup
            value={size}
            options={sizeOptions}
            onChange={(v) => setSize(v as ReaderSize)}
          />
        </Row>
        <Row
          label="Interlinear by default"
          description="Show the Greek alongside the English on New Testament chapters as soon as you open them."
        >
          <Toggle
            on={interlinearOn}
            onChange={toggleInterlinear}
            label={interlinearOn ? "On" : "Off"}
          />
        </Row>
        <Row
          label="Calendar reckoning"
          description="The default style used by /calendar when no ?style= query is set. New (Revised Julian) for the Ecumenical Patriarchate and the majority; Old (Julian) for the Russian, Serbian, Athonite, and Jerusalem traditions."
        >
          {calHydrated && (
            <SegGroup
              value={calStyle}
              options={[
                { value: "new", label: "New" },
                { value: "old", label: "Old (Julian)" },
              ]}
              onChange={(v) => pickCalStyle(v as CalendarStyleDefault)}
            />
          )}
        </Row>
      </div>
    </section>
  );
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={on}
      className={
        "inline-flex items-center gap-2 rounded-pill border px-4 h-[36px] font-sans text-[13px] font-medium transition-colors " +
        (on
          ? "border-gold text-night bg-gold hover:bg-gold/90"
          : "border-paper/15 bg-paper/[0.04] text-paper/85 hover:bg-paper/10 hover:border-paper/30")
      }
    >
      <span
        aria-hidden
        className={
          "inline-block w-2 h-2 rounded-full " +
          (on ? "bg-night" : "bg-paper/30")
        }
      />
      {label}
    </button>
  );
}

function Row({
  label,
  description,
  locked,
  children,
}: {
  label: string;
  description?: string;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        locked ? "opacity-60" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="font-sans text-[14.5px] font-semibold text-paper leading-tight">
          {label}
        </p>
        {description && (
          <p className="mt-1 font-sans text-[12.5px] text-paper/55 leading-[1.55]">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SegGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-pill border border-paper/15 bg-paper/[0.04] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={
            "font-sans text-[13px] font-medium rounded-pill px-3 py-1 transition-colors duration-150 " +
            (value === o.value
              ? "bg-paper text-night"
              : "text-paper/65 hover:text-paper")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
