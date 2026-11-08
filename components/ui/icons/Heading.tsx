import type { SVGProps } from "react";

/**
 * A heading over its words: one heavy line on top, two lighter, shorter ones
 * under it. The journal's Heading block (1.9, a page's Plus blocks), drawn on
 * the family's 24-grid with its round caps, the heading line a step heavier
 * so it reads as the heading without a letter standing in for it
 * (docs/design/icon-system.md: no character as an icon). Inherits
 * `currentColor`.
 */
export function Heading({
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
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <line x1="4.5" y1="7" x2="15.5" y2="7" strokeWidth={2.8} />
      <line x1="4.5" y1="13" x2="19.5" y2="13" />
      <line x1="4.5" y1="17.5" x2="14.5" y2="17.5" />
    </svg>
  );
}
