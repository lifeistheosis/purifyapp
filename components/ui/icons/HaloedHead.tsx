import type { SVGProps } from "react";

/**
 * Haloed head silhouette — a face inside a halo ring with eight small
 * radiating points. Reads as a saint's portrait icon at small size and
 * communicates personhood-before-God for the You tab. Replaces the
 * generic User glyph (a circle-and-shoulders shape used in every app).
 */
export function HaloedHead({
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
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* halo ring */}
      <circle cx="12" cy="10" r="6" />
      {/* head silhouette inside the halo */}
      <circle cx="12" cy="10" r="3.4" strokeOpacity="0.85" />
      {/* eight radiating points around the halo */}
      <line x1="12" y1="2.4" x2="12" y2="3.6" />
      <line x1="12" y1="16.4" x2="12" y2="17.6" />
      <line x1="4.4" y1="10" x2="5.6" y2="10" />
      <line x1="18.4" y1="10" x2="19.6" y2="10" />
      <line x1="6.6" y1="4.6" x2="7.5" y2="5.5" />
      <line x1="16.5" y1="14.5" x2="17.4" y2="15.4" />
      <line x1="17.4" y1="4.6" x2="16.5" y2="5.5" />
      <line x1="7.5" y1="14.5" x2="6.6" y2="15.4" />
      {/* shoulders, faint */}
      <path d="M6 21 C 8 18.5, 16 18.5, 18 21" strokeOpacity="0.55" />
    </svg>
  );
}
