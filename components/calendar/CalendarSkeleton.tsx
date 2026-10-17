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
 *
 * A phone (1.7.1) has a page of its own (PhoneCalendar.tsx), and so a
 * skeleton of its own, chosen here by the same md breakpoint that chooses
 * the page: the reckoning and Today, the month's name and its chevrons, the
 * weekdays, five weeks of days, the line of marks, then the day's date, its
 * fast and the first rows of its saints.
 */
export function CalendarSkeleton() {
  return (
    <>
      <PhoneSkeleton />
      <div className="hidden md:block">
        <DesktopSkeleton />
      </div>
    </>
  );
}

function PhoneSkeleton() {
  return (
    <div className="bg-night pb-10 md:hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <Skeleton weight="mid" rounded="rounded-pill" className="h-[54px] w-[146px]" />
        <Skeleton weight="faint" rounded="rounded-pill" className="h-11 w-[78px]" />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 px-5">
        <Skeleton weight="strong" className="h-6 w-40" />
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton weight="faint" rounded="rounded-full" className="h-11 w-11" />
          <Skeleton weight="faint" rounded="rounded-full" className="h-11 w-11" />
        </div>
      </div>

      <div className="mt-3 px-3">
        <div className="grid grid-cols-7 pb-1.5" aria-hidden>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex h-4 items-center justify-center">
              <div className="h-2.5 w-6 rounded bg-paper/10" />
            </div>
          ))}
        </div>
        {/* Five weeks, the most common month. A six-week month settles one
            row longer, a four-week February one shorter: guessing the month
            before it has loaded would be worse. */}
        <div className="grid grid-cols-7 gap-y-1" aria-hidden>
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="flex h-12 justify-center pt-[3px]">
              <div className="h-[30px] w-[30px] rounded-full bg-paper/[0.05]" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-5">
        {[88, 74, 72, 84, 68].map((w, i) => (
          <Skeleton key={i} weight="faint" className="h-3.5" style={{ width: w }} />
        ))}
      </div>

      <div className="mx-5 mt-6 border-t border-paper/10 pt-6">
        <Skeleton weight="strong" className="h-5 w-[78%]" />
        <div className="mt-4 flex items-start gap-3">
          <Skeleton weight="mid" rounded="rounded-full" className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <Skeleton weight="mid" className="h-4 w-1/2" />
            <Skeleton weight="faint" className="h-3.5 w-[85%]" />
          </div>
        </div>
        <Skeleton weight="faint" className="mt-7 h-3 w-28" />
        <Skeleton weight="faint" rounded="rounded-2xl" className="mt-2 h-[120px] w-full" />
      </div>
    </div>
  );
}

function DesktopSkeleton() {
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
