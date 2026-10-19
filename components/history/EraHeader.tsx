"use client";

// An era of the timeline: its name, pinned under the bar while its events
// pass, and the line about it that scrolls on under the name (1.7, the
// owner's note 20 of 2026-10-16).
//
// The name is one line: the era in Lora, its years, and a drawn chevron.
// Tapping it opens the Eras sheet, so the way to another age of the Church is
// always where the reader's eye already is. No dot and no colour: an era is
// known by its name. The pin is solid night with a hairline (globals.css,
// "History"), never a blur.

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import type { HISTORY_ERAS } from "@/lib/history/events";

export function EraHeader({
  era,
  count,
  onOpenEras,
}: {
  era: (typeof HISTORY_ERAS)[number];
  count: number;
  onOpenEras?: () => void;
}) {
  const { t, tn } = useTranslate();
  const label = t(`study.history.era.${era.id}.label`);
  // For a screen reader: what the name does, and how many events the era holds.
  const hint = [t("study.history.chooseEra"), tn("study.history.eraCount", count)].join(", ");
  return (
    <>
      <div className="history-era-head -mx-5 border-b border-paper/8 px-5 md:-mx-8 md:px-8 lg:mx-0 lg:px-0">
        <h2 id={`era-${era.id}`} className="text-lede font-bold leading-tight text-paper">
          <button
            type="button"
            onClick={onOpenEras}
            aria-haspopup="dialog"
            className="tap-press flex min-h-12 w-full items-center gap-2.5 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
          >
            <span className="min-w-0 truncate">{label}</span>
            <span className="shrink-0 font-sans text-caption font-semibold text-paper/55 tabular-nums">
              {era.from}–{era.to}
            </span>
            <ChevronDown size={16} className="ms-auto shrink-0 text-paper/50" />
            <span className="sr-only">{hint}</span>
          </button>
        </h2>
      </div>
      <p className="ps-7 pt-3 pb-1 font-sans text-detail leading-[1.6] text-paper/60 md:max-w-[620px]">
        {t(`study.history.era.${era.id}.blurb`)}
      </p>
    </>
  );
}
