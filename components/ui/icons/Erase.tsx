import type { SVGProps } from "react";

/**
 * Backspace-style eraser for "clear word highlights". Replaces the ⌫ glyph.
 * Inherits `currentColor`.
 */
export function Erase({
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
      <path d="M8.6 5.5h10.2A1.7 1.7 0 0 1 20.5 7.2v9.6a1.7 1.7 0 0 1-1.7 1.7H8.6L3.5 12l5.1-6.5z" />
      <line x1="11.5" y1="9.8" x2="15.9" y2="14.2" />
      <line x1="15.9" y1="9.8" x2="11.5" y2="14.2" />
    </svg>
  );
}
