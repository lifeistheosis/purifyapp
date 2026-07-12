import type { SVGProps } from "react";

/**
 * Shopping cart glyph for the marketplace. Drawn on the shared 24-grid with
 * the family's 1.6 stroke and round caps, so it sits beside Plus / Heart /
 * Search without looking imported. Inherits `currentColor`.
 */
export function Cart({
  size = 18,
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
      {/* handle + basket */}
      <path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
      {/* wheels */}
      <circle cx="9.5" cy="20" r="1.2" />
      <circle cx="17.5" cy="20" r="1.2" />
    </svg>
  );
}
