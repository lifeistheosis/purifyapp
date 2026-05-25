import type { SVGProps } from "react";

/**
 * Hand-drawn rising sun. Used as the "Today" tab icon in the mobile
 * tab bar. Inherits `currentColor`.
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
      <circle cx="12" cy="12" r="4.25" />
      <path d="M12 3v2.2" />
      <path d="M12 18.8V21" />
      <path d="M3 12h2.2" />
      <path d="M18.8 12H21" />
      <path d="M5.6 5.6l1.55 1.55" />
      <path d="M16.85 16.85l1.55 1.55" />
      <path d="M5.6 18.4l1.55-1.55" />
      <path d="M16.85 7.15l1.55-1.55" />
    </svg>
  );
}
