import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

// Mirrors app/(app)/saints/page.tsx: masthead, search field, then the card
// grid. The grid here previously drew a 2/3/4-column stack of vertical
// tiles while SaintCard renders a 1/2/3-column grid of horizontal cards, so
// the layout visibly jumped when the real content arrived. Same shape now.
export default function SaintsLoading() {
  return (
    // Padding must track app/(app)/saints/page.tsx exactly, or the masthead
    // jumps when the real content swaps in.
    <section className="bg-night px-5 md:px-8 pt-8 pb-12 md:py-24">
      <div className="mx-auto max-w-[1200px] w-full cascade">
        <Skeleton weight="strong" className="h-3 w-20" />
        <Skeleton weight="strong" className="mt-4 h-12 md:h-14 w-72" />
        <SkeletonText lines={2} className="mt-6 max-w-[640px]" />
        <Skeleton
          weight="mid"
          rounded="rounded-pill"
          className="mt-8 h-12 w-full max-w-[640px]"
        />

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/8 p-5 flex gap-5"
            >
              <Skeleton
                weight="mid"
                rounded="rounded-full"
                className="h-14 w-14 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-2.5">
                <Skeleton weight="strong" className="h-5 w-[80%]" />
                <Skeleton weight="faint" className="h-3 w-[55%]" />
                <Skeleton weight="faint" className="h-3 w-full" />
                <Skeleton weight="faint" className="h-3 w-[70%]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
