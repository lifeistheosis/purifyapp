import type { SVGProps } from "react";

/**
 * Headphones, for Listen: the reader's read-aloud (components/bible/
 * ReadAloud.tsx). Drawn in the stroke of the rest of the set. Inherits
 * `currentColor`.
 */
export function Headphones({
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
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="5" height="7" rx="2" />
      <rect x="16" y="14" width="5" height="7" rx="2" />
    </svg>
  );
}
