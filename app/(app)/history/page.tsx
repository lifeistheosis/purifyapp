import type { Metadata } from "next";

import { CouncilMap } from "@/components/councils/CouncilMap";
import { HistoryTimelinePage } from "@/components/history/HistoryTimelinePage";
import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { HISTORY_ERAS, publishedEvents } from "@/lib/history/events";
import { historyMap } from "@/lib/history/map";

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

/**
 * Orthodox History (1.7, the owner's note 20 of 2026-10-16), phone first:
 * the page's own bar (back to Discover, its name arriving once the lead has
 * scrolled away), a lead set to the left, and the timeline: one quiet line
 * with each era's name pinned under the bar. The words are the reader's
 * language, looked up on the device (<T>), so the apps' export, written once,
 * follows the phone.
 */
export default function HistoryPage() {
  const count = publishedEvents().length;
  const lead = (
    <header className="pt-6 md:pt-14">
      <p className="font-sans text-caption font-semibold text-paper/60">
        <T k="nav.discoverMenu.history" />
      </p>
      <h1
        id="history-title"
        className="mt-2 max-w-[720px] text-heading font-bold leading-[1.1] tracking-[-0.01em] text-paper text-balance md:text-display-sm"
      >
        <T k="study.history.lead" />
      </h1>
      <p className="mt-3 font-sans text-ui text-paper/70">
        <T k="study.history.countLine" count={count} replacements={{ eras: HISTORY_ERAS.length }} />
      </p>
      <p className="mt-1 font-sans text-detail text-paper/55">
        <T k="study.theHistoryTheSourcesAnd" />
      </p>
    </header>
  );

  return (
    <>
      <MobileTopBar titleKey="nav.discoverMenu.history" back backFallback="/discover" revealTitleOn="history-title" />
      <div className="bg-night pb-16 safe-pb">
        <HistoryTimelinePage lead={lead} />
        {/* The same events on the map, with the councils (1.8). */}
        <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8">
          <CouncilMap {...historyMap()} titleKey="history.map.title" introKey="history.map.intro" />
        </div>
      </div>
    </>
  );
}
