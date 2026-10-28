import type { SVGProps } from "react";

/**
 * Three dots in a row: more, on a round button (1.8, the Bible reader's
 * plate beside Aa, round 2 B of the owner's picks). Drawn solid, so the dots
 * hold their weight at 20px. Inherits `currentColor`.
 */
export function More({
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}
