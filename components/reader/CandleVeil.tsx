"use client";

// Candlelight's veil over the Bible's page (app/globals.css, .candle-veil):
// the soft light where the eye rests and the edges falling away into the
// dark. Both readers draw it (components/bible/ChapterReader.tsx and
// DownloadedChapter.tsx), so it is one component.
//
// And the season (1.9, lib/reader/candleSeason.ts): in the Church's three
// long fasts the light takes the fast's colour. A coloured light has to lie
// behind the words, where the white one lies over them, so it is not this
// element that carries it: while the veil is up in a season, the page's root
// says which (data-candle-season), and the stylesheet lays the light under
// the page the way a look lays its room ("The looks (1.9)", whose three
// rules for a room answer this attribute too) and takes the white out of the
// veil. Nothing is said before the device's own day is known, so the export
// bakes no season in, and the attribute goes when the reader leaves the page.

import { useEffect, useSyncExternalStore } from "react";

import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useToday } from "@/lib/calendar/useToday";
import { candleLight, candleSeasonOn } from "@/lib/reader/candleSeason";

/** The event every reader preference sends when it changes. */
const PREFS_EVENT = "purify:reader-prefs";

function subscribe(changed: () => void): () => void {
  window.addEventListener(PREFS_EVENT, changed);
  window.addEventListener("storage", changed);
  return () => {
    window.removeEventListener(PREFS_EVENT, changed);
    window.removeEventListener("storage", changed);
  };
}

/** Whether the switch is on: on for everyone who has not turned it off. */
export function useCandleSeasonOn(): boolean {
  return useSyncExternalStore(subscribe, candleSeasonOn, () => true);
}

export function CandleVeil() {
  const today = useToday();
  const [style] = useCalendarStyleDefault();
  const on = useCandleSeasonOn();
  const season = today && on ? (candleLight(today, style)?.id ?? null) : null;
  useEffect(() => {
    const root = document.documentElement;
    if (season) root.setAttribute("data-candle-season", season);
    else root.removeAttribute("data-candle-season");
    return () => root.removeAttribute("data-candle-season");
  }, [season]);
  return <div aria-hidden className="candle-veil" />;
}
