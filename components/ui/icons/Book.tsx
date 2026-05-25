import type { SVGProps } from "react";

/**
 * Minimal open book. Used as the "Bible" tab icon in the mobile tab bar.
 * Inherits `currentColor`.
 */
export function Book({
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
      {/* Spine and the two pages opening outward */}
      <path d="M12 5.4v14" />
      <path d="M12 5.4C10 4.4 7.6 4 4.5 4v13.4c3.1 0 5.5.4 7.5 1.4" />
      <path d="M12 5.4c2-1 4.4-1.4 7.5-1.4v13.4c-3.1 0-5.5.4-7.5 1.4" />
    </svg>
  );
}
