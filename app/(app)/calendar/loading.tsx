import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton";

/**
 * The route-level loading state.
 *
 * The same component the client body renders while it resolves the reader's
 * local day, so the two cannot drift. A skeleton that does not match the thing
 * replacing it is worse than no skeleton: it promises a shape and then moves
 * it, which is exactly what this file used to do.
 */
export default function CalendarLoading() {
  return <CalendarSkeleton />;
}
