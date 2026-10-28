import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/**
 * A saint's page while it arrives (1.7, and its doors of 1.8): the shape of
 * the page it becomes. On a phone, the icon's place at the top, the name and
 * its line, the row of the request, the doors (round 3b D), and the first
 * paragraphs; on a tablet and a computer, the picture beside the name.
 */
export default function SaintLoading() {
  return (
    <div className="bg-night px-5 md:px-8">
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="cascade pb-6 pt-6 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:items-end md:gap-10 md:pb-10 md:pt-14 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="flex justify-center md:block">
            <Skeleton weight="mid" rounded="rounded-[12px]" className="h-[260px] w-[185px] md:h-[300px] md:w-full" />
          </div>
          <div className="mt-6 flex flex-col items-center md:mt-0 md:items-start">
            <Skeleton weight="strong" className="h-9 w-[70%] max-w-[380px] md:h-12" />
            <Skeleton weight="faint" className="mt-3 h-4 w-56" />
            <div className="mt-5 flex w-full max-w-[420px] items-center gap-2">
              <Skeleton weight="faint" rounded="rounded-pill" className="h-11 w-11 shrink-0" />
              <Skeleton weight="mid" rounded="rounded-pill" className="h-11 flex-1" />
              <Skeleton weight="faint" rounded="rounded-pill" className="h-11 w-11 shrink-0" />
            </div>
            <Skeleton weight="faint" className="mt-3 h-3 w-32" />
          </div>
        </div>

        <div className="mx-auto mt-2 grid w-full max-w-[420px] grid-cols-3 gap-2 md:mx-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} weight="faint" rounded="rounded-[16px]" className="h-[74px]" />
          ))}
        </div>

        <div className="mt-8 cascade space-y-8 pb-16">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonText key={i} lines={4} className="max-w-[680px] space-y-2.5" />
          ))}
        </div>
      </div>
    </div>
  );
}
