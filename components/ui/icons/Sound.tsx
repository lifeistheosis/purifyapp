import type { SVGProps } from "react";

/**
 * A speaker with two waves, for ambience: the sound button by the reader's
 * chapter pager, in Now Playing and in the mini player (1.7). Drawn in the
 * stroke of the rest of the set. Inherits `currentColor`.
 */
export function Sound({
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
      <path d="M4 9.6h3.4L12.2 5.8v12.4L7.4 14.4H4z" />
      <path d="M15.6 9.2a4 4 0 0 1 0 5.6" />
      <path d="M18.3 6.6a7.6 7.6 0 0 1 0 10.8" />
    </svg>
  );
}
