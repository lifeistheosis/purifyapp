import type { SVGProps } from "react";

/**
 * Eight-pointed star (Theotokos / Star of Bethlehem). Two overlapping
 * squares rotated 45° to each other, a glyph found across Orthodox
 * iconography on the Theotokos's veil and as the star above the
 * Nativity. Replaces the generic Compass icon for the Discover tab so
 * the mobile nav reads in the same vocabulary as the iconography.
 */
export function Octogram({
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
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* upright square */}
      <rect x="5.5" y="5.5" width="13" height="13" />
      {/* same square, rotated 45° around center (12, 12) */}
      <polygon points="12,2.8 21.2,12 12,21.2 2.8,12" />
    </svg>
  );
}
