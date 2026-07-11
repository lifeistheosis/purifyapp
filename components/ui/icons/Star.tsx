import type { SVGProps } from "react";

/**
 * Five-point star for bookmarks and ratings. `filled` renders the saved /
 * lit state (fill toggle, the same state language as the shop heart);
 * outline is the resting state. Replaces the ★ / ☆ text glyphs, which
 * varied in weight and baseline across platforms. Inherits `currentColor`.
 */
export function Star({
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
      <path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8L12 3.8z" />
    </svg>
  );
}
