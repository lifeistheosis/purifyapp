import type { SVGProps } from "react";

/**
 * The ichthys: the glyph for fish-allowed fast days. Inherits `currentColor`.
 */
export function Fish({
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
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* body */}
      <path d="M3 12 C7 6.5, 14 6.5, 18 12 C14 17.5, 7 17.5, 3 12 Z" />
      {/* tail */}
      <path d="M18 12 L22 8.5 V15.5 Z" />
      {/* eye */}
      <circle cx="7.5" cy="11" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
