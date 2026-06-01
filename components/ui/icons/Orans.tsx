import type { SVGProps } from "react";

/**
 * Orans figure — the standing posture with both arms raised, used for
 * prayer across early Christian and Orthodox iconography (catacomb
 * frescoes, the Platytera Theotokos). Drawn with a haloed head and a
 * flared robe silhouette (not a stick figure) so it reads as a vested
 * figure at small size. Shares the 1.6 stroke of the tab-bar set.
 */
export function Orans({
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
      {/* halo */}
      <circle cx="12" cy="4.6" r="2.5" strokeOpacity="0.5" />
      {/* head */}
      <circle cx="12" cy="4.6" r="1.7" />
      {/* raised arms, curving up and out from the shoulders */}
      <path d="M9.4 10.2 C8.1 8.5 7.1 7.2 6.3 5.9" />
      <path d="M14.6 10.2 C15.9 8.5 16.9 7.2 17.7 5.9" />
      {/* robe: shoulders flaring to a wide hem */}
      <path d="M9.4 10.2 L7.6 20 L16.4 20 L14.6 10.2 Z" />
      {/* center seam of the robe */}
      <line x1="12" y1="10.6" x2="12" y2="19" strokeOpacity="0.5" />
    </svg>
  );
}
