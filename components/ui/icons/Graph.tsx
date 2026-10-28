import type { SVGProps } from "react";

/**
 * Three saints joined to one in the middle: the saint web (1.8), on its door
 * on a saint's page and on the Web side of its switch. Drawn in the stroke of
 * the rest of the set. Inherits `currentColor`.
 */
export function Graph({
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
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="12" cy="20" r="2" />
      <path d="M6.6 7.2l3.6 3.3M17.4 7.2l-3.6 3.3M12 14.5V18" />
    </svg>
  );
}
