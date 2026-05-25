import type { SVGProps } from "react";

/**
 * Compass with a kite-shaped needle. Used as the "Discover" tab icon
 * in the mobile tab bar. Inherits `currentColor`.
 */
export function Compass({
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
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M15.4 8.6l-2 5.4-5.4 2 2-5.4 5.4-2z" />
    </svg>
  );
}
