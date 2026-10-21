import type { SVGProps } from "react";

/**
 * Three gusts, for the Wind sound of ambience (1.8). Drawn in the stroke of
 * the rest of the set. Inherits `currentColor`.
 */
export function Wind({
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
      <path d="M3 8.5h11a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12.5h15a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 16.5h7a2 2 0 1 1-2 2" />
    </svg>
  );
}
