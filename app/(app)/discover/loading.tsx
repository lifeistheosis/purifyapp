import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

/**
 * Discover is an `async` server component: it awaits the locale and the full
 * topic registry before it can render anything, and until now that wait was a
 * blank night surface. This mirrors the real shape of the screen, so the swap
 * to content is a change of contents rather than a change of layout.
 *
 * `cascade cascade-tight` for the same reason: the placeholders arrive in the
 * same order and at the same pace the real rows will.
 */
export default function DiscoverLoading() {
  return (
    <div className="bg-night">
      {/* Header strip: the title and the trailing avatar. */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <Skeleton weight="strong" className="h-6 w-32" />
        <div className="flex shrink-0 items-center gap-3">
          <Skeleton weight="mid" rounded="rounded-pill" className="h-7 w-20" />
          <Skeleton weight="strong" rounded="rounded-full" className="h-8 w-8" />
        </div>
      </div>

      <div className="cascade cascade-tight px-5 pt-6 pb-10">
        {/* SectionMasthead plate. */}
        <Skeleton weight="mid" rounded="rounded-2xl" className="aspect-[16/9] w-full" />

        {/* The ornament and the italic subtitle under it. */}
        <div className="mt-7 flex flex-col items-center gap-3">
          <Skeleton weight="faint" className="h-3 w-[220px]" />
          <Skeleton weight="faint" className="h-4 w-[75%] max-w-[420px]" />
        </div>

        {/* Reading hub card. */}
        <Skeleton weight="mid" rounded="rounded-2xl" className="mt-7 h-[132px] w-full" />

        {/* "The library" label + the tile grid. Not cascaded inside: six
            identical tiles in a grid have no reading order to reinforce. */}
        <div className="mt-7">
          <Skeleton weight="strong" className="h-3 w-24" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} weight="faint" rounded="rounded-[22px]" className="h-[92px]" />
            ))}
          </div>
        </div>

        {/* Featured today. */}
        <div className="mt-8 space-y-3">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    </div>
  );
}
