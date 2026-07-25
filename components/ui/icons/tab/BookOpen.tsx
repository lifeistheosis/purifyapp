import type { SVGProps } from "react";

/**
 * Open book — the "Bible" tab glyph, drawn from the owner's icon pack.
 *
 * Two page blocks falling away from a centre spine, the covers curling at top
 * and bottom. Redrawn as vector rather than imported: the pack ships 512px
 * PNGs, and a raster downscaled to 22px would soften exactly the strokes that
 * have to stay crisp.
 *
 * Measured at the real 22px against the kept glyphs, this is the best
 * separated mark in the whole bar: 0.472 blurred correlation against Today's
 * sun and 0.445 against Community's church. That was not a given, since an
 * open book is wide and low and Today's sun is also wide and low; the centre
 * spine and the two hard vertical page edges are what pull it apart.
 *
 * Ink bbox 4.2,4.1 -> 19.8,19.9 (15.6 x 15.5), centre (12.0, 12.2), 3 elements.
 */
export function BookOpen({
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
      {/* Left page: spine, cover curl, outer edge, lower curl back to spine */}
      <path d="M12 6.2 C9.9 4.6 6.6 4.1 4.2 4.6 V18.3 C6.6 17.8 9.9 18.3 12 19.9" />
      {/* Right page, mirrored */}
      <path d="M12 6.2 C14.1 4.6 17.4 4.1 19.8 4.6 V18.3 C17.4 17.8 14.1 18.3 12 19.9" />
      {/* Spine. Load-bearing: without it the two pages read as one slab and
          the mark starts colliding with Today under blur. */}
      <path d="M12 6.2 V19.9" />
    </svg>
  );
}
