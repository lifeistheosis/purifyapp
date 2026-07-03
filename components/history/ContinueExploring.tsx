"use client";

// "Continue exploring", shown on the History landing only when a saved
// timeline position exists. Client-only by necessity (reads localStorage);
// renders nothing until it knows, so there's no hydration mismatch.

import { useEffect, useState } from "react";

import { eventBySlug } from "@/lib/history/events";
import { loadPosition } from "@/lib/history/scroll";

export function ContinueExploring() {
  const [slug, setSlug] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate: localStorage can't be read during SSR (Sheet.tsx precedent). */
  useEffect(() => {
    const pos = loadPosition();
    if (pos && eventBySlug(pos.anchorSlug)) setSlug(pos.anchorSlug);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!slug) return null;
  const event = eventBySlug(slug)!;

  return (
    <button
      type="button"
      onClick={() =>
        document
          .getElementById(`event-${slug}`)
          ?.scrollIntoView({ block: "start" })
      }
      className="tap-press mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-pill border border-paper/20 px-4 font-sans text-detail font-semibold text-paper/80 hover:border-paper/40"
    >
      <span aria-hidden className="h-2 w-2 rounded-full bg-crimson" />
      Continue exploring · {event.shortTitle ?? event.title}
    </button>
  );
}
