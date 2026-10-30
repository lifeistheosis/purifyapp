"use client";

import { useRef, type KeyboardEvent } from "react";

import { ActionMenu } from "@/components/community/ActionMenu";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sliders } from "@/components/ui/icons/Sliders";
import { cn } from "@/lib/cn";
import { FEED_FILTER_KEYS, type FeedFilter } from "@/lib/community/halves";
import { tabForKey } from "@/lib/ui/sectionTabs";

/**
 * Talk together's three words and its sliders (1.8, the owner's pick of
 * r3-02, B): All, Ask a Priest and Discussion across the feed, the open one
 * white with a lit rule under it, and Following, Scripture and the Fathers
 * behind the sliders at the end of the line. They took the place of the bar
 * of seven pills (build 80 note 18).
 *
 * One filter is on at a time, as before: a choice behind the sliders lights
 * them and says its word beside them, and no word on the line is underlined
 * then. A tap on a word, or on the lit choice again, goes back to the line.
 *
 * The words are a tablist (the arrows move along them in the reading
 * direction); the sliders are a menu of radio items (ActionMenu).
 */
export function FeedTabs({
  tabs,
  sliders,
  filter,
  onFilter,
}: {
  tabs: readonly FeedFilter[];
  sliders: readonly FeedFilter[];
  filter: FeedFilter;
  onFilter: (next: FeedFilter) => void;
}) {
  const { t } = useTranslate();
  const listRef = useRef<HTMLDivElement>(null);
  const onTab = tabs.includes(filter);
  const sliderOn = !onTab && sliders.includes(filter);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    const next = tabForKey(e.key, Math.max(0, tabs.indexOf(filter)), tabs.length, rtl);
    if (next === null) return;
    e.preventDefault();
    onFilter(tabs[next]);
    listRef.current?.querySelector<HTMLButtonElement>(`[data-feed-tab="${tabs[next]}"]`)?.focus();
  }

  return (
    <div className="flex items-end gap-3 border-b border-paper/[0.08]">
      <div ref={listRef} role="tablist" aria-label={t("community.filterLabel")} className="flex min-w-0 items-end gap-6">
        {tabs.map((id, i) => {
          const on = id === filter;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              data-feed-tab={id}
              aria-selected={on}
              // With a choice behind the sliders on, the first word keeps the
              // way in for the keyboard.
              tabIndex={on || (!onTab && i === 0) ? 0 : -1}
              onClick={() => onFilter(id)}
              onKeyDown={onKeyDown}
              className={cn(
                "community-tab relative min-h-11 whitespace-nowrap pb-[11px] pt-2 font-sans text-[15px] font-semibold transition-colors",
                on ? "text-paper" : "text-paper/50 hover:text-paper/80",
              )}
            >
              {t(FEED_FILTER_KEYS[id])}
            </button>
          );
        })}
      </div>
      {sliders.length > 0 ? (
        <ActionMenu
          className="mb-1.5 ms-auto shrink-0"
          label={t("community.filterLabel")}
          lit={sliderOn}
          glyph={
            <>
              <Sliders size={19} />
              {sliderOn ? <span className="max-w-[9rem] truncate">{t(FEED_FILTER_KEYS[filter])}</span> : null}
            </>
          }
          items={sliders.map((id) => ({
            label: t(FEED_FILTER_KEYS[id]),
            checked: id === filter,
            // The lit choice again goes back to the line's first word.
            onSelect: () => onFilter(id === filter ? tabs[0] : id),
          }))}
        />
      ) : null}
    </div>
  );
}
