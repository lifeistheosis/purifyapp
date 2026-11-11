import type { SVGProps } from "react";

/**
 * An open eye and a closed one, for showing and hiding a password (1.9,
 * fresh eyes M6: the field showed a typed emoji, which no palette colours
 * and which stayed on the right in Arabic). Same line-art hand as the rest
 * of the set; inherits `currentColor`.
 */
export function Eye({
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
      <path d="M2.6 12c2.1-3.9 5.4-6.2 9.4-6.2s7.3 2.3 9.4 6.2c-2.1 3.9-5.4 6.2-9.4 6.2S4.7 15.9 2.6 12z" />
      <circle cx="12" cy="12" r="2.9" />
    </svg>
  );
}

/** The eye closed, its lashes down: the password is shown, and this hides it. */
export function EyeClosed({
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
      <path d="M2.8 10.2c2.3 2.9 5.4 4.5 9.2 4.5s6.9-1.6 9.2-4.5" />
      <path d="M12 14.7v2.6" />
      <path d="M7.4 13.7l-1.3 2.3" />
      <path d="M16.6 13.7l1.3 2.3" />
      <path d="M4.2 11.9l-1.9 1.6" />
      <path d="M19.8 11.9l1.9 1.6" />
    </svg>
  );
}
