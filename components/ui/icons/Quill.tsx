import type { SVGProps } from "react";

/**
 * Bespoke quill: a feather drawn on the diagonal with its central vein, over
 * a short written line. The "Patristic commentary" glyph (the Fathers'
 * words set beside the text). Inherits `currentColor`.
 */
export function Quill({
  size = 22,
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
      {/* feather outline */}
      <path d="M18 4.5 C11 5.5 7 10.5 6.4 17.4 C13.2 16.9 17.4 11.5 18 4.5 Z" />
      {/* central vein, down to the nib */}
      <path d="M16.6 6.4 L7.4 16.4" />
      {/* written line beneath the nib */}
      <line x1="9" y1="20" x2="16" y2="20" />
    </svg>
  );
}
