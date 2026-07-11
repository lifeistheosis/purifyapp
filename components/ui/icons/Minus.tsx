import type { SVGProps } from "react";

/** Minus for steppers and remove actions. Inherits `currentColor`. */
export function Minus({
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
      <line x1="5.5" y1="12" x2="18.5" y2="12" />
    </svg>
  );
}
