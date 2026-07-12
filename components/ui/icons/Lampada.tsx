import type { SVGProps } from "react";

/**
 * A hanging vigil lamp (lampada) with a flame: the "lit" glyph for today and
 * for fast-free days. Inherits `currentColor`.
 */
export function Lampada({
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
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* suspension chains */}
      <path d="M12 2.5 L7.5 7" />
      <path d="M12 2.5 L16.5 7" />
      <path d="M12 2.5 v1.6" />
      {/* the bowl of oil */}
      <path d="M6.5 8 C6.5 14, 9 16.5, 12 16.5 C15 16.5, 17.5 14, 17.5 8 Z" />
      <path d="M6.5 8 H17.5" />
      {/* flame */}
      <path d="M12 16.5 C13 18, 13.4 19.4, 12 21.5 C10.6 19.4, 11 18, 12 16.5 Z" />
    </svg>
  );
}
