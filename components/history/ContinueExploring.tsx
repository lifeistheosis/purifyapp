"use client";

// "Continue at ...", on the timeline's first screen only when the reader has
// a place on the line to go back to (1.7: a quiet row with a drawn chevron;
// it was a pill with a red dot). Drawn on the device only (the place is in
// the device's storage), so it never disagrees with the server's page.

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { eventBySlug } from "@/lib/history/events";
import { loadPosition } from "@/lib/history/scroll";

export function ContinueExploring({ onGo }: { onGo: (slug: string) => void }) {
  const { t } = useTranslate();
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
      onClick={() => onGo(slug)}
      className="tap-press mt-4 inline-flex min-h-11 max-w-full items-center gap-1.5 font-sans text-detail font-semibold text-paper/80 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
    >
      <span className="truncate">{t("study.history.continueAt", { title: event.shortTitle ?? event.title })}</span>
      <ChevronRight size={14} className="shrink-0 rtl:-scale-x-100" />
    </button>
  );
}
