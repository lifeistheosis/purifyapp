import type { SVGProps } from "react";

/**
 * Bells, a pair: Ambience's Cathedral bells (1.9). Bell and stillness and
 * Cathedral bells both wore the one Bell, so the sheet showed two sounds as
 * the same tile. Drawn in Bell's hand: one round-capped stroke, no fill, the
 * second bell hung a little higher, as bells in a tower ring out of step.
 * Inherits `currentColor`.
 */
export function Bells({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
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
      <path d="M4 11a3 3 0 0 1 6 0c0 2.4.7 3.3 1.2 3.8H2.8c.5-.5 1.2-1.4 1.2-3.8Z" />
      <path d="M6 17.3a1.1 1.1 0 0 0 2 0" />
      <path d="M14 9a3 3 0 0 1 6 0c0 2.4.7 3.3 1.2 3.8h-8.4c.5-.5 1.2-1.4 1.2-3.8Z" />
      <path d="M16 15.3a1.1 1.1 0 0 0 2 0" />
    </svg>
  );
}
