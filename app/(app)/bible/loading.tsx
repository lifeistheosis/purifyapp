export default function BibleLoading() {
  return (
    <div className="bg-night">
      {/* Centered hero, mirroring the Bible index. */}
      <section className="px-5 md:px-8 pt-14 md:pt-20 pb-8 md:pb-12">
        <div className="mx-auto max-w-[860px] w-full flex flex-col items-center">
          <div className="h-3 w-20 rounded bg-paper/10 animate-pulse" />
          <div className="mt-4 h-10 md:h-12 w-72 rounded bg-paper/10 animate-pulse" />
          <div className="mt-5 h-4 w-[80%] max-w-[520px] rounded bg-paper/6 animate-pulse" />
          <div className="mt-8 h-12 w-full max-w-[640px] rounded-pill bg-paper/8 animate-pulse" />
        </div>
      </section>

      {/* Book lists (two testament columns). */}
      <section className="px-5 md:px-8 py-12 md:py-16">
        <div className="mx-auto max-w-[1100px] w-full grid md:grid-cols-2 gap-10">
          {Array.from({ length: 2 }).map((_, col) => (
            <div key={col} className="space-y-4">
              <div className="h-3 w-28 rounded bg-paper/10 animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded bg-paper/6 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
