import type { SVGProps } from "react";

/**
 * Pechat — the "Shop" tab glyph.
 *
 * The prosphora seal: the turned wooden stamp whose face is cut with IC XC
 * NIKA and pressed into the offering loaf before Liturgy. Chosen for the store
 * because it is an object, made by hand and sold, rather than a transaction
 * verb. A cart or a bag would be the most generic choice available and would
 * say nothing about what EIKON actually sells.
 *
 * The face is left blank on purpose, and the reason is arithmetic rather than
 * laziness. One interior horizontal needs 4.6u of clearance above and below,
 * so 9.2u, against the 7.0u the block has. Raising the block to fit a device
 * turns the silhouette into a second portrait enclosure, which collides with
 * the Evangelion two cells away. So the seal is shown as the blanks are shown
 * before carving.
 *
 * Replaces `Lampada` IN THE TAB BAR ONLY. Lampada stays exactly as it is: it
 * is still the donate glyph in the mobile headers and the fast-free glyph in
 * the calendar, and using the same lamp for "Shop" was a semantic collision.
 *
 * Ink bbox 4.4,3.8 -> 19.6,19.8 (15.2 x 16.0), centre (12.0, 11.8). The stem
 * and the block walls share no y range at all, so filling in is structurally
 * impossible at any stroke weight.
 */
export function Pechat({
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
      {/* The seal block, 15.2 x 7.0 */}
      <rect x="4.4" y="12.8" width="15.2" height="7" />
      {/* Stem, 9.0u */}
      <path d="M12 3.8 V12.8" />
      {/* Grip, 9.2u */}
      <path d="M7.4 3.8 H16.6" />
    </svg>
  );
}
