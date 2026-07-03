"use client";

// The century scrubber: drag (or tap, or arrow-key) across the centuries the
// dataset spans and the timeline jumps to that century's first event.
//
// Implemented as a styled native <input type="range"> on purpose:
//  - draggable with a thumb, tappable on the track, steppable with arrow
//    keys, the required non-drag alternative is built into the control;
//  - screen readers announce it as a slider with a century valuetext;
//  - it lives in the page flow (never anchored to the screen edge), so it
//    cannot collide with Android's back-gesture zones.

import { useState } from "react";

import { centuryLabelOf } from "@/lib/history/events";

export function CenturyScrubber({
  centuries,
  active,
  onJump,
  className,
}: {
  /** Centuries that actually contain events, ascending. */
  centuries: number[];
  /** Century currently in view (from the scroll spy). */
  active?: number;
  onJump: (century: number) => void;
  className?: string;
}) {
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
      <div className="flex items-baseline justify-between">
        <label
          htmlFor="history-century-scrubber"
          className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55"
        >
          Jump by century
        </label>
        <output
          htmlFor="history-century-scrubber"
          className="font-display-serif text-title-sm text-paper tabular-nums"
          aria-hidden
        >
          {centuryLabelOf(century)}
        </output>
      </div>
      <input
        id="history-century-scrubber"
        type="range"
        className="history-scrubber mt-1"
        min={0}
        max={centuries.length - 1}
        step={1}
        value={idx}
        aria-valuetext={centuryLabelOf(century)}
        onChange={(e) => {
          const i = parseInt(e.target.value, 10);
          setDragIdx(i);
          onJump(centuries[i]);
        }}
        onPointerUp={() => setDragIdx(null)}
        onBlur={() => setDragIdx(null)}
      />
      <div aria-hidden className="flex justify-between font-sans text-caption text-paper/55">
        <span>{centuryLabelOf(centuries[0])}</span>
        <span>{centuryLabelOf(centuries[centuries.length - 1])}</span>
      </div>
    </div>
  );
}
