"use client";

import { useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";
import { tabForKey } from "@/lib/ui/sectionTabs";

/**
 * The app's segmented switch: one rounded row of equal parts, the chosen one
 * filled (the look of the Bible tab's Old and New Testament and a chant's
 * About and Versions). A tablist: the arrows move between the parts
 * in the reading direction, Home and End go to the ends, and only the chosen
 * part is in the tab order (lib/ui/sectionTabs.ts, tabForKey).
 *
 * A word is never cut (1.9, the arbiter's of 2026-11-10 11:45 UTC). The parts
 * are equal while every word fits its share; a part whose word needs more
 * takes what it needs, and the others share what is left, each still whole.
 * Until then the parts were equal always and a long word was cut: "Your
 * ledger" in Greek, "Το σημειωματάριό σας", at 360 pixels. A part's padding
 * is 4 pixels a side, which shows only when a part is as wide as its words,
 * and lets the Lent prayer's two wordings ("ROCOR (Jordanville)", "OCA (St.
 * Tikhon's)") fit at 320. Measured with the export's own fonts on every use
 * in all twenty-one languages at 390, 360 and 320 pixels: every row holds its
 * words. Should one ever not (a longer word, a phone's larger text), the row
 * scrolls inside its own rim, so nothing is cut and nothing spills onto the
 * page; no part is narrower than a finger.
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
        "no-scrollbar grid grid-flow-col auto-cols-[minmax(max-content,1fr)] gap-1 overflow-x-auto rounded-pill border border-paper/10 bg-paper/[0.03] p-1",
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
              "tap-press min-h-11 min-w-11 whitespace-nowrap rounded-pill px-1 font-sans text-detail font-semibold motion-safe:transition-colors",
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
