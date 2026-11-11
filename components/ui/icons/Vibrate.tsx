import type { SVGProps } from "react";

/**
 * A phone with its click at either side, for Clicks as you scroll in
 * Settings (1.9). Drawn in the stroke of the rest of the set. Inherits
 * `currentColor`.
 */
export function Vibrate({
  size = 24,
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
      <rect x="8" y="3.5" width="8" height="17" rx="2" />
      <path d="M11 17.2h2" />
      <path d="M4.8 9.2v5.6" />
      <path d="M2.5 10.7v2.6" />
      <path d="M19.2 9.2v5.6" />
      <path d="M21.5 10.7v2.6" />
    </svg>
  );
}
