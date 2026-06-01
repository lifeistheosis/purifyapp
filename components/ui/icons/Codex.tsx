import type { SVGProps } from "react";

/**
 * Bespoke Gospel codex. Closed book viewed at three-quarter with a small
 * three-bar Orthodox cross incised on the cover and two ribbons hanging
 * from the bottom. Replaces the generic line-art Book icon, reads as a
 * specifically liturgical object rather than a generic open book.
 */
export function Codex({
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
      {/* cover outline */}
      <rect x="5" y="3.5" width="14" height="17" rx="0.6" />
      {/* spine seam */}
      <line x1="5" y1="6" x2="19" y2="6" />
      {/* three-bar cross, centered on the cover */}
      <line x1="12" y1="8.5" x2="12" y2="17" />
      <line x1="10" y1="10" x2="14" y2="10" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="10.5" y1="15" x2="13.5" y2="14" />
      {/* two ribbons descending below the closed pages */}
      <line x1="9" y1="20.5" x2="9" y2="22.3" />
      <line x1="13.2" y1="20.5" x2="13.2" y2="22.7" />
    </svg>
  );
}
