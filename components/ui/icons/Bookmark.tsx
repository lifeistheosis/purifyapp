import type { SVGProps } from "react";

/**
 * Minimal bookmark ribbon. Used in the mobile Bible reader top bar
 * as a stub (no persistence yet, wiring lands in a follow-up).
 * Inherits `currentColor`.
 */
export function Bookmark({
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
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 4h12v17l-6-4.5L6 21V4z" />
    </svg>
  );
}
