import type { SVGProps } from "react";

/**
 * Back chevron. The same stroke the web header's back button draws inline,
 * so the two bars a reader can meet point back with one mark; replaces the
 * ‹ text glyph in MobileTopBar. Inherits `currentColor`.
 */
export function ChevronLeft({
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
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M15 5 L8 12 L15 19" />
    </svg>
  );
}
