import type { SVGProps } from "react";

/**
 * Bespoke liturgical calendar: a bound leaf with two hanging rings, a header
 * band, and the page split into two columns each marked with a cross. The
 * "Calendar" glyph. Inherits `currentColor`.
 */
export function Calendar({
  size = 22,
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
      {/* hanging rings */}
      <line x1="8" y1="2.8" x2="8" y2="5.8" />
      <line x1="16" y1="2.8" x2="16" y2="5.8" />
      {/* leaf */}
      <rect x="4" y="4.6" width="16" height="15.4" rx="1.6" />
      {/* header band */}
      <line x1="4" y1="9" x2="20" y2="9" />
      {/* column divider */}
      <line x1="12" y1="9" x2="12" y2="20" />
      {/* left cross */}
      <line x1="8" y1="11.6" x2="8" y2="17" />
      <line x1="6.6" y1="13.4" x2="9.4" y2="13.4" />
      {/* right cross */}
      <line x1="16" y1="11.6" x2="16" y2="17" />
      <line x1="14.6" y1="13.4" x2="17.4" y2="13.4" />
    </svg>
  );
}
