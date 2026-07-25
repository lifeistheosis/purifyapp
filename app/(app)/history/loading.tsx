// Skeleton for the History timeline: masthead lines and a rail of card
// placeholders, cascaded so the rail fills the way the real timeline does.

import { Skeleton } from "@/components/ui/Skeleton";

export default function HistoryLoading() {
  return (
    <div className="bg-night px-5 pb-16 pt-10 md:px-8 md:pt-16">
      <div className="mx-auto w-full max-w-[1440px] cascade">
        <Skeleton weight="strong" className="h-3 w-36" />
        <Skeleton weight="strong" className="mt-4 h-10 w-full max-w-[560px]" />
        <Skeleton weight="faint" className="mt-4 h-4 w-full max-w-[420px]" />
        <div className="mt-12 border-l border-paper/12 pl-6 ml-[5px] cascade space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[120px] animate-pulse rounded-lg border border-paper/10 bg-night-soft/60"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
