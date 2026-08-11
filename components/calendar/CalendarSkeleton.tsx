import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/**
 * The calendar's loading state.
 *
 * A skeleton earns its place only if the thing that replaces it lands in the
 * same position. This one used to disagree with the page on nearly every
 * measurement that matters: it was 1100px wide against the page's 1280px, it
 * split the columns minmax(0,1fr)/360px against the page's 1.5fr/1fr, it drew
 * gapped rounded squares where the page draws gapless bordered tiles, and,
 * worst of all, it started at the grid while the real page opens with a hero
 * and a readings band above it. So every entry into /calendar shifted the
 * whole layout down and sideways the moment the page arrived.
 *
 * Anything changed in page.tsx's geometry has to change here too. The order
 * top to bottom is: hero, readings band, then the grid beside the day panel.
 */
export function CalendarSkeleton() {
  return (
    <div className="bg-night">
      {/* Hero / FeastPanel. Roughly the height of a feast card with an icon,
          a title and a couple of lines under it. */}
      <section className="border-b border-paper/10 px-5 md:px-8 py-10 md:py-14">
        <div className="mx-auto w-full max-w-[1280px]">
          <Skeleton weight="mid" className="h-3 w-28" />
          <div className="mt-5 flex gap-5">
            <Skeleton weight="mid" rounded="rounded-md" className="h-[128px] w-[96px] shrink-0" />
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton weight="strong" className="h-7 w-[60%]" />
              <SkeletonText lines={2} />
            </div>
          </div>
        </div>
      </section>

      {/* Today's readings band. */}
      <section className="border-b border-paper/10 bg-night-soft px-5 md:px-8 py-8 md:py-10">
        <div className="mx-auto w-full max-w-[1280px]">
          <Skeleton weight="mid" className="h-3 w-24" />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Skeleton weight="faint" rounded="rounded-md" className="h-24 w-full" />
            <Skeleton weight="faint" rounded="rounded-md" className="h-24 w-full" />
            <Skeleton weight="faint" rounded="rounded-md" className="h-24 w-full" />
          </div>
        </div>
      </section>

      {/* Grid + day panel. Same container, same column ratio, same gaps as
          the page, so nothing moves sideways when the month lands. */}
      <section className="px-5 md:px-8 py-10 md:py-14">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="flex items-baseline justify-between">
            <Skeleton weight="strong" className="h-8 w-44" />
            <Skeleton weight="faint" className="h-4 w-40" />
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 lg:gap-10 items-start">
            <div>
              {/* Weekday header, then the tiles. Gapless and bordered, the
                  way CalendarGrid draws them, so the grid does not reflow. */}
              <div className="grid grid-cols-7 border-t border-l border-paper/12">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="border-r border-b border-paper/12 py-1.5"
                    aria-hidden
                  >
                    <div className="mx-auto h-2.5 w-6 rounded bg-paper/10" />
                  </div>
                ))}
              </div>
              {/* 42 is monthGrid's full six weeks. CalendarGrid trims a
                  trailing all-out-of-month week, so a 35-cell month settles
                  one row shorter; the alternative is guessing the month
                  before it has loaded, which is worse. Deliberately not
                  cascaded: a calendar reads as one object. */}
              <div className="grid grid-cols-7 border-l border-paper/12">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square md:min-h-[84px] border-r border-b border-paper/12 bg-paper/[0.015]"
                    aria-hidden
                  />
                ))}
              </div>
            </div>

            <aside className="cascade space-y-4 rounded-xl border border-paper/12 bg-paper/[0.03] p-6 md:p-7">
              <Skeleton weight="mid" className="h-3 w-24" />
              <Skeleton weight="strong" className="h-7 w-[70%]" />
              <SkeletonText lines={3} />
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
