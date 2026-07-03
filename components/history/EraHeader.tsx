// An era division on the timeline: the chronological chapter heading.
// Sticky just below the app header so the reader always knows which age
// of the Church they are scrolling through (the "active era indicator").

import type { HISTORY_ERAS } from "@/lib/history/events";

export function EraHeader({
  era,
  count,
}: {
  era: (typeof HISTORY_ERAS)[number];
  count: number;
}) {
  return (
    <header id={`era-${era.id}`} className="pb-3 pt-4 scroll-mt-32">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-crimson/90">
        {era.from}–{era.to}
      </p>
      <h2 className="mt-1 font-display-serif text-title-sm md:text-title text-paper leading-tight">
        {era.label}
      </h2>
      <p className="mt-1.5 max-w-[560px] font-serif italic text-detail text-paper/55 leading-[1.55]">
        {era.blurb}
      </p>
      <p className="sr-only">
        {count} events in this era
      </p>
    </header>
  );
}
