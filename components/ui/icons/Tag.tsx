import type { SVGProps } from "react";

/**
 * A price tag with its hole, on the diagonal: the shop's glyph for a deal (a
 * set's saving, a multi-buy, a timed offer in the cart; 1.9). It took the
 * place of the four-point sparkle, which the owner named AI slop (CLAUDE.md,
 * "No sparkle star"). Drawn in the stroke of the rest of the set. Inherits
 * `currentColor`.
 */
export function Tag({
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
      <path d="M4.6 3.5H11l9.5 9.5-7.5 7.5L3.5 11V4.6c0-.6.5-1.1 1.1-1.1z" />
      <circle cx="7.6" cy="7.6" r="1.3" />
    </svg>
  );
}
