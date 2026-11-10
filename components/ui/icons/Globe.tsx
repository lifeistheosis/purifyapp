import type { SVGProps } from "react";

/**
 * The whole Community: who can read what is being written, beside the button
 * that sends it. Drawn as the page for a new post draws its own
 * (components/community/ComposePage.tsx), for the page that starts a prayer
 * campaign (1.9.1). Inherits `currentColor`.
 */
export function Globe({
  size = 15,
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
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.4 12h17.2" />
      <path d="M12 3.4c2.3 2.4 3.5 5.3 3.5 8.6s-1.2 6.2-3.5 8.6c-2.3-2.4-3.5-5.3-3.5-8.6s1.2-6.2 3.5-8.6z" />
    </svg>
  );
}
