import type { SVGProps } from "react";

/**
 * A cloud and falling rain, for the Rain sound of ambience (1.7). Drawn in
 * the stroke of the rest of the set. Inherits `currentColor`.
 */
export function Rain({
  size = 24,
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
      <path d="M7.2 15.2h9.6a3.6 3.6 0 0 0 .3-7.2 5.2 5.2 0 0 0-9.9.4 3.4 3.4 0 0 0 0 6.8z" />
      <path d="M8.6 18.2 7.8 20.4" />
      <path d="M12.4 18.2l-.8 2.2" />
      <path d="M16.2 18.2l-.8 2.2" />
    </svg>
  );
}
