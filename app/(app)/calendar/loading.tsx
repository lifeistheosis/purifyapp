export default function CalendarLoading() {
  return (
    <div className="bg-night px-5 md:px-8 py-12 md:py-16">
      <div className="mx-auto max-w-[1100px] w-full grid lg:grid-cols-[minmax(0,1fr)_360px] gap-10">
        {/* Month grid */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="h-8 w-40 rounded bg-paper/10 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-9 w-9 rounded-pill bg-paper/8 animate-pulse" />
              <div className="h-9 w-9 rounded-pill bg-paper/8 animate-pulse" />
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
        <aside className="space-y-4">
          <div className="h-3 w-24 rounded bg-paper/10 animate-pulse" />
          <div className="h-7 w-[70%] rounded bg-paper/10 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-paper/6 animate-pulse" />
            <div className="h-4 w-[85%] rounded bg-paper/6 animate-pulse" />
            <div className="h-4 w-[60%] rounded bg-paper/6 animate-pulse" />
          </div>
        </aside>
      </div>
    </div>
  );
}
