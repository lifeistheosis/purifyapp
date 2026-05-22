import type { SVGProps } from "react";

/**
 * A radiant halo: a ring with short rays. Marks a feast and sits behind the
 * day number / saint icon as a "hallowed" glyph. Inherits `currentColor`.
 */
export function Halo({
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
      <circle cx="12" cy="12" r="6.5" />
      {/* twelve short rays */}
      <line x1="12" y1="1.5" x2="12" y2="3.4" />
      <line x1="12" y1="20.6" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="3.4" y2="12" />
      <line x1="20.6" y1="12" x2="22.5" y2="12" />
      <line x1="4.6" y1="4.6" x2="5.9" y2="5.9" />
      <line x1="18.1" y1="18.1" x2="19.4" y2="19.4" />
      <line x1="19.4" y1="4.6" x2="18.1" y2="5.9" />
      <line x1="5.9" y1="18.1" x2="4.6" y2="19.4" />
    </svg>
  );
}
