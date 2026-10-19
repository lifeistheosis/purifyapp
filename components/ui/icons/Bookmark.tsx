import type { SVGProps } from "react";

/**
 * Minimal bookmark ribbon. Used in the mobile Bible reader top bar and, from
 * 1.7, a saint's Save. `filled` paints the ribbon solid for "saved", the one
 * mark a saved thing carries. Inherits `currentColor`.
 */
export function Bookmark({
  size = 20,
  filled = false,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 4h12v17l-6-4.5L6 21V4z" fill={filled ? "currentColor" : "none"} />
    </svg>
  );
}
