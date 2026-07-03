// Skeleton for the History timeline: masthead lines and a rail of card
// placeholders, pure CSS like the Bible loading states, no layout shift
// when the timeline arrives.

export default function HistoryLoading() {
  return (
    <div className="bg-night px-5 pb-16 pt-10 md:px-8 md:pt-16">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="h-3 w-36 animate-pulse rounded bg-paper/10" />
        <div className="mt-4 h-10 w-full max-w-[560px] animate-pulse rounded bg-paper/10" />
        <div className="mt-4 h-4 w-full max-w-[420px] animate-pulse rounded bg-paper/[0.07]" />
        <div className="mt-12 border-l border-paper/12 pl-6 ml-[5px] space-y-4">
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
