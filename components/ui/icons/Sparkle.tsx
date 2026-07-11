import type { SVGProps } from "react";

/**
 * Four-point spark for the verse highlight toggle. Replaces the ✦ glyph;
 * `filled` renders the active (highlighted) state. Inherits `currentColor`.
 */
export function Sparkle({
  size = 18,
  filled = false,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3.5c.7 4 2.5 5.8 6.5 6.5-4 .7-5.8 2.5-6.5 6.5-.7-4-2.5-5.8-6.5-6.5 4-.7 5.8-2.5 6.5-6.5z" />
    </svg>
  );
}
