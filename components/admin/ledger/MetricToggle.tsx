"use client";

/** The MRR / DAU switch: two hairline segments, gold for the active one. */
export function MetricToggle<T extends string>({
  value,
  onChange,
  options = [
    { id: "mrr" as T, label: "MRR" },
    { id: "dau" as T, label: "DAU" },
  ],
}: {
  value: T;
  onChange: (v: T) => void;
  options?: { id: T; label: string }[];
}) {
  return (
    <div role="group" aria-label="Metric" className="inline-flex rounded-[var(--adm-radius-sm)] border" style={{ borderColor: "var(--adm-line-strong)" }}>
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className="h-8 px-3 font-sans text-[12.5px]"
            style={{
              color: on ? "var(--adm-up)" : "var(--adm-ink-2)",
              fontWeight: on ? 500 : 400,
              borderLeft: i === 0 ? undefined : "1px solid var(--adm-line)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
