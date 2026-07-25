import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function CouncilsLoading() {
  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] w-full cascade">
        <Skeleton weight="strong" className="h-3 w-28" />
        <Skeleton
          weight="strong"
          className="mt-4 h-12 md:h-14 w-[60%] max-w-[520px]"
        />
        <SkeletonText lines={3} className="mt-6 max-w-[720px]" />

        <div className="mt-12 cascade space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/8 p-6 space-y-3"
            >
              <Skeleton weight="mid" className="h-3 w-24" />
              <Skeleton weight="strong" className="h-6 w-[55%]" />
              <Skeleton weight="faint" className="h-4 w-[85%]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
