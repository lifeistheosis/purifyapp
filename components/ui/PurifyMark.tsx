import type { SVGProps } from "react";

/**
 * The Purify brand mark — a filled three-bar Orthodox cross, drawn as a
 * single scalable SVG so it stays crisp at every size (nav glyph through
 * the large hero bleed) and inherits `currentColor`, replacing the old
 * raster `/purify-cross.png`. The stroked `ui/icons/Cross` remains for
 * inline bullet use; this filled form reads better at display size.
 *
 * `size` sets the height; width follows the 3:4 mark aspect.
 */
export function PurifyMark({
  size = 24,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "width" | "height"> & { size?: number }) {
  return (
    <svg
      width={Math.round(size * 0.75)}
      height={size}
      viewBox="0 0 48 64"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      {/* upright post */}
      <rect x="21" y="3" width="6" height="58" rx="2.5" />
      {/* titulus (top bar) */}
      <rect x="16.5" y="11" width="15" height="4.5" rx="2.25" />
      {/* main crossbar */}
      <rect x="10" y="21" width="28" height="5.5" rx="2.75" />
      {/* slanted footrest (suppedaneum) */}
      <rect
        x="14"
        y="41.5"
        width="20"
        height="4.5"
        rx="2.25"
        transform="rotate(-16 24 43.75)"
      />
    </svg>
  );
}
