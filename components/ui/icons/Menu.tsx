import type { SVGProps } from "react";

/**
 * Menu lines for the mobile navigation toggle. Replaces the ≡ text glyph.
 * Inherits `currentColor`.
 */
export function Menu({
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
      <line x1="4.5" y1="7" x2="19.5" y2="7" />
      <line x1="4.5" y1="12" x2="19.5" y2="12" />
      <line x1="4.5" y1="17" x2="19.5" y2="17" />
    </svg>
  );
}
