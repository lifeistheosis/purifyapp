import type { SVGProps } from "react";

/**
 * Minimal hand-drawn Instagram mark. Used in the Footer community strip
 * and on the support page community card. Inherits `currentColor` so the
 * icon takes the same tone as its surrounding text.
 */
export function Instagram({
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
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* rounded square camera body */}
      <rect x="3" y="3" width="18" height="18" rx="5" />
      {/* lens */}
      <circle cx="12" cy="12" r="4.25" />
      {/* corner dot */}
      <circle cx="17.25" cy="6.75" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
