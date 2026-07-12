import type { SVGProps } from "react";

/**
 * An hourglass: the glyph for Orthodox History and its timeline. Two framed
 * bulbs meeting at the waist, sand gathered below, a few grains falling.
 * Inherits `currentColor`.
 */
export function Hourglass({
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
      {/* top and bottom frame bars */}
      <path d="M6 3 H18" />
      <path d="M6 21 H18" />
      {/* the two bulbs, pinched at the waist */}
      <path d="M7.5 3 C7.5 8, 10.5 10, 12 12 C10.5 14, 7.5 16, 7.5 21" />
      <path d="M16.5 3 C16.5 8, 13.5 10, 12 12 C13.5 14, 16.5 16, 16.5 21" />
      {/* sand resting below, grains falling */}
      <path d="M9.8 19 C10.5 17.8, 13.5 17.8, 14.2 19" />
      <path d="M12 13.5 v0.01" />
      <path d="M12 15.5 v0.01" />
    </svg>
  );
}
