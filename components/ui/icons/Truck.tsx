import type { SVGProps } from "react";

/** A delivery van, for shipping lines in the shop. Inherits `currentColor`. */
export function Truck({
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
      {/* the load box, then the cab */}
      <path d="M2.8 6.2h10.4v9.6H2.8z" />
      <path d="M13.2 9.4h4.1l3 3.3v3.1h-7.1" />
      <circle cx="6.6" cy="17.4" r="1.7" />
      <circle cx="17" cy="17.4" r="1.7" />
    </svg>
  );
}
