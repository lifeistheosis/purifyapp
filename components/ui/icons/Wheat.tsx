import type { SVGProps } from "react";

/**
 * A stalk of wheat: the austere glyph for strict and plain fast days
 * (bread and the dry table). Inherits `currentColor`.
 */
export function Wheat({
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
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* central stem */}
      <path d="M12 21.5 V7" />
      {/* tip grain */}
      <path d="M12 7 C10.7 8, 10.7 9.6, 12 10.6 C13.3 9.6, 13.3 8, 12 7 Z" />
      {/* three pairs of grains down the stalk */}
      <path d="M12 10.5 C10.4 11, 9.4 12.2, 9.4 13.8 C11 13.4, 12 12.2, 12 10.5 Z" />
      <path d="M12 10.5 C13.6 11, 14.6 12.2, 14.6 13.8 C13 13.4, 12 12.2, 12 10.5 Z" />
      <path d="M12 13.6 C10.4 14.1, 9.4 15.3, 9.4 16.9 C11 16.5, 12 15.3, 12 13.6 Z" />
      <path d="M12 13.6 C13.6 14.1, 14.6 15.3, 14.6 16.9 C13 16.5, 12 15.3, 12 13.6 Z" />
    </svg>
  );
}
