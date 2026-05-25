import type { SVGProps } from "react";

/**
 * Two horizontal sliders, lightweight settings glyph. Used in the
 * mobile Bible reader top bar to open the ReaderSettingsMenu in a
 * bottom sheet. Inherits `currentColor`.
 */
export function Settings({
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
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 7h10" />
      <path d="M20 7h-2" />
      <circle cx="16" cy="7" r="2" />
      <path d="M4 17h4" />
      <path d="M20 17h-6" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}
