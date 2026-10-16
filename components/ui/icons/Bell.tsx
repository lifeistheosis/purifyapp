import type { SVGProps } from "react";

/**
 * Bell, for the notifications button in the phone tab bar. Drawn in the same
 * hand as ChevronLeft and Search: one round-capped stroke, no fill, so it
 * sits beside the magnifier as one pair. It was an inline path inside
 * Today's old bar (MobileTopTabs), the one screen that had a bell.
 *
 * `filled` paints the bell's body solid for "something new": the only mark
 * the bar uses for it. No dot and no count beside it, so nothing on the bar
 * is drawn to make a reader look. Inherits `currentColor`.
 */
export function Bell({
  size = 20,
  filled = false,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; filled?: boolean }) {
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
      <path d="M6 9a6 6 0 0 1 12 0c0 4.6 1.2 6.3 2 7H4c.8-.7 2-2.4 2-7Z" fill={filled ? "currentColor" : "none"} />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}
