"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * The attribute on <html> that turns the tab bar solid again once a page's
 * picture has gone up under it (app/globals.css, "the bar over the
 * picture"). Until then the bar is clear over it, from the first paint.
 */
export const BAR_SOLID = "data-bar-solid";

/**
 * The tab bar over a page's own picture (1.8): Prayers' Pantocrator
 * (components/mobile/PrayersHero.tsx) and, from note 71, the Ladder at the
 * top of You (components/you/YouHero.tsx). The bar is the one every tab
 * wears (components/mobile/MobileHeader); while the picture is on the page
 * it is clear over it, decided in CSS before the first paint (html:has), and
 * once the picture's foot has gone up under the bar's this sets
 * data-bar-solid on <html> and the bar is solid again. One observer that
 * speaks only when an edge crosses the bar, and nothing done while
 * scrolling.
 *
 * `words` (1.9): what stands on the picture, where a page says so. The bar
 * is solid again as soon as their top reaches its foot, picture or no. Until
 * then the reader's own name on You went up under a bar that was still
 * clear, through the tab's name: two names crossing, and on a short page,
 * which never scrolls the picture away, left crossed (measured 2026-11-11:
 * from 140px of scroll on, the picture's foot not due for another 130px).
 * The bar turns as it always has, in its own 200ms where Purify's motion is
 * on and at once where it is off, so there is nothing new that moves. Give
 * the element a little room above its first line (the You hero's is 12px)
 * and the bar has closed before the words arrive.
 */
export function useBarOverPicture(picture: RefObject<HTMLElement | null>, words?: RefObject<HTMLElement | null>) {
  // Before the paint, so a page come back to scrolled down never shows the
  // bar clear over its words for a frame.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = picture.current;
    const first = words?.current ?? null;
    const bar = document.querySelector<HTMLElement>("[data-tab-topbar]");
    const solid = (on: boolean) => {
      if (on) root.setAttribute(BAR_SOLID, "");
      else root.removeAttribute(BAR_SOLID);
    };
    if (!el || !bar || typeof IntersectionObserver === "undefined") {
      // With no way to know when the picture has gone, the bar stays solid.
      solid(true);
      return () => solid(false);
    }
    const top = Math.round(bar.getBoundingClientRect().height);
    // Where the page is now, before the observer's first word a frame later.
    let gone = el.getBoundingClientRect().bottom <= top;
    let reached = first ? first.getBoundingClientRect().top < top : false;
    solid(gone || reached);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === el) gone = !entry.isIntersecting;
          // The words stand whole under the bar's foot until their top goes up past it.
          else reached = entry.boundingClientRect.top < (entry.rootBounds?.top ?? top);
        }
        solid(gone || reached);
      },
      // 0 for the picture leaving, 1 for the words no longer whole in sight.
      { rootMargin: `-${top}px 0px 0px 0px`, threshold: [0, 1] },
    );
    io.observe(el);
    if (first) io.observe(first);
    return () => {
      io.disconnect();
      solid(false);
    };
  }, [picture, words]);
}
