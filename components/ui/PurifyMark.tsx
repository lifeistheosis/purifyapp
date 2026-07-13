import type { SVGProps } from "react";

/**
 * The Purify brand mark: the Orthodox three-bar cross, drawn as an inline SVG
 * whose four bars match /public/purify-cross.png exactly (measured from it:
 * post 17% of the width, titulus 53%, main crossbar full width, and the
 * suppedaneum slanted with the LEFT arm raised). Self-contained (no external
 * asset to 404 into a solid rectangle), inherits `currentColor`, and stays
 * crisp at every size. viewBox aspect 100:176 = 0.568, the cross's own ratio.
 *
 * `size` sets the height; width follows. Keep in step with app/icon.tsx.
 */
export function PurifyMark({
  size = 24,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "width" | "height"> & { size?: number }) {
  return (
    <svg
      width={Math.round(size * 0.568)}
      height={size}
      viewBox="0 0 100 176"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      {/* upright post */}
      <rect x="41" y="2" width="18" height="172" rx="1" />
      {/* titulus (top bar) */}
      <rect x="22" y="20" width="56" height="15" rx="1" />
      {/* main crossbar (full width) */}
      <rect x="0" y="55" width="100" height="16" rx="1" />
      {/* slanted footrest (suppedaneum): left arm raised, right lowered */}
      <rect
        x="22"
        y="131"
        width="56"
        height="15"
        rx="1"
        transform="rotate(18 50 138)"
      />
    </svg>
  );
}
