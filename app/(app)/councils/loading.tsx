export default function CouncilsLoading() {
  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] w-full">
        <div className="h-3 w-28 rounded bg-paper/10 animate-pulse" />
        <div className="mt-4 h-12 md:h-14 w-[60%] max-w-[520px] rounded bg-paper/10 animate-pulse" />
        <div className="mt-6 space-y-2 max-w-[720px]">
          <div className="h-4 w-full rounded bg-paper/6 animate-pulse" />
          <div className="h-4 w-full rounded bg-paper/6 animate-pulse" />
          <div className="h-4 w-[70%] rounded bg-paper/6 animate-pulse" />
        </div>

        {/* Council rows */}
        <div className="mt-12 space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/8 p-6 space-y-3"
            >
              <div className="h-3 w-24 rounded bg-paper/8 animate-pulse" />
              <div className="h-6 w-[55%] rounded bg-paper/10 animate-pulse" />
              <div className="h-4 w-[85%] rounded bg-paper/6 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
