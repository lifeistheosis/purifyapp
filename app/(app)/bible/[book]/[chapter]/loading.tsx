export default function ChapterLoading() {
  return (
    <div className="bg-night flex">
      {/* Sidebar placeholder (desktop only). */}
      <aside className="hidden md:block w-[240px] shrink-0 border-r border-white/8 self-stretch">
        <div className="px-5 py-8 space-y-4">
          <div className="h-3 w-24 rounded bg-paper/10 animate-pulse" />
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="h-7 rounded bg-paper/5 animate-pulse" />
            ))}
          </div>
        </div>
      </aside>

      <section className="flex-1 px-5 md:px-10 pt-14 md:pt-16 pb-10 md:pb-16 min-w-0">
        <div className="mx-auto max-w-[1200px] w-full">
          {/* Chrome shimmer */}
          <div className="mb-8 flex gap-3 flex-wrap">
            <div className="h-9 w-32 rounded-pill bg-paper/8 animate-pulse" />
            <div className="h-9 w-40 rounded-pill bg-paper/8 animate-pulse" />
            <div className="h-9 w-24 rounded-pill bg-paper/8 animate-pulse" />
          </div>

          {/* Header shimmer */}
          <div className="mb-10 space-y-3">
            <div className="h-3 w-24 rounded bg-paper/10 animate-pulse" />
            <div className="h-12 md:h-14 w-64 rounded bg-paper/10 animate-pulse" />
          </div>

          {/* Verse shimmers */}
          <div className="space-y-5 max-w-[780px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-full rounded bg-paper/6 animate-pulse" />
                <div className="h-4 w-[92%] rounded bg-paper/6 animate-pulse" />
                <div className="h-4 w-[78%] rounded bg-paper/6 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
