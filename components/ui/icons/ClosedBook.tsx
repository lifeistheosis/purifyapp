import type { SVGProps } from "react";

/**
 * A closed book, its pages at the foot: the Life door on a saint's page (1.8,
 * round 3b D), beside the open Book of his Writings. The shape the design
 * round drew. Inherits `currentColor`.
 */
export function ClosedBook({
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
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
      <path d="M4 19.5V21h16" />
    </svg>
  );
}
