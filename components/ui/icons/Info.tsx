import type { SVGProps } from "react";

/**
 * Information: a ring with the letter's stem and its dot, drawn in the same
 * hand as Bell and ChevronLeft (one round-capped stroke, no fill), for a
 * button that opens what something means (a saint's request, 1.7). Drawn,
 * never the character: a glyph comes from whatever font the phone has.
 * Inherits `currentColor`.
 */
export function Info({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.2" />
      <path d="M12 7.6v.1" strokeWidth={2.4} />
    </svg>
  );
}
