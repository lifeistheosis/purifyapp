import type { SVGProps } from "react";

/**
 * A picture: the verse strip's Image (1.9), which makes a picture of the
 * verse (components/share/PictureSheet.tsx). Drawn in the hand of Bell and
 * Share: one round-capped stroke, no fill. Inherits `currentColor`.
 */
export function Picture({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="9.5" r="1.6" />
      <path d="m4 17 5-4.5 4 3.5 2.5-2 4.5 3.5" />
    </svg>
  );
}
