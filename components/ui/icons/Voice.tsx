import type { SVGProps } from "react";

/**
 * A voice: a head and shoulders with the sound of speaking before it, for the
 * player's Voice row and sheet (1.9, build 95 note 25, the phone's own
 * voices). Drawn in the stroke of the rest of the set, beside the Sound and
 * Timer marks of the same sheet, and like them it does not turn in a
 * right-to-left language. Inherits `currentColor`.
 */
export function Voice({
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
      <circle cx="9" cy="8.2" r="3.4" />
      <path d="M3 20.2c0-3.4 2.7-5.8 6-5.8s6 2.4 6 5.8" />
      <path d="M15.6 6a3.6 3.6 0 0 1 0 4.6" />
      <path d="M18.4 3.6a7.2 7.2 0 0 1 0 9.4" />
    </svg>
  );
}
