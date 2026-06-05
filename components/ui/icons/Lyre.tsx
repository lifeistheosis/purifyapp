import type { SVGProps } from "react";

/**
 * Bespoke lyre: two curved arms rising from a rounded soundbox, a yoke
 * across the top, and the strings between. The "Psalter" glyph (the
 * hundred-fifty psalms sung to the harp). Inherits `currentColor`.
 */
export function Lyre({
  size = 22,
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
      {/* soundbox / bridge */}
      <path d="M8.5 18.3 C10.2 20.4 13.8 20.4 15.5 18.3" />
      {/* left arm, curling out at the top */}
      <path d="M8.5 18.3 C6 15 6 9.6 9 7.6 C9.9 7 8.8 6 8.2 6.9" />
      {/* right arm, curling out at the top */}
      <path d="M15.5 18.3 C18 15 18 9.6 15 7.6 C14.1 7 15.2 6 15.8 6.9" />
      {/* yoke / crossbar */}
      <line x1="9" y1="8.4" x2="15" y2="8.4" />
      {/* strings */}
      <line x1="10.4" y1="8.4" x2="10.4" y2="17.6" />
      <line x1="12" y1="8.4" x2="12" y2="18" />
      <line x1="13.6" y1="8.4" x2="13.6" y2="17.6" />
    </svg>
  );
}
