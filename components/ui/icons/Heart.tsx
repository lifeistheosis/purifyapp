import type { SVGProps } from "react";

/**
 * Save heart, extracted from the shop's FavoriteButton so the glyph lives
 * in the family. `filled` renders the saved state (fill toggle). Inherits
 * `currentColor`.
 */
export function Heart({
  size = 20,
  filled = false,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 21c-4.8-3.6-8-6.6-8-10a4.6 4.6 0 0 1 8-3.1A4.6 4.6 0 0 1 20 11c0 3.4-3.2 6.4-8 10z" />
    </svg>
  );
}
