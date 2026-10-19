import type { SVGProps } from "react";

/**
 * A handle to hold and drag a row by (1.7, Your rule's prayers): three short
 * bars, the reorder handle a phone's own lists draw. In the stroke of the
 * rest of the set. Inherits `currentColor`.
 */
export function Grip({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M5.5 8h13" />
      <path d="M5.5 12h13" />
      <path d="M5.5 16h13" />
    </svg>
  );
}
