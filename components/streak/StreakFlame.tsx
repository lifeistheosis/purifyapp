"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";

/**
 * The streak's flame. Red, because the owner asked for red (2026-10-02): a
 * deep liturgical red at the base rising to a hot red tip, with a light core.
 *
 *   lit      a day kept, and the streak itself
 *   ember    a day a save covered: the fire held, banked low
 *   pending  today, not kept yet: the flame unlit, dark red, waiting
 *   out      nothing to keep yet, or a day missed: a grey flame
 *
 * Each instance mints its own gradient ids. A shared id breaks when the
 * first copy sits in a hidden subtree (the phone pill's star did exactly
 * that, 2026-10-02).
 */
export type FlameState = "lit" | "ember" | "pending" | "out";

const OUTER =
  "M16 1.5C17.4 7.4 21.6 10.9 24.9 15.2C27.9 19.1 29.5 22.6 29.5 26.6C29.5 34.1 23.5 39 16 39C8.5 39 2.5 34.1 2.5 26.6C2.5 21.9 4.4 18.3 7.6 15.3C7.9 18.5 9.4 20.6 11.8 21.9C11 14.7 12.6 7.6 16 1.5Z";
const INNER =
  "M16.6 17.5C17.5 21 20.8 23.1 20.8 27.6C20.8 31.2 18.6 33.6 16 33.6C13.4 33.6 11.2 31.4 11.2 28.2C11.2 25.8 12.4 24.2 13.9 22.8C14.1 24.3 14.8 25.3 15.9 25.8C15.4 22.9 15.6 20.1 16.6 17.5Z";

export function StreakFlame({
  size = 24,
  state = "lit",
  flicker = false,
  className,
}: {
  /** Height in px; the width follows the flame's 4:5 shape. */
  size?: number;
  state?: FlameState;
  /** The tongue moves, under the motion switch. For the large flames only. */
  flicker?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const outer = `so${id}`;
  const inner = `si${id}`;
  const width = Math.round((size * 32) / 40);

  if (state === "out") {
    return (
      <svg
        width={width}
        height={size}
        viewBox="0 0 32 40"
        aria-hidden="true"
        focusable="false"
        className={cn("shrink-0", className)}
      >
        <path d={OUTER} fill="currentColor" fillOpacity={0.16} />
      </svg>
    );
  }

  if (state === "pending") {
    return (
      <svg
        width={width}
        height={size}
        viewBox="0 0 32 40"
        aria-hidden="true"
        focusable="false"
        className={cn("shrink-0 overflow-visible", className)}
      >
        <defs>
          <linearGradient id={outer} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5e2622" />
            <stop offset="1" stopColor="#2e1110" />
          </linearGradient>
        </defs>
        <path d={OUTER} fill={`url(#${outer})`} stroke="var(--color-streak)" strokeOpacity={0.75} strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    );
  }

  const ember = state === "ember";
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 32 40"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0 overflow-visible", className)}
    >
      <defs>
        <linearGradient id={outer} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ember ? "#8a3a33" : "#ff6a4d"} />
          <stop offset="0.55" stopColor={ember ? "#6b2420" : "#e8322b"} />
          <stop offset="1" stopColor={ember ? "#3f1614" : "#a3161d"} />
        </linearGradient>
        <linearGradient id={inner} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ember ? "#c1272d" : "#ffe1d6"} />
          <stop offset="1" stopColor={ember ? "#7a2a26" : "#ff7a66"} />
        </linearGradient>
      </defs>
      <path d={OUTER} fill={`url(#${outer})`} />
      <path
        d={INNER}
        fill={`url(#${inner})`}
        opacity={ember ? 0.7 : 1}
        className={flicker && !ember ? "streak-flicker" : undefined}
      />
    </svg>
  );
}
