import type { SVGProps } from "react";

/**
 * Rising sun over a horizon — the dawning of the liturgical day, used as
 * the "Today" tab icon. Deliberately NOT the generic full-disc-with-8-rays
 * weather glyph (which also collided visually with the haloed "You" icon);
 * a half-disc on a horizon line reads specifically as daybreak. Inherits
 * `currentColor` and the shared 1.6 stroke of the tab-bar set.
 */
export function Sun({
  size = 20,
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
      {/* Half-sun resting on the horizon: daybreak, not a full weather disc
          (which collided with the haloed "You" glyph). Rays are symmetric —
          a centre ray plus a mirrored pair each side — so it reads as one
          calm, balanced mark at tab size. */}
      <path d="M7 15.5 a5 5 0 0 1 10 0" />
      <line x1="3.5" y1="15.5" x2="20.5" y2="15.5" />
      {/* five even rays fanning over the dome */}
      <line x1="12" y1="3" x2="12" y2="5.4" />
      <line x1="6" y1="5" x2="7.5" y2="6.9" />
      <line x1="18" y1="5" x2="16.5" y2="6.9" />
      <line x1="3.4" y1="9.4" x2="5.3" y2="10.4" />
      <line x1="20.6" y1="9.4" x2="18.7" y2="10.4" />
    </svg>
  );
}
