import type { SVGProps } from "react";

/**
 * Orans figure — the standing posture with both arms raised, used for
 * prayer across early Christian and Orthodox iconography (catacomb
 * frescoes, the Platytera Theotokos). Replaces the generic praying-
 * palms gesture, which is a Western devotional posture not native to
 * Orthodox prayer.
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
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* small halo */}
      <circle cx="12" cy="5" r="2.3" />
      {/* head ring (subtle extra crown) */}
      <circle cx="12" cy="5" r="3.2" strokeOpacity="0.45" />
      {/* torso */}
      <line x1="12" y1="7.6" x2="12" y2="17" />
      {/* raised arms, palms-out */}
      <path d="M12 8.5 L7.5 12 L6 16" />
      <path d="M12 8.5 L16.5 12 L18 16" />
      {/* hem of the robe */}
      <path d="M8.5 21 L12 17 L15.5 21" />
    </svg>
  );
}
