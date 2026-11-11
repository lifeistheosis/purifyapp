"use client";

import { useEffect, type RefObject } from "react";

import { clicksFor, prayerAt } from "@/lib/prayers/easyScroll";
import { READING_PLACE, placeIn, visibleBand } from "@/lib/ui/readingPlace";
import { handTicks } from "@/lib/ui/scrollTicks";

/**
 * The prayers' scroll (1.9): the phone's own, and one click in the hand as
 * each new prayer reaches the reading place.
 *
 * Easy Scroll (build 89 note 7, his name for it, by the verse from build 90
 * note 6) snapped the page with the browser's own scroll snapping: a rest at
 * every verse, and a prayer's first and last verses rests a fling could not
 * pass. Build 93 note 2, his words: "When I try and scroll down, it scrolls
 * back up. When I try and scroll down, it just keeps on scrolling." Measured
 * on build 93's export with real touch at 360, 390 and 820, against the
 * phone's own scroll on the same page: a fling was pulled back up 65 to 66px
 * (it had carried the page past a prayer's edge, which the browser always
 * returns to); a gentle flick ran on 29 to 273px after the finger lifted,
 * where the phone's own momentum ends at 24 to 30px (the snapping picks a rest
 * further along); and a slow drag held still before lifting still moved on 30
 * to 73px. Snapping moves the page after the finger lets go, so no snapping
 * meets the bar set under his "finalize this build": the scroll never fights
 * the finger. The page now scrolls as the phone scrolls, and the snapping
 * waits for his word.
 *
 * What readers had from it stays: the verse at the reading place lit
 * (useLitLine.ts), each prayer counted as it is passed (usePassedSteps.ts),
 * and this hook's click: as the reader moves, the prayer standing at the
 * reading place is looked up once a frame at most, and when it is a new one
 * the hand feels a click, in either direction; none for another verse of the
 * same prayer, none for the head or the foot of the page, none twice in a
 * row for one prayer, and none for the prayer the page opened on. Measured
 * when the page changes size or its words change; a scroll only reads where
 * the page is. In a browser the click is inert (lib/ui/scrollTicks.ts).
 */
export function useEasyScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof window === "undefined") return;

    let place = 0;
    let steps: { id: string; top: number; bottom: number }[] = [];
    let arrived: string | null = null;
    let frame = 0;

    // The prayers' boxes in page coordinates, and the reading place in the
    // screen's: a scroll then needs no measure, only where the page is.
    const measure = () => {
      place = placeIn(visibleBand(), READING_PLACE);
      const y = window.scrollY;
      steps = [...root.querySelectorAll<HTMLElement>("[data-step]")].map((el) => {
        const box = el.getBoundingClientRect();
        return { id: el.id, top: box.top + y, bottom: box.bottom + y };
      });
    };
    const here = () => prayerAt(steps, window.scrollY + place);

    const look = () => {
      frame = 0;
      const now = here();
      if (now === null) return;
      if (!clicksFor(arrived, now)) return;
      arrived = now;
      const click = handTicks();
      click.tick();
      click.end();
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(look);
    };
    // A bar at the top or the foot can come or go while the reader reads, and
    // the reading place moves with it.
    const onResize = () => {
      measure();
      onScroll();
    };

    measure();
    // The prayer the page opened on is where the reader is, not an arrival.
    arrived = here();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const resized = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resized?.observe(root);
    // A wording switched, a name added: the prayers have moved.
    const changed = new MutationObserver(measure);
    changed.observe(root, { childList: true, subtree: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      resized?.disconnect();
      changed.disconnect();
    };
  }, [ref]);
}
