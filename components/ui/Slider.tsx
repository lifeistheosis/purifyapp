"use client";

import { useRef } from "react";

import { cn } from "@/lib/cn";

/**
 * One slider for the app (1.7): Now Playing's position, and the ambience
 * sheet's volume and balance. It was Now Playing's own Scrubber until the
 * ambience sheet needed two more.
 *
 * A slim line with a dot: a 3px track and an 11px thumb, inside a box 44px
 * tall, so a thumb finds it without aiming. Tap or drag anywhere on the box
 * to go there; the arrow keys move by `step`, Home and End to the ends. In a
 * right-to-left language it runs from the right, as the screen does.
 */
export function Slider({
  value,
  min = 0,
  max,
  step,
  onChange,
  label,
  valueText,
  className,
}: {
  value: number;
  min?: number;
  max: number;
  /** How far an arrow key moves it. */
  step: number;
  onChange: (value: number) => void;
  label: string;
  /** What a screen reader says for the value: "1:05 / 4:10", "60%". */
  valueText: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const span = max - min;
  const pct = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const rtl = () => (ref.current ? getComputedStyle(ref.current).direction === "rtl" : false);

  const at = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || span <= 0 || box.width <= 0) return;
    const f = Math.max(0, Math.min(1, (clientX - box.left) / box.width));
    onChange(min + (rtl() ? 1 - f : f) * span);
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={Math.round(max * 100) / 100}
      aria-valuenow={Math.round(value * 100) / 100}
      aria-valuetext={valueText}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        at(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons) at(e.clientX);
      }}
      onKeyDown={(e) => {
        const forward = rtl() ? "ArrowLeft" : "ArrowRight";
        const back = rtl() ? "ArrowRight" : "ArrowLeft";
        let next: number | null = null;
        if (e.key === forward || e.key === "ArrowUp") next = value + step;
        else if (e.key === back || e.key === "ArrowDown") next = value - step;
        else if (e.key === "Home") next = min;
        else if (e.key === "End") next = max;
        if (next === null) return;
        e.preventDefault();
        onChange(clamp(next));
      }}
      className={cn(
        "relative h-11 cursor-pointer touch-none rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-paper/15">
        <div className="absolute inset-y-0 start-0 rounded-full bg-paper" style={{ width: `${pct}%` }} />
      </div>
      <div
        aria-hidden
        className="absolute top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper rtl:translate-x-1/2"
        style={{ insetInlineStart: `${pct}%` }}
      />
    </div>
  );
}
