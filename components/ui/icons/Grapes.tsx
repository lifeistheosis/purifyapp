import type { SVGProps } from "react";

/**
 * A cluster of grapes with a leaf: the glyph for wine-and-oil fast days.
 * Inherits `currentColor`.
 */
export function Grapes({
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* stem + leaf */}
      <path d="M12 3.2 v3" />
      <path d="M12 4 C13.6 2.8, 15.4 3, 16 4.2 C14.6 4.8, 13 4.6, 12 4" />
      {/* cluster: 6 berries */}
      <circle cx="9" cy="9" r="2" />
      <circle cx="13" cy="9" r="2" />
      <circle cx="7" cy="13" r="2" />
      <circle cx="11" cy="13" r="2" />
      <circle cx="15" cy="13" r="2" />
      <circle cx="11" cy="17.2" r="2" />
    </svg>
  );
}
