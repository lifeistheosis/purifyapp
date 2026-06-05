import type { SVGProps } from "react";

/**
 * Bespoke parchment scroll: rolled top and bottom rods with the open
 * parchment between, ruled with a few lines of text. The "Heresies" glyph
 * (the errors set down and answered). Inherits `currentColor`.
 */
export function Scroll({
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
      {/* parchment side edges */}
      <path d="M8 6 V18" />
      <path d="M16 6 V18" />
      {/* top rolled rod */}
      <path d="M8 6 C8 4.4 16 4.4 16 6 C16 7.6 8 7.6 8 6 Z" />
      {/* bottom rolled rod */}
      <path d="M8 18 C8 16.4 16 16.4 16 18 C16 19.6 8 19.6 8 18 Z" />
      {/* ruled text lines */}
      <line x1="10" y1="10.4" x2="14" y2="10.4" />
      <line x1="10" y1="12.2" x2="14.4" y2="12.2" />
      <line x1="10" y1="14" x2="13.6" y2="14" />
    </svg>
  );
}
