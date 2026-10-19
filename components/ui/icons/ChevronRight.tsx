import type { SVGProps } from "react";

/**
 * Forward chevron, the partner of ChevronLeft: a door that leads on (the
 * "page not found" screen's doors, a row that opens). Replaces the → text
 * glyph. Mirrors itself in a right-to-left language when the caller adds
 * `rtl:-scale-x-100`. Inherits `currentColor`.
 */
export function ChevronRight({
  size = 16,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 5 L16 12 L9 19" />
    </svg>
  );
}
