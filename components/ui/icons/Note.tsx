import type { SVGProps } from "react";

/**
 * Two beamed notes, for chant: the Chants tile's glyph and Pray with chant's
 * button (components/player/PrayWithChant.tsx, where it was drawn inline
 * until 1.7). Drawn in the stroke of the rest of the set. Inherits
 * `currentColor`.
 */
export function Note({
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
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 18V5.5l11-2V16" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </svg>
  );
}
