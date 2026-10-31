import type { SVGProps } from "react";

/**
 * A leaf of days with one ticked: the reading plans, a chapter a day kept
 * (1.8, the door at the foot of the Bible's books sheet, r3-20 A). Drawn on
 * the family's 1.6 stroke. Calendar.tsx is the Church's calendar, with its
 * crosses; this is a plan's days. Inherits `currentColor`.
 */
export function CalendarCheck({
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
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
      <path d="M8 14.2l2.2 2.2 4.6-4.6" />
    </svg>
  );
}
