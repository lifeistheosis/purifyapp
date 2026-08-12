import { Suspense } from "react";

import { CalendarClient } from "@/components/calendar/CalendarClient";
import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton";

export const metadata = {
  title: "Orthodox Calendar",
  description:
    "Today's saint, today's fast, and the month at a glance, following the New (Revised Julian) calendar.",
};

/**
 * A server shell. Everything day-dependent moved to CalendarClient.
 *
 * This file used to be the whole page, ~500 lines resolving the day, the
 * month, the commemorations, the fast and the readings on the server. On the
 * website that was correct and hourly ISR kept it fresh. In the native export
 * it was not: `output: "export"` has no server, so the day was answered once
 * at build time and `searchParams` are forced empty, which meant neither
 * `?today=` nor month navigation ever arrived. /calendar showed the build day,
 * in the build month, for the life of the install, and no amount of tapping
 * moved it.
 *
 * Today, the Bible tab and /prayers/today were converted to the client date
 * path in Beta 2.7; this was the one left behind, with a named exemption in
 * lib/calendar/__tests__/noFrozenDay.test.ts recording the debt. That
 * exemption is now gone, so the test fails if this ever regresses.
 *
 * `revalidate` is deliberately absent. It only ever meant anything on the web,
 * and now that the day is resolved on the device it means nothing there
 * either: the shell has no day-dependent output to revalidate.
 *
 * The Suspense boundary is required, not decorative: CalendarClient calls
 * useSearchParams, and Next will not prerender a route containing an unbounded
 * useSearchParams without one. The fallback is the same skeleton the client
 * renders while it resolves the local day, so the shape does not change twice.
 */
export default function CalendarPage() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarClient />
    </Suspense>
  );
}
