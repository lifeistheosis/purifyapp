import type { SVGProps } from "react";

/**
 * Bespoke two-rail sliders glyph for the reader settings control. Matches
 * the custom line-art set instead of pulling lucide-react's Settings2, so
 * the reader chrome stays in the app's own hand. Inherits `currentColor`;
 * size via the `size` prop or a Tailwind `h-`/`w-` className.
 */
export function Sliders({
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
      <line x1="3.5" y1="8" x2="20.5" y2="8" />
      <circle cx="9" cy="8" r="2.1" fill="currentColor" stroke="none" />
      <line x1="3.5" y1="16" x2="20.5" y2="16" />
      <circle cx="15" cy="16" r="2.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
