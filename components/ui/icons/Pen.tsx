import type { SVGProps } from "react";

/**
 * Note-writing pen for the add/edit note controls. Replaces the ✎ glyph so
 * the action reads in the same hand as the rest of the family. Inherits
 * `currentColor`.
 */
export function Pen({
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
      <path d="M4.4 19.6l1.1-4L16.6 4.5a2 2 0 0 1 2.9 0 2 2 0 0 1 0 2.9L8.4 18.5l-4 1.1z" />
      <line x1="14.6" y1="6.5" x2="17.5" y2="9.4" />
    </svg>
  );
}
