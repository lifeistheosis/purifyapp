import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton";
import { AfterAMoment } from "@/components/ui/AfterAMoment";

/**
 * The route-level loading state.
 *
 * The same component the client body renders while it resolves the reader's
 * local day, so the two cannot drift. A skeleton that does not match the thing
 * replacing it is worse than no skeleton: it promises a shape and then moves
 * it, which is exactly what this file used to do.
 */
function CalendarOutline() {
  return <CalendarSkeleton />;
}

// The outline waits a moment before it shows, so a page that is ready at
// once arrives as itself (lib/ui/loadingGrace.ts, 1.9).
export default function CalendarLoading() {
  return (
    <AfterAMoment>
      <CalendarOutline />
    </AfterAMoment>
  );
}
