import { Skeleton } from "@/components/ui/Skeleton";

export default function BibleLoading() {
  return (
    <div className="bg-night">
      {/* Centered hero, mirroring the Bible index. */}
      <section className="px-5 md:px-8 pt-14 md:pt-20 pb-8 md:pb-12">
        <div className="mx-auto max-w-[860px] w-full cascade flex flex-col items-center">
          <Skeleton weight="strong" className="h-3 w-20" />
          <Skeleton weight="strong" className="mt-4 h-10 md:h-12 w-72" />
          <Skeleton weight="faint" className="mt-5 h-4 w-[80%] max-w-[520px]" />
          <Skeleton
            weight="mid"
            rounded="rounded-pill"
            className="mt-8 h-12 w-full max-w-[640px]"
          />
        </div>
      </section>

      {/* Book lists (two testament columns). */}
      <section className="px-5 md:px-8 py-12 md:py-16">
        <div className="mx-auto max-w-[1100px] w-full grid md:grid-cols-2 gap-10">
          {Array.from({ length: 2 }).map((_, col) => (
            <div key={col} className="space-y-4">
              <Skeleton weight="strong" className="h-3 w-28" />
              {/* Not cascaded: 12 identical chips in a grid have no reading
                  order to reinforce, and the 12th would sit at opacity 0 for
                  770ms, which makes the loading state feel slower than the
                  load it is covering. */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} weight="faint" className="h-10" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
