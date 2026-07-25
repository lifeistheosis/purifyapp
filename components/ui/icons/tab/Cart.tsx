import type { SVGProps } from "react";

/**
 * Shopping cart — the "Shop" tab glyph, drawn from the owner's icon pack.
 *
 * The pack's cart is a solid fill. It is redrawn here as a stroke at the set's
 * 1.6 weight, because the other six tabs are all stroked and a single filled
 * glyph in a row of outlines reads as a rendering bug rather than a style.
 *
 * Replaces `Pechat` (the prosphora seal) at the owner's request. Pechat and
 * `Evangelion` were removed with it; `Lampada`, which the Shop tab used before
 * either, is untouched and still serves the calendar's fast-free glyph and the
 * mobile headers' donate button.
 *
 * Ink bbox 4.0,4.8 -> 20.0,20.8 (16.0 x 16.0), centre (12.0, 12.8),
 * 4 elements. Blurred correlation 0.570 against Today, 0.670 against
 * Community, the latter being the highest pair this glyph introduces.
 */
export function Cart({
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
      {/* Handle, then the rail the basket hangs from, ending above the wheels */}
      <path d="M4.0 4.8 H5.7 L7.9 15.2 A2 2 0 0 0 9.9 16.8 H17.8" />
      {/* Basket: top edge, tapering side, lower edge */}
      <path d="M6.9 7.7 H20.0 L18.6 13.5 A2 2 0 0 1 16.7 15.1 H8.5" />
      {/* Wheels. r 1.5 is the floor: below that they close up at stroke 2.0. */}
      <circle cx="10.2" cy="19.3" r="1.5" />
      <circle cx="16.9" cy="19.3" r="1.5" />
    </svg>
  );
}
