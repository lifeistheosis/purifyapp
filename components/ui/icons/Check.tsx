import type { SVGProps } from "react";

/** Confirmation check for copied / saved / done states. Inherits
 *  `currentColor`. */
export function Check({
  size = 18,
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
      {/* pathLength normalises the stroke to 1 unit, so the `.check-draw`
          keyframes in globals.css can dash it exactly at any icon size
          without knowing this path's real length. Add `check-draw` to the
          svg's className to have a confirmation draw itself in. */}
      <path d="M5 12.5l4.4 4.4L19 7.2" pathLength={1} />
    </svg>
  );
}
