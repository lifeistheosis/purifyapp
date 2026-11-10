import type { SVGProps } from "react";

/**
 * Play, a solid triangle. The player's own controls draw the same shape
 * (components/prayers/NowPlayingBar.tsx). Its weight sits left of the box's
 * centre, so a caller centring it in a round button may nudge it right a
 * pixel. Inherits `currentColor`.
 *
 * `centered` draws it with its weight on the box's centre instead (build 89,
 * the reader's dock): the triangle moved right by the 0.83 of the 24 its
 * centroid stood short. It needs no nudge, and so none that Arabic would
 * read as a side: a play mark is not mirrored, so a nudge right stays right.
 */
export function Play({
  size = 18,
  centered = false,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; centered?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d={centered ? "M7.83 4.5v15l12.5-7.5L7.83 4.5z" : "M7 4.5v15l12.5-7.5L7 4.5z"} />
    </svg>
  );
}
