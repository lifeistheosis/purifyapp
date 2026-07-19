import type { Metadata } from "next";

import { ContinueExploring } from "@/components/history/ContinueExploring";
import { HistoryTimelinePage } from "@/components/history/HistoryTimelinePage";
import { publishedEvents, HISTORY_ERAS } from "@/lib/history/events";
import { T } from "@/components/i18n/T";

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
      {/* Editorial masthead, compact on purpose: the timeline is the page.
          Centered like a title page; the three-column research layout below
          reads better opening from a centered head than a left-hung one. */}
      <header className="px-5 pt-10 md:px-8 md:pt-16">
        <div className="mx-auto w-full max-w-[1440px] text-center">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
            <T k="nav.discoverMenu.history" />
          </p>
          <h1 className="mx-auto mt-3 max-w-[720px] font-display-serif text-display-sm md:text-display text-paper leading-[1.05]">
            <T k="study.history.lead" />
          </h1>
          <p className="mx-auto mt-4 max-w-[600px] font-serif text-lede text-paper/70 leading-[1.6]">
            {count} <T k="study.eventsAcross" /> {HISTORY_ERAS.length} <T k="study.erasCouncilsAndSchismsSaints" />
          </p>
          <p className="mt-3 font-sans text-detail text-paper/55">
            <T k="study.theHistoryTheSourcesAnd" />
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
