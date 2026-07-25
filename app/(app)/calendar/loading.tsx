import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function CalendarLoading() {
  return (
    <div className="bg-night px-5 md:px-8 py-12 md:py-16">
      <div className="mx-auto max-w-[1100px] w-full grid lg:grid-cols-[minmax(0,1fr)_360px] gap-10">
        {/* Month grid. The 42 day cells are deliberately NOT cascaded: a
            calendar reads as one object, and staggering it row by row draws
            the eye across the grid instead of to the month title. */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <Skeleton weight="strong" className="h-8 w-40" />
            <div className="flex gap-2">
              <Skeleton weight="mid" rounded="rounded-pill" className="h-9 w-9" />
              <Skeleton weight="mid" rounded="rounded-pill" className="h-9 w-9" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 42 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded bg-paper/5 animate-pulse"
              />
            ))}
          </div>
        </div>

        {/* Feast panel */}
        <aside className="cascade space-y-4">
          <Skeleton weight="strong" className="h-3 w-24" />
          <Skeleton weight="strong" className="h-7 w-[70%]" />
          <SkeletonText lines={3} />
        </aside>
      </div>
    </div>
  );
}
