import type { SVGProps } from "react";

/**
 * Small lightning-bolt glyph used on the mobile top bar for the
 * prayer-rule streak count. Same currentColor convention as the rest
 * of the icon set.
 */
export function Bolt({
  size = 16,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}
