"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
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
 *
 * `replace` and `scroll` (1.7.1) are for the phone's switch: a change of
 * reckoning is a choice made on the calendar, not a page of its own, so it
 * takes no step in the history (Back leaves the calendar) and the screen
 * stays where it is. `onClick` runs after the choice is written; the phone's
 * calendar passes one that moves in place without a navigation.
 */
export default function StyleToggleLink({
  href,
  style,
  current,
  className,
  replace,
  scroll,
  onClick,
  children,
}: {
  href: string;
  style: CalendarStyleDefault;
  current: boolean;
  className?: string;
  replace?: boolean;
  scroll?: boolean;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      replace={replace}
      scroll={scroll}
      aria-current={current ? "true" : undefined}
      className={className}
      onClick={(e) => {
        writeCalendarStyleDefault(style);
        onClick?.(e);
      }}
    >
      {children}
    </Link>
  );
}
