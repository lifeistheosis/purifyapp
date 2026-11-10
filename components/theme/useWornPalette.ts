"use client";

// The palette the page is WEARING, as against the one a reader has stored.
//
// The two differ in two cases, and the Bible's reader asked the stored one in
// both (found on the export of 2026-11-10, with the phone's clock at 23:30):
//
//  - Candlelight at Vespers (lib/reader/vespers.ts): the stored palette is
//    the reader's own, and from sunset the app wears Candlelight. The reader
//    drew the palette's colours and none of the candle's room, the lit line,
//    the soft light and the dark edges his picks A and B describe.
//  - A reader the Plus gate has refused, with Candlelight still stored: the
//    app wears Dark, and the reader still stepped the verses back as if by
//    candle.
//
// What is worn is what components/theme/AppThemeController.tsx (and before
// it the pre-paint script) put on the root element, so that is what is read
// here, and watched: the attribute changes at sunset, on a tap, and when the
// gate answers.

import { useSyncExternalStore } from "react";

function subscribe(changed: () => void): () => void {
  const observer = new MutationObserver(changed);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reading-mode"] });
  return () => observer.disconnect();
}

const candlelight = () => document.documentElement.getAttribute("data-reading-mode") === "candlelight";

/** Is the page in Candlelight now? False on the server and until the device answers. */
export function useCandlelightWorn(): boolean {
  return useSyncExternalStore(subscribe, candlelight, () => false);
}
