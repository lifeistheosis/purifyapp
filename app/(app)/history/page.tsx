import type { Metadata } from "next";

import { ContinueExploring } from "@/components/history/ContinueExploring";
import { HistoryTimelinePage } from "@/components/history/HistoryTimelinePage";
import { publishedEvents, HISTORY_ERAS } from "@/lib/history/events";

export const metadata: Metadata = {
  title: "Orthodox History, an interactive timeline of the Church",
  description:
    "Move through two thousand years of Orthodox Christian history: the apostles, the martyrs, the councils, the schisms, and the missions, every event sourced and cited, free.",
  alternates: { canonical: "/history" },
  openGraph: {
    title: "Orthodox History, an interactive timeline of the Church",
    description:
      "Two thousand years of the Orthodox Church, from Pentecost to the present, an interactive, sourced, free timeline.",
    type: "website",
    url: "/history",
  },
};

export default function HistoryPage() {
  const count = publishedEvents().length;
  return (
    <div className="bg-night pb-16 safe-pb">
      {/* Editorial masthead, compact on purpose: the timeline is the page. */}
      <header className="px-5 pt-10 md:px-8 md:pt-16">
        <div className="mx-auto w-full max-w-[1440px]">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
            Orthodox History
          </p>
          <h1 className="mt-3 max-w-[720px] font-display-serif text-display-sm md:text-display text-paper leading-[1.05]">
            The story of the Church, from Pentecost to the present.
          </h1>
          <p className="mt-4 max-w-[600px] font-serif text-lede text-paper/70 leading-[1.6]">
            {count} events across {HISTORY_ERAS.length} eras: councils and
            schisms, saints and missions, each one sourced, cited, and honest
            about what is certain and what is tradition.
          </p>
          <p className="mt-3 font-sans text-detail text-paper/55">
            The history, the sources, and the citations are free, for
            everyone, always.
          </p>
          <ContinueExploring />
        </div>
      </header>

      <main className="mt-8 md:mt-12">
        <HistoryTimelinePage />
      </main>
    </div>
  );
}
