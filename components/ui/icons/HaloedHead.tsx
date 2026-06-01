import type { SVGProps } from "react";

/**
 * Haloed bust — a head with a halo ring and shoulders, used for the
 * "You" tab. Reads as a saint's portrait icon (personhood-before-God)
 * rather than the generic user glyph. The earlier version had eight
 * radiating points, which made it a near-twin of the rayed "Sun" icon;
 * the rays are gone and the shoulders are emphasised so it reads as a
 * person. Shares the 1.6 stroke of the tab-bar set.
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
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* halo ring behind the head */}
      <circle cx="12" cy="8.5" r="4.7" strokeOpacity="0.55" />
      {/* head */}
      <circle cx="12" cy="8.5" r="2.7" />
      {/* shoulders / bust */}
      <path d="M5.4 20.5 C6.6 16.4 17.4 16.4 18.6 20.5" />
    </svg>
  );
}
