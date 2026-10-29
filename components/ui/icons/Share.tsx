import type { SVGProps } from "react";

/**
 * Share, the phone's own mark for it: an arrow rising out of an open tray
 * (1.8, the Verse of the Day's round actions, the owner's pick B of round
 * 10). Inherits `currentColor`.
 */
export function Share({
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
      <path d="M12 15V3.5" />
      <path d="M7.5 8 12 3.5 16.5 8" />
      <path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5" />
    </svg>
  );
}
