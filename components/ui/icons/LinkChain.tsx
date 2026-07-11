import type { SVGProps } from "react";

/**
 * Chain link for "copy link" controls. Replaces the 🔗 emoji in the verse
 * tools row, which rendered as a color emoji on Android and broke the
 * line-art vocabulary. Inherits `currentColor`.
 */
export function LinkChain({
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
      <path d="M10.6 13.4 8 16a3.4 3.4 0 0 1-4.8-4.8l2.6-2.6a3.4 3.4 0 0 1 4.8 0" />
      <path d="M13.4 10.6 16 8a3.4 3.4 0 0 1 4.8 4.8l-2.6 2.6a3.4 3.4 0 0 1-4.8 0" />
      <line x1="9.8" y1="14.2" x2="14.2" y2="9.8" />
    </svg>
  );
}
