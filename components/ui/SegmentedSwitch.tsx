"use client";

import { useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";
import { tabForKey } from "@/lib/ui/sectionTabs";

/**
 * The app's segmented switch: one rounded row of equal parts, the chosen one
 * filled (the look of the Bible tab's Old and New Testament and a chant's
 * Words, About and Versions). A tablist: the arrows move between the parts
 * in the reading direction, Home and End go to the ends, and only the chosen
 * part is in the tab order (lib/ui/sectionTabs.ts, tabForKey).
 *
 * Each part's tab is `${idBase}-tab-${id}` and controls `${idBase}-panel-${id}`.
 */
export function SegmentedSwitch<T extends string>({
  label,
  items,
  selected,
  onSelect,
  idBase,
  className,
}: {
  /** What the switch chooses between, for assistive technology. */
  label: string;
  items: readonly { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
  idBase: string;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // On each part, not on the row: the row itself never takes focus.
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const current = items.findIndex((item) => item.id === selected);
    const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    const next = tabForKey(e.key, Math.max(0, current), items.length, rtl);
    if (next === null) return;
    e.preventDefault();
    const id = items[next].id;
    onSelect(id);
    listRef.current?.querySelector<HTMLButtonElement>(`#${idBase}-tab-${id}`)?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn(
        "grid grid-flow-col auto-cols-fr gap-1 rounded-pill border border-paper/10 bg-paper/[0.03] p-1",
        className,
      )}
    >
      {items.map((item) => {
        const on = item.id === selected;
        return (
          <button
            key={item.id}
            id={`${idBase}-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={`${idBase}-panel-${item.id}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(item.id)}
            onKeyDown={onKeyDown}
            className={cn(
              "tap-press min-h-11 min-w-0 truncate rounded-pill px-2 font-sans text-detail font-semibold motion-safe:transition-colors",
              on ? "bg-paper text-night" : "text-paper/65 hover:text-paper",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
