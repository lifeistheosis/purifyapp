import type { SVGProps } from "react";

/**
 * Play, a solid triangle. The player's own controls draw the same shape
 * (components/prayers/NowPlayingBar.tsx). Its weight sits left of the box's
 * centre, so a caller centring it in a round button may nudge it right a
 * pixel. Inherits `currentColor`.
 */
export function Play({
  size = 18,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7 4.5v15l12.5-7.5L7 4.5z" />
    </svg>
  );
}
