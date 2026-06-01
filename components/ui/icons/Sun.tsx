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
      {/* half-sun resting on the horizon */}
      <path d="M7.4 16.5 a4.6 4.6 0 0 1 9.2 0" />
      {/* horizon, with a fainter ground line beneath */}
      <line x1="3" y1="16.5" x2="21" y2="16.5" />
      <line x1="6.5" y1="20" x2="17.5" y2="20" strokeOpacity="0.5" />
      {/* three rays above the dome */}
      <line x1="12" y1="3.4" x2="12" y2="5.6" />
      <line x1="5.5" y1="6.4" x2="7" y2="7.9" />
      <line x1="18.5" y1="6.4" x2="17" y2="7.9" />
    </svg>
  );
}
