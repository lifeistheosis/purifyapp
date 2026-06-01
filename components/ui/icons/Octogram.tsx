import type { SVGProps } from "react";

/**
 * Eight-pointed star (Theotokos / Star of Bethlehem). Two overlapping
 * squares rotated 45° to each other — a glyph found across Orthodox
 * iconography on the Theotokos's veil and as the star above the
 * Nativity. Uses MITER joins (not round) so the eight points stay
 * sharp; rounded joins made the overlapping squares read as a flower.
 * Shares the 1.6 stroke of the tab-bar set.
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
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="miter"
      aria-hidden="true"
      {...props}
    >
      {/* upright square */}
      <rect x="5.6" y="5.6" width="12.8" height="12.8" />
      {/* same square, rotated 45° around the center (12, 12) */}
      <polygon points="12,2.5 21.5,12 12,21.5 2.5,12" />
    </svg>
  );
}
