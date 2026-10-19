import type { SVGProps } from "react";

/** Stop, a solid rounded square: ends a preview. Inherits `currentColor`. */
export function Stop({
  size = 14,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
