import type { SVGProps } from "react";

/**
 * A shield bearing a small cross: the glyph for Apologetics, the defense of
 * the faith. Inherits `currentColor`.
 */
export function Shield({
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
      {/* the shield body */}
      <path d="M12 2.8 L19 5.4 C19 12.2, 16.8 17.6, 12 21.2 C7.2 17.6, 5 12.2, 5 5.4 Z" />
      {/* the cross on the boss */}
      <path d="M12 7.5 V14" />
      <path d="M9.4 9.8 H14.6" />
    </svg>
  );
}
