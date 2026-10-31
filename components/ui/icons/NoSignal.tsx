import type { SVGProps } from "react";

/**
 * Four signal bars, struck through: no connection. The search's line that
 * says it is searching what Purify keeps on the phone (1.8, r3-12).
 * Inherits `currentColor`.
 */
export function NoSignal({
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
      <path d="M4.5 19.5v-2" />
      <path d="M9 19.5v-5" />
      <path d="M13.5 19.5v-8" />
      <path d="M18 19.5V9" />
      <line x1="3" y1="4" x2="20.5" y2="21.5" />
    </svg>
  );
}
