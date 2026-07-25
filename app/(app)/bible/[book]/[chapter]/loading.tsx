import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function ChapterLoading() {
  return (
    <div className="bg-night flex">
      {/* Sidebar placeholder (desktop only). */}
      <aside className="hidden md:block w-[240px] shrink-0 border-r border-white/8 self-stretch">
        <div className="px-5 py-8 space-y-4">
          <Skeleton weight="strong" className="h-3 w-24" />
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="h-7 rounded bg-paper/5 animate-pulse" />
            ))}
          </div>
        </div>
      </aside>

      <section className="flex-1 px-5 md:px-10 pt-14 md:pt-16 pb-10 md:pb-16 min-w-0">
        <div className="mx-auto max-w-[1200px] w-full cascade">
          {/* Chrome shimmer */}
          <div className="mb-8 flex gap-3 flex-wrap">
            <Skeleton weight="mid" rounded="rounded-pill" className="h-9 w-32" />
            <Skeleton weight="mid" rounded="rounded-pill" className="h-9 w-40" />
            <Skeleton weight="mid" rounded="rounded-pill" className="h-9 w-24" />
          </div>

          {/* Header shimmer */}
          <div className="mb-10 space-y-3">
            <Skeleton weight="strong" className="h-3 w-24" />
            <Skeleton weight="strong" className="h-12 md:h-14 w-64" />
          </div>

          {/* Verse shimmers */}
          <div className="cascade space-y-5 max-w-[780px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonText key={i} lines={3} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
