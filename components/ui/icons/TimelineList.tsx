import type { SVGProps } from "react";

/**
 * A line down the side with two moments on it: the Timeline side of the saint
 * web's switch (1.8). Drawn in the stroke of the rest of the set. Inherits
 * `currentColor`.
 */
export function TimelineList({
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
      <path d="M6 3v18" />
      <circle cx="6" cy="7" r="2" fill="currentColor" />
      <circle cx="6" cy="16" r="2" fill="currentColor" />
      <path d="M11 7h9M11 16h7" />
    </svg>
  );
}
