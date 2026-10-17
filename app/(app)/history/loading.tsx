// Skeleton for the History timeline (1.7): the lead's lines, then the one
// line with rows along it, the shape the timeline arrives in. No boxes: the
// rows are placeholders of their own lines.

import { Skeleton } from "@/components/ui/Skeleton";

export default function HistoryLoading() {
  return (
    <div className="bg-night px-5 pb-16 pt-6 md:px-8 md:pt-14">
      <div className="mx-auto w-full max-w-[1440px] cascade">
        <Skeleton weight="faint" className="h-3 w-28" />
        <Skeleton weight="strong" className="mt-3 h-9 w-full max-w-[520px]" />
        <Skeleton weight="faint" className="mt-4 h-4 w-full max-w-[300px]" />
        <div className="relative mt-10 cascade">
          <span aria-hidden className="absolute inset-y-0 start-[6px] w-px bg-paper/12" />
          <Skeleton weight="strong" className="h-5 w-48" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ps-7 pt-6">
              <Skeleton weight="faint" className="h-3 w-24" />
              <Skeleton weight="strong" className="mt-2 h-5 w-full max-w-[420px]" />
              <Skeleton weight="faint" className="mt-2 h-3.5 w-full max-w-[520px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
