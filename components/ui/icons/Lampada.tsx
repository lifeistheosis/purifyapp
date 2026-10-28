import type { SVGProps } from "react";

/**
 * A church candle, lit: a beeswax taper on its line of ground, its flame
 * filled in so it reads as lit at the smallest size. The "lit" glyph for the
 * Hours, today and fast-free days, Daily quiet and the rest. Inherits
 * `currentColor`.
 *
 * Until 1.8 this drew a hanging vigil lamp with its flame under the bowl,
 * which read as an acorn. The owner, 2026-10-28: "replace it and stop using
 * that original design"; of six candles he picked this one ("4 is fine").
 * The name stays so every place that shows it changes with this file.
 */
export function Lampada({
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* the flame, filled: lit */}
      <path d="M12 2.8 C13.5 4.6, 13.7 6.4, 12 8.2 C10.3 6.4, 10.5 4.6, 12 2.8 Z" fill="currentColor" />
      {/* the wick */}
      <path d="M12 8.2 V9.6" />
      {/* the taper */}
      <path d="M10.1 21 V10.4 C10.1 10 10.4 9.7 10.8 9.7 H13.2 C13.6 9.7 13.9 10 13.9 10.4 V21" />
      {/* the ground it stands on */}
      <path d="M8 21 H16" />
    </svg>
  );
}
