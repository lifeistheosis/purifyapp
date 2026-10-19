"use client";

// The century slider: drag (or tap, or arrow-key) across the centuries the
// timeline spans and the line jumps to that century's first event. Since 1.7
// it sits in the Eras sheet under the eras, and in the computer's side
// column: no longer in the page's flow on a phone, where it was a second line
// beside the timeline's one.
//
// A styled native <input type="range">: draggable, tappable on the track,
// steppable with the arrow keys, and read by a screen reader as a slider
// with the century as its value. In the side column it moves the line as it
// is dragged; in the sheet (`onRelease`) it moves it once, when let go, and
// the sheet steps aside for it.

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { centuryName } from "@/lib/history/labels";

export function CenturyScrubber({
  centuries,
  active,
  onJump,
  onRelease = false,
  className,
  id = "history-century-scrubber",
}: {
  /** Centuries that actually contain events, ascending. */
  centuries: number[];
  /** Century currently in view (from the scroll spy). */
  active?: number;
  onJump: (century: number) => void;
  /** Jump once, when the thumb is let go (or a key is), not while it moves. */
  onRelease?: boolean;
  className?: string;
  /** Distinct per instance: the sheet and the side column can both be in the page. */
  id?: string;
}) {
  const { t, locale } = useTranslate();
  const activeIdx = Math.max(
    0,
    centuries.findIndex((c) => c === active),
  );
  // Track the thumb while dragging; commit the jump on change/release.
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const idx = dragIdx ?? activeIdx;
  const century = centuries[idx] ?? centuries[0];

  if (centuries.length < 2) return null;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-sans text-caption font-semibold text-paper/60">
          {t("study.jumpByCentury")}
        </label>
        <output htmlFor={id} className="font-serif text-lede text-paper tabular-nums" aria-hidden>
          {centuryName(century, locale)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="history-scrubber mt-1"
        min={0}
        max={centuries.length - 1}
        step={1}
        value={idx}
        aria-valuetext={centuryName(century, locale)}
        onChange={(e) => {
          const i = parseInt(e.target.value, 10);
          setDragIdx(i);
          if (!onRelease) onJump(centuries[i]);
        }}
        onPointerUp={() => {
          if (onRelease && dragIdx !== null) onJump(centuries[dragIdx]);
          setDragIdx(null);
        }}
        onKeyUp={(e) => {
          if (onRelease && dragIdx !== null && /^(Arrow|Home|End|Page)/.test(e.key)) onJump(centuries[dragIdx]);
        }}
        onBlur={() => setDragIdx(null)}
      />
      <div aria-hidden className="flex justify-between font-sans text-caption text-paper/55 tabular-nums">
        <span>{centuryName(centuries[0], locale)}</span>
        <span>{centuryName(centuries[centuries.length - 1], locale)}</span>
      </div>
    </div>
  );
}
