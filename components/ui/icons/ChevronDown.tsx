import type { SVGProps } from "react";

/**
 * Down chevron for anything that opens below itself (a disclosure, a
 * picker). Drawn in the stroke of ChevronLeft; it replaces the ▾ text
 * character, which Impeccable flags as a glyph standing in for an icon
 * (2026-10-16). Inherits `currentColor`; the caller turns it when open.
 */
export function ChevronDown({
  size = 14,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
