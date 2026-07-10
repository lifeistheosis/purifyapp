"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  writeCalendarStyleDefault,
  type CalendarStyleDefault,
} from "@/lib/calendar/styleDefault";

/**
 * Calendar reckoning toggle link that also persists the choice.
 *
 * The hrefs alone only change the current visit; the sticky preference
 * cookie would flip the reader back on the next open (the "stuck on old
 * calendar" report from installed-app users). Writing the preference on
 * click makes the toggle authoritative everywhere the cookie is read.
 */
export default function StyleToggleLink({
  href,
  style,
  current,
  className,
  children,
}: {
  href: string;
  style: CalendarStyleDefault;
  current: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className={className}
      onClick={() => writeCalendarStyleDefault(style)}
    >
      {children}
    </Link>
  );
}
