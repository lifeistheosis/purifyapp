import type { SVGProps } from "react";

/**
 * Bespoke three-bar Orthodox cross mark. Used as the brand glyph and as the
 * "feature" bullet in place of the generic ✦. Inherits `currentColor`.
 */
export function Cross({
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
      aria-hidden="true"
      {...props}
    >
      {/* upright */}
      <line x1="12" y1="2.5" x2="12" y2="21.5" />
      {/* top (titulus) bar */}
      <line x1="8.5" y1="6" x2="15.5" y2="6" />
      {/* main crossbar */}
      <line x1="5.5" y1="9.5" x2="18.5" y2="9.5" />
      {/* slanted footrest */}
      <line x1="8" y1="16.5" x2="16" y2="14" />
    </svg>
  );
}
