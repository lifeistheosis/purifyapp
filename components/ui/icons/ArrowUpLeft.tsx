import type { SVGProps } from "react";

/**
 * An arrow up to the start: puts a word in the search field above it to go
 * on typing (1.8, r3-12), as a phone's own search does. Mirror it in a
 * right-to-left language (`rtl:-scale-x-100`). Inherits `currentColor`.
 */
export function ArrowUpLeft({
  size = 16,
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
      <path d="M17.5 17.5L7 7" />
      <path d="M7 15V7h8" />
    </svg>
  );
}
