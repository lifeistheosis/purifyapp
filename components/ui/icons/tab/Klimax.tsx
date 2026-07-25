import type { SVGProps } from "react";

/**
 * Klimax — the "Discover" tab glyph.
 *
 * The ladder of St John Klimakos, whose icon is read every Great Lent and
 * hangs in every monastery refectory. Set on the diagonal because that is how
 * the icon composes it, rising from the lower left; a vertical ladder is
 * hardware, a diagonal one is the Ascent. Three rungs, not thirty, because a
 * tab icon is a sign and not a miniature.
 *
 * This is deliberately the only asymmetric mark in the bar. The bar's original
 * defect was that every glyph was a centred, symmetrical object, so nothing
 * had a distinct silhouette; one diagonal fixes that for the whole row.
 *
 * Replaces `icons/Octogram`, which was the widest mark in the set at 19.0u
 * (against Shop's 11.0u) and the only one forcing `strokeLinejoin="miter"`,
 * whose eight sharp points aliased into fuzz at 22px. This inherits the set's
 * round joins.
 *
 * Ink bbox 4.0,2.9 -> 20.0,20.1 (16.0 x 17.2), centre exactly (12.0, 11.5).
 * Rails 7.0u apart, leaving 5.0u of clear space at strokeWidth 2.0.
 *
 * The rails started 4.968u apart with three rungs, which is what the geometry
 * allows on paper. Rasterised at the real 22px it welded shut: a diagonal
 * stroke antialiases fatter than an orthogonal one, so 2.968u of nominal void
 * (2.72 CSS px) closed up and the mark read as a diagonal scribble rather than
 * a ladder. Widening the rails to 7.0u and dropping to two rungs is what the
 * size actually supports. Do not add the third rung back without rendering it.
 */
export function Klimax({
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
      {/* Rails, 50.11 degrees, with overhang past both end rungs so the
          ladder reads as continuing beyond the frame. */}
      <line x1="4" y1="15.6" x2="14.6" y2="2.9" />
      <line x1="9.4" y1="20.1" x2="20" y2="7.4" />
      {/* Two rungs, perpendicular to the rails. */}
      <line x1="6.2" y1="12.9" x2="11.6" y2="17.4" />
      <line x1="12.4" y1="5.6" x2="17.8" y2="10.1" />
    </svg>
  );
}
