"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";

export type FilterOption = { value: string; label: string; sub?: string; count: number };
export type FilterGroup = { heading?: string; options: FilterOption[] };

/**
 * One filter's choices, in the shared movable sheet (components/ui/Sheet.tsx,
 * the one sheet every picker in the app opens): All first, then each choice
 * with how many works it would leave, grouped where the list has groups (the
 * themes: the passions, the virtues, daily life, the seasons). A choice that
 * would leave nothing is still listed, quieter, and cannot be chosen. Tapping
 * a choice applies it and puts the sheet away.
 */
export function FilterSheet({
  open,
  onClose,
  title,
  groups,
  selected,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  groups: FilterGroup[];
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
}) {
  const { t } = useTranslate();
  const pick = (value: string | undefined) => {
    onSelect(value);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={title} desktop>
      <ul className="divide-y divide-paper/8">
        <li>
          <Choice label={t("common.all")} active={selected === undefined} onClick={() => pick(undefined)} />
        </li>
      </ul>
      {groups.map((g, i) => (
        <div key={g.heading ?? i} className={g.heading ? "mt-4" : undefined}>
          {g.heading ? <p className="px-1 pb-1 font-sans text-caption font-semibold text-paper/50">{g.heading}</p> : null}
          <ul className="divide-y divide-paper/8">
            {g.options.map((o) => (
              <li key={o.value}>
                <Choice
                  label={o.label}
                  sub={o.sub}
                  count={o.count}
                  active={selected === o.value}
                  disabled={o.count === 0 && selected !== o.value}
                  onClick={() => pick(o.value)}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Sheet>
  );
}

function Choice({
  label,
  sub,
  count,
  active,
  disabled,
  onClick,
}: {
  label: string;
  sub?: string;
  count?: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 px-1 py-2 text-start font-sans",
        disabled ? "text-paper/30" : "text-paper/85 hover:text-paper",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className={cn("block text-ui", active && "font-semibold text-paper")}>{label}</span>
        {sub ? <span className="mt-0.5 block text-caption text-paper/45">{sub}</span> : null}
      </span>
      {count !== undefined ? <span className="shrink-0 tabular-nums text-detail text-paper/45">{count}</span> : null}
      <span aria-hidden className="inline-flex w-5 shrink-0 justify-center text-paper">
        {active ? <Check size={18} /> : null}
      </span>
    </button>
  );
}
