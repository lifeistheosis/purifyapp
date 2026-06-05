import type { SVGProps } from "react";

/**
 * Bespoke domed church: a cross-finialed onion dome over a walled nave with
 * an arched door, on a stepped base. The "Councils" glyph. Inherits
 * `currentColor` and shares the 1.6 stroke of the library-icon set.
 */
export function Church({
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
      {/* cross finial */}
      <line x1="12" y1="1.8" x2="12" y2="4.4" />
      <line x1="10.9" y1="2.9" x2="13.1" y2="2.9" />
      {/* onion dome */}
      <path d="M12 4.4 C9.6 5.9 9.7 8.1 12 9.2 C14.3 8.1 14.4 5.9 12 4.4 Z" />
      {/* nave walls */}
      <path d="M7.5 20.5 V10.8 H16.5 V20.5" />
      {/* arched door */}
      <path d="M10.3 20.5 V15.4 C10.3 13.7 13.7 13.7 13.7 15.4 V20.5" />
      {/* stepped base, wider than the walls */}
      <line x1="6" y1="20.5" x2="18" y2="20.5" />
    </svg>
  );
}
