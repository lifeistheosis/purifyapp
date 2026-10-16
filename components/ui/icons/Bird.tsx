import type { SVGProps } from "react";

/**
 * Two birds in flight, for the Morning birds sound of ambience (1.7). Drawn
 * in the stroke of the rest of the set. Inherits `currentColor`.
 */
export function Bird({
  size = 24,
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
      <path d="M2.5 13c2-2.6 5-2.9 7.2 1 2.2-3.9 5.2-3.6 7.2-1" />
      <path d="M13.5 6.6c1.2-1.5 2.9-1.7 4.2.6 1.3-2.3 3-2.1 4.2-.6" />
    </svg>
  );
}
