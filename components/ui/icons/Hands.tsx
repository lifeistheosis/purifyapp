import type { SVGProps } from "react";

/**
 * Two hands meeting in prayer (orans gesture). Used as the "Prayers" tab
 * icon in the mobile tab bar. Inherits `currentColor`.
 */
export function Hands({
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
      {/* Left palm: fingers up, thumb tucked inward */}
      <path d="M9.6 21.2c-2.4-1-3.6-3-3.6-5.4V9.4a1.1 1.1 0 0 1 2.2 0v3.6" />
      <path d="M8.2 12.6V5.6a1.1 1.1 0 0 1 2.2 0v6.6" />
      {/* Right palm mirrored */}
      <path d="M14.4 21.2c2.4-1 3.6-3 3.6-5.4V9.4a1.1 1.1 0 0 0-2.2 0v3.6" />
      <path d="M15.8 12.6V5.6a1.1 1.1 0 0 0-2.2 0v6.6" />
    </svg>
  );
}
