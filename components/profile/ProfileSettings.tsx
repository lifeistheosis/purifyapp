"use client";

import { useReaderPrefs, type ReaderSize, type ReaderFont } from "@/components/reader/ReaderPrefs";

/**
 * Reading preferences that live in localStorage and persist across visits.
 * Currently exposes font family + size from ReaderPrefs (same source used by
 * the inline reader toolbar). Future additions like calendar style and
 * default Bible version will land here.
 */
export function ProfileSettings() {
  const { size, setSize, font, setFont } = useReaderPrefs();

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
          label="Calendar style"
          description="New (Revised Julian) is set on the /calendar page; Old (Julian) is a per-visit toggle there. A persistent default lands in v3.4."
          locked
        >
          <span className="font-sans text-[13px] text-paper/45 italic">
            Coming next
          </span>
        </Row>
      </div>
    </section>
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
