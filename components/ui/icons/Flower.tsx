import type { SVGProps } from "react";

/**
 * Simple bloom for "gather to florilegium" (a florilegium is literally a
 * gathering of flowers). Replaces lucide's Flower2 so the action reads in
 * the family's own hand. Inherits `currentColor`.
 */
export function Flower({
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
      <circle cx="12" cy="8.5" r="2.2" />
      <path d="M12 6.3V4.2M14.2 8.5h2.1M12 10.7v2.1M9.8 8.5H7.7" />
      <path d="M13.6 7 15 5.6M13.6 10 15 11.4M10.4 10 9 11.4M10.4 7 9 5.6" />
      <path d="M12 12.8V20M12 20c0-2.6-1.8-4-4-4M12 20c0-2.6 1.8-4 4-4" />
    </svg>
  );
}
