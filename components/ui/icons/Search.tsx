import type { SVGProps } from "react";

/**
 * Bespoke magnifier. Same line-art vocabulary as the rest of the custom
 * glyph set (Codex, Orans, Octogram), so search inputs read in the app's
 * own hand rather than reaching for lucide-react. Inherits `currentColor`;
 * size via the `size` prop or a Tailwind `h-`/`w-` className.
 */
export function Search({
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
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.5" y1="15.5" x2="21" y2="21" />
    </svg>
  );
}
