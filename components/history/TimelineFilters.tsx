"use client";

// The timeline's filters, one logic everywhere, two places: the Filter sheet
// (a phone, a tablet) and the computer's side column. Chips are buttons with
// a pressed state, never colour alone, and 44px tall. Every word is the
// reader's language (lib/history/labels.ts).

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Close } from "@/components/ui/icons/Close";
import { cn } from "@/lib/cn";
import {
  CERTAINTY_LEVELS,
  EVENT_CATEGORIES,
  HISTORY_ERAS,
  type Certainty,
  type Era,
  type EventCategory,
} from "@/lib/history/events";
import type { TimelineFilterState } from "@/lib/history/filter";
import {
  categoryDescription,
  categoryLabel,
  centuryName,
  certaintyGloss,
  certaintyLabel,
  eraShort,
} from "@/lib/history/labels";

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
        "tap-press min-h-11 rounded-pill border px-4 font-sans text-detail motion-safe:transition-colors",
        active
          ? "border-paper bg-paper font-semibold text-night"
          : "border-paper/15 text-paper/70 hover:border-paper/35 hover:text-paper",
      )}
    >
      {children}
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-caption font-semibold text-paper/60">{children}</p>;
}

export function TimelineFilters({
  value,
  onChange,
}: {
  value: TimelineFilterState;
  onChange: (next: TimelineFilterState) => void;
}) {
  const { t } = useTranslate();
  const toggleEra = (era: Era) => onChange({ ...value, era: value.era === era ? undefined : era });
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
        <GroupLabel>{t("study.era")}</GroupLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {HISTORY_ERAS.map((e) => (
            <Chip key={e.id} active={value.era === e.id} onClick={() => toggleEra(e.id)}>
              {eraShort(t, e.id)}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <GroupLabel>{t("study.category")}</GroupLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {EVENT_CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={value.categories.includes(c.id)}
              onClick={() => toggleCategory(c.id)}
              title={categoryDescription(t, c.id)}
            >
              {categoryLabel(t, c.id)}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <GroupLabel>{t("study.history.historicalCertainty")}</GroupLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {CERTAINTY_LEVELS.map((c) => (
            <Chip
              key={c.id}
              active={value.certainty === c.id}
              onClick={() => toggleCertainty(c.id)}
              title={certaintyGloss(t, c.id)}
            >
              {certaintyLabel(t, c.id)}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The filters in force, above the line; each removes itself on a tap, and Clear all resets them. */
export function ActiveFilterChips({
  value,
  onChange,
  className,
}: {
  value: TimelineFilterState;
  onChange: (next: TimelineFilterState) => void;
  className?: string;
}) {
  const { t, locale } = useTranslate();
  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (value.era) {
    chips.push({
      key: "era",
      label: eraShort(t, value.era),
      remove: () => onChange({ ...value, era: undefined }),
    });
  }
  for (const c of value.categories) {
    chips.push({
      key: `cat-${c}`,
      label: categoryLabel(t, c),
      remove: () => onChange({ ...value, categories: value.categories.filter((x) => x !== c) }),
    });
  }
  if (value.certainty) {
    chips.push({
      key: "cert",
      label: certaintyLabel(t, value.certainty),
      remove: () => onChange({ ...value, certainty: undefined }),
    });
  }
  if (value.century) {
    chips.push({
      key: "century",
      label: centuryName(value.century, locale),
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
          className="tap-press inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-paper/25 px-3.5 font-sans text-detail font-semibold text-paper"
        >
          {c.label}
          <Close size={11} className="text-paper/60" aria-hidden />
          <span className="sr-only">{t("study.removeFilter")}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...value, era: undefined, categories: [], certainty: undefined, century: undefined })}
        className="tap-press min-h-11 rounded-pill px-3 font-sans text-detail text-paper/60 underline underline-offset-4 hover:text-paper"
      >
        {t("study.history.clearAll")}
      </button>
    </div>
  );
}
