import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/**
 * A chapter's outline while it opens, in the shape the chapter draws
 * (components/bible/ChapterScreen.tsx, 1.8, the owner's pick B of round 2,
 * "The page"): the book's name over its chapter in the middle, then the
 * verses, in the text's column, under the room the round buttons over the
 * page take. The computer's chapter sidebar is outlined on the website's
 * wide screen only.
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

      <section className="flex-1 px-5 md:px-10 under-plates md:pt-16 pb-10 md:pb-16 min-w-0">
        <div className="mx-auto max-w-[680px] w-full cascade">
          {/* The book's name over its chapter, and the short rule */}
          <div className="mb-8 flex flex-col items-center">
            <Skeleton weight="strong" className="h-10 w-40" />
            <Skeleton weight="mid" className="mt-3 h-3.5 w-20" />
            <div className="mt-5 h-px w-7 bg-paper/15" />
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
