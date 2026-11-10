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
//
// The prayer page keeps the season too (1.9, build 90 note 8, his call 2):
// in Candlelight its light is the same light, in the same room, so it says
// the season on the root the same way (useCandleSeason, below;
// components/prayers/service/PrayerLight.tsx). It draws no veil: a prayer
// has its own lit line and steps back.

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

/**
 * Whose word the root is carrying. Two pages say the season now, and a reader
 * goes from one straight to the other (a chapter, then the evening rule): the
 * page being left must take away only what it said itself, whichever of the
 * two the browser finishes with first.
 */
let saying: object | null = null;

/**
 * While `active`, the page's root says which fast it is, if it is one and the
 * switch is on. Whoever calls it is a page Candlelight lights: the Bible's
 * veil always, the prayer page while Candlelight is the palette worn.
 */
export function useCandleSeason(active = true): void {
  const today = useToday();
  const [style] = useCalendarStyleDefault();
  const on = useCandleSeasonOn();
  const season = active && today && on ? (candleLight(today, style)?.id ?? null) : null;
  useEffect(() => {
    if (!season) return;
    const root = document.documentElement;
    const mine = {};
    saying = mine;
    root.setAttribute("data-candle-season", season);
    return () => {
      if (saying !== mine) return;
      saying = null;
      root.removeAttribute("data-candle-season");
    };
  }, [season]);
}

export function CandleVeil() {
  useCandleSeason();
  return <div aria-hidden className="candle-veil" />;
}
