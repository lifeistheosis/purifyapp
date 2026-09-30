import type { SVGProps } from "react";

/**
 * Cross-references: one verse joined to the passages it echoes, drawn as a
 * small web of three. Inherits `currentColor`.
 */
export function CrossRefs({
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
      <rect x="3" y="9.5" width="6" height="5" rx="1.2" />
      <rect x="15" y="3.5" width="6" height="5" rx="1.2" />
      <rect x="15" y="15.5" width="6" height="5" rx="1.2" />
      <path d="M9 11.2c2.6 0 3.2-5.2 6-5.2" />
      <path d="M9 12.8c2.6 0 3.2 5.2 6 5.2" />
    </svg>
  );
}
