import type { SVGProps } from "react";

/**
 * A clock face: the search's recent words (1.8, r3-12), each a word searched
 * before. Inherits `currentColor`.
 */
export function Clock({
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
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.6V12l3 1.9" />
    </svg>
  );
}
