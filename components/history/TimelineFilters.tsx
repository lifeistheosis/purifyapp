"use client";

// Filter controls, one logic everywhere, two presentations:
//  - <lg: rendered inside the shared bottom Sheet (hardware Back closes it,
//    thumb-reach Apply/Clear at the bottom).
//  - xl sidebar: rendered inline as a persistent panel.
// Chips are buttons with pressed state — never color-only (labels carry the
// meaning), never smaller than a comfortable tap target.

import {
  CERTAINTY_LEVELS,
  EVENT_CATEGORIES,
  HISTORY_ERAS,
  type Certainty,
  type Era,
  type EventCategory,
} from "@/lib/history/events";
import type { TimelineFilterState } from "@/lib/history/filter";
import { cn } from "@/lib/cn";

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "tap-press min-h-[40px] rounded-pill border px-3.5 font-sans text-detail transition-colors",
        active
          ? "border-paper/60 bg-paper/10 font-semibold text-paper"
          : "border-paper/15 text-paper/60 hover:border-paper/30",
      )}
    >
      {children}
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
      {children}
    </p>
  );
}

export function TimelineFilters({
  value,
  onChange,
}: {
  value: TimelineFilterState;
  onChange: (next: TimelineFilterState) => void;
}) {
  const toggleEra = (era: Era) =>
    onChange({ ...value, era: value.era === era ? undefined : era });
  const toggleCategory = (cat: EventCategory) =>
    onChange({
      ...value,
      categories: value.categories.includes(cat)
        ? value.categories.filter((c) => c !== cat)
        : [...value.categories, cat],
    });
  const toggleCertainty = (cert: Certainty) =>
    onChange({ ...value, certainty: value.certainty === cert ? undefined : cert });

  return (
    <div className="space-y-6">
      <div>
        <GroupLabel>Era</GroupLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {HISTORY_ERAS.map((e) => (
            <Chip key={e.id} active={value.era === e.id} onClick={() => toggleEra(e.id)}>
              {e.shortLabel}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <GroupLabel>Category</GroupLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {EVENT_CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={value.categories.includes(c.id)}
              onClick={() => toggleCategory(c.id)}
              title={c.description}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <GroupLabel>Historical certainty</GroupLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {CERTAINTY_LEVELS.map((c) => (
            <Chip
              key={c.id}
              active={value.certainty === c.id}
              onClick={() => toggleCertainty(c.id)}
              title={c.gloss}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The chips summarizing active filters above the timeline; each removes
 *  itself on tap, and Clear resets everything. */
export function ActiveFilterChips({
  value,
  onChange,
  className,
}: {
  value: TimelineFilterState;
  onChange: (next: TimelineFilterState) => void;
  className?: string;
}) {
  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (value.era) {
    const era = HISTORY_ERAS.find((e) => e.id === value.era)!;
    chips.push({
      key: "era",
      label: era.shortLabel,
      remove: () => onChange({ ...value, era: undefined }),
    });
  }
  for (const c of value.categories) {
    const cat = EVENT_CATEGORIES.find((x) => x.id === c)!;
    chips.push({
      key: `cat-${c}`,
      label: cat.label,
      remove: () =>
        onChange({ ...value, categories: value.categories.filter((x) => x !== c) }),
    });
  }
  if (value.certainty) {
    const cert = CERTAINTY_LEVELS.find((x) => x.id === value.certainty)!;
    chips.push({
      key: "cert",
      label: cert.label,
      remove: () => onChange({ ...value, certainty: undefined }),
    });
  }
  if (value.century) {
    chips.push({
      key: "century",
      label: `${value.century}th c.`,
      remove: () => onChange({ ...value, century: undefined }),
    });
  }
  if (!chips.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.remove}
          className="tap-press inline-flex min-h-[36px] items-center gap-1.5 rounded-pill bg-paper/10 px-3 font-sans text-detail font-semibold text-paper"
        >
          {c.label}
          <span aria-hidden className="text-paper/60">×</span>
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({ ...value, era: undefined, categories: [], certainty: undefined, century: undefined })
        }
        className="tap-press min-h-[36px] rounded-pill px-3 font-sans text-detail text-paper/60 underline underline-offset-4 hover:text-paper"
      >
        Clear all
      </button>
    </div>
  );
}
