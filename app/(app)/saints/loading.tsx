export default function SaintsLoading() {
  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] w-full">
        <div className="h-3 w-20 rounded bg-paper/10 animate-pulse" />
        <div className="mt-4 h-12 md:h-14 w-72 rounded bg-paper/10 animate-pulse" />
        <div className="mt-6 space-y-2 max-w-[640px]">
          <div className="h-4 w-full rounded bg-paper/6 animate-pulse" />
          <div className="h-4 w-[82%] rounded bg-paper/6 animate-pulse" />
        </div>

        {/* Search pill */}
        <div className="mt-8 h-12 w-full max-w-[640px] rounded-pill bg-paper/8 animate-pulse" />

        {/* Card grid */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/8 p-5 space-y-3"
            >
              <div className="h-14 w-14 rounded-full bg-paper/8 animate-pulse" />
              <div className="h-4 w-[80%] rounded bg-paper/10 animate-pulse" />
              <div className="h-3 w-[55%] rounded bg-paper/6 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
