import type { SVGProps } from "react";

/**
 * Two sheets, one over the other: "copy these words". For Purify's own copy
 * controls, which in the phone apps are the only ones (the system's text
 * selection is off there; see lib/ui/pressCopy.ts). Line art in the set's own
 * weight, like LinkChain beside it, which is "copy the link". Inherits
 * `currentColor`.
 */
export function Copy({
  size = 18,
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
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.4" />
      <path d="M15.5 8.5V6.4A2.4 2.4 0 0 0 13.1 4H6.4A2.4 2.4 0 0 0 4 6.4v6.7a2.4 2.4 0 0 0 2.4 2.4h2.1" />
    </svg>
  );
}
