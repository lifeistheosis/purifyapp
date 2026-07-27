import type { SVGProps } from "react";

/**
 * Orthodox three-bar cross, tuned for the tab bar.
 *
 * Replaces `tab/Orans` on the Prayers tab. Orans drew the catacomb prayer
 * posture as a headless, figureless sign: a horizontal shoulder run, two
 * elbows turning up on r 3.5 arcs, and a vertical body. The intent was good
 * and the execution was not. With no head and no hands, at 22px the three
 * marks read as two uprights and a crossbar, which is a goalpost. The owner
 * called it exactly that.
 *
 * Its doc comment argued against a cross here because "the Evangelion already
 * carries the cross". That is no longer true: the Bible tab has been
 * `tab/BookOpen` since the Beta 2.5 tab redesign, and BookOpen carries a spine
 * and pages, no cross. So the row has no cross in it at all, and the most
 * recognisable sign in Orthodoxy was sitting unused while Prayers wore a
 * goalpost.
 *
 * Geometry follows the sibling glyphs rather than `icons/Cross`: ink kept
 * inside 3.2 to 20.4 vertically so it does not clip the viewBox at either end
 * (the fault that got PrayerRope pulled from this bar), strokeWidth 1.6 to
 * match, and the bars narrowed from the brand mark so the three horizontals
 * stay separable at 22px. The footrest keeps its slant, left arm raised and
 * right lowered, as on the cross itself.
 */
export function OrthodoxCross({
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
      {/* Upright */}
      <path d="M12 3.2 V20.4" />
      {/* Titulus, the short board above the crossbar */}
      <path d="M9.3 6.9 H14.7" />
      {/* Main crossbar, the widest mark so the eye lands here first */}
      <path d="M5.8 10.6 H18.2" />
      {/* Slanted footrest */}
      <path d="M8.6 15.3 L15.4 17.5" />
    </svg>
  );
}
