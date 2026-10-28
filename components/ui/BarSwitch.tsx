"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { tabForKey } from "@/lib/ui/sectionTabs";

/**
 * The top bar's switch (1.8): one thing seen two ways, the ways side by side
 * in a small pill in the bar and the chosen one filled white with a soft
 * white glow. Drawn for the saint web's Web and Timeline (the owner's mix of
 * 2026-10-27, Homebase/boards/purify-master/variants/m01-saint-web) and first
 * worn by Now Playing's cover and words (round 8: "two separate views,
 * switched like the saint web").
 *
 * A tablist, as the page's SegmentedSwitch is: the arrows move in the reading
 * direction, Home and End go to the ends, and only the chosen part is in the
 * tab order (lib/ui/sectionTabs.ts, tabForKey). Each part's tab is
 * `${idBase}-tab-${id}` and controls `${idBase}-panel-${id}`. 36px tall as it
 * was drawn, every part with a 44px touch box.
 */
export function BarSwitch<T extends string>({
  label,
  items,
  selected,
  onSelect,
  idBase,
  className,
}: {
  /** What the switch chooses between, for assistive technology. */
  label: string;
  items: readonly { id: T; label: string; icon?: ReactNode }[];
  selected: T;
  onSelect: (id: T) => void;
  idBase: string;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

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
      className={cn("flex h-9 items-center rounded-pill border border-paper/[0.12] bg-paper/[0.07] p-[3px]", className)}
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
              "tap-press hit-44 flex h-full min-w-0 items-center gap-1.5 rounded-pill px-3 font-sans text-[13.5px] font-semibold motion-safe:transition-[color,background-color,box-shadow] motion-safe:duration-200",
              on ? "bg-paper text-night shadow-[0_0_14px_rgba(255,255,255,0.22)]" : "text-paper/65 hover:text-paper",
            )}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
