import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/**
 * A chapter's outline while it opens, in the shape the chapter draws
 * (components/bible/ChapterScreen.tsx, 1.7): one row of pills, the title on
 * one line, then the verses, in the text's column. The computer's chapter
 * sidebar is outlined on the website's wide screen only.
 */
export default function ChapterLoading() {
  return (
    <div className="bg-night flex">
      {/* Sidebar placeholder (the website's wide screen only). */}
      <aside className="hidden md:block native-md-hidden w-[240px] shrink-0 border-r border-white/8 self-stretch">
        <div className="px-5 py-8 space-y-4">
          <Skeleton weight="strong" className="h-3 w-24" />
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="h-7 rounded bg-paper/5 motion-safe:animate-pulse" />
            ))}
          </div>
        </div>
      </aside>

      <section className="flex-1 px-5 md:px-10 pt-4 md:pt-16 native-md-pt-4 pb-10 md:pb-16 min-w-0">
        <div className="mx-auto max-w-[680px] w-full cascade">
          {/* The row of pills */}
          <div className="mb-8 flex gap-2">
            <Skeleton weight="mid" rounded="rounded-pill" className="h-10 w-20" />
            <Skeleton weight="mid" rounded="rounded-pill" className="h-10 w-24" />
            <Skeleton weight="mid" rounded="rounded-pill" className="h-10 w-24" />
          </div>

          {/* The title, on one line */}
          <div className="mb-10">
            <Skeleton weight="strong" className="h-9 md:h-11 w-40" />
          </div>

          {/* Verse shimmers */}
          <div className="cascade space-y-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonText key={i} lines={3} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
