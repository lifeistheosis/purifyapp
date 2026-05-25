import type { SVGProps } from "react";

/**
 * Minimal head + shoulders silhouette. Used as the "You" tab icon in the
 * mobile tab bar. Inherits `currentColor`.
 */
export function User({
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
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.2c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
    </svg>
  );
}
