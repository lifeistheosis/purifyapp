"use client";

import { useRef, type KeyboardEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Sun } from "@/components/ui/icons/Sun";
import { MY_RULE_PARTS, type MyRulePart } from "@/lib/prayers/myRule";
import { tabForKey } from "@/lib/ui/sectionTabs";

/** Each part's name, as the prayer pages' tabs name it. */
export const PART_KEY: Record<MyRulePart, string> = {
  morning: "prayers.tabs.morning",
  evening: "prayers.tabs.evening",
};

/**
 * Morning and Evening on a carved switch (1.8, r3-27 A): the track Settings'
 * choices are carved in (r3-01 A, locked), the chosen part raised out of it
 * and lit, each with its sign, the sun rising and the lit candle. A tablist,
 * as the page's switch was (components/ui/SegmentedSwitch.tsx): the arrows
 * move between the parts in the reading direction, and only the chosen part
 * is in the tab order. Each tab is `mine-tab-<part>` and controls
 * `mine-panel-<part>`.
 *
 * `value` is null until the device has said which part the page opens on
 * (the hour, the address): then neither part is lit, rather than Morning lit
 * and crossing to Evening a moment later (build 89 note 9). `still` sets the
 * part with no cross-fade, for that first setting; a reader's tap crosses.
 */
export function PartSwitch({
  value,
  onChange,
  still = false,
}: {
  value: MyRulePart | null;
  onChange: (part: MyRulePart) => void;
  still?: boolean;
}) {
  const { t } = useTranslate();
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const rtl = document.documentElement.dir === "rtl";
    const next = tabForKey(e.key, value ? MY_RULE_PARTS.indexOf(value) : 0, MY_RULE_PARTS.length, rtl);
    if (next === null) return;
    e.preventDefault();
    const part = MY_RULE_PARTS[next];
    onChange(part);
    listRef.current?.querySelector<HTMLButtonElement>(`#mine-tab-${part}`)?.focus();
  }

  return (
    <div ref={listRef} role="tablist" aria-label={t("prayers.mine.partsLabel")} className="rule-track" data-still={still ? "" : undefined}>
      {MY_RULE_PARTS.map((part, i) => {
        const on = part === value;
        return (
          <button
            key={part}
            id={`mine-tab-${part}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={`mine-panel-${part}`}
            tabIndex={on || (value === null && i === 0) ? 0 : -1}
            onClick={() => onChange(part)}
            onKeyDown={onKeyDown}
          >
            {part === "morning" ? <Sun size={17} className="shrink-0" /> : <Lampada size={17} className="shrink-0" />}
            <span className="truncate">{t(PART_KEY[part])}</span>
          </button>
        );
      })}
    </div>
  );
}
