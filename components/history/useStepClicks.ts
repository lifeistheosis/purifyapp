"use client";

import { useEffect, type RefObject } from "react";

import { READING_PLACE, placeIn, visibleBand } from "@/lib/ui/readingPlace";
import { SETTLE_MS, handTicks } from "@/lib/ui/scrollTicks";

/**
 * The click in the hand as each step of an event reaches the reading place
 * (build 93 note 5, his words: "add haptic feedback"): the house's own click
 * (lib/ui/scrollTicks.ts), as the Bible's chapter strip, the saints' timeline
 * and the prayers give it. One for each new step a hand brings there, in
 * either direction; none for another moment of the same step, none twice in
 * a row for one step, and none for the step the page opened on.
 *
 * Only a hand starts it, as the strip's: a page that moves itself (a part
 * tapped in the bar above, a link to a place in the account) brings steps up
 * in silence. A finger on the screen is a hand, and so is the fling after it
 * until the page has been still for SETTLE_MS.
 *
 * Where the reader is is read from the page once a frame at most while it
 * moves. In a browser the click is inert (handTicks).
 */
export function useStepClicks(ref: RefObject<HTMLElement | null>, items = "[data-step]") {
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof window === "undefined") return;

    let hand = false;
    let settle = 0;
    let frame = 0;
    let arrived: string | null = null;

    /** The step standing at the reading place, or null where none does. */
    const here = (): string | null => {
      const place = placeIn(visibleBand(), READING_PLACE);
      for (const el of root.querySelectorAll<HTMLElement>(items)) {
        const box = el.getBoundingClientRect();
        if (box.top <= place && place < box.bottom) return el.dataset.step ?? null;
      }
      return null;
    };

    const look = () => {
      frame = 0;
      const now = here();
      if (now === null || now === arrived) return;
      arrived = now;
      if (!hand) return;
      const click = handTicks();
      click.tick();
      click.end();
    };
    const release = () => {
      hand = false;
      settle = 0;
    };
    const onScroll = () => {
      // The fling goes on: the hand is still on it until the page is still.
      if (hand && settle) {
        window.clearTimeout(settle);
        settle = window.setTimeout(release, SETTLE_MS);
      }
      if (!frame) frame = requestAnimationFrame(look);
    };
    const onTouchStart = () => {
      hand = true;
      if (settle) window.clearTimeout(settle);
      settle = 0;
    };
    const onTouchEnd = () => {
      if (settle) window.clearTimeout(settle);
      settle = window.setTimeout(release, SETTLE_MS);
    };

    arrived = here();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (settle) window.clearTimeout(settle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [ref, items]);
}
