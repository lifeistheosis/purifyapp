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
 * speaks only when the foot crosses the bar, and nothing done while
 * scrolling.
 */
export function useBarOverPicture(picture: RefObject<HTMLElement | null>) {
  // Before the paint, so a page come back to scrolled down never shows the
  // bar clear over its words for a frame.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = picture.current;
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
    solid(el.getBoundingClientRect().bottom <= top);
    const io = new IntersectionObserver(([entry]) => solid(!entry.isIntersecting), {
      rootMargin: `-${top}px 0px 0px 0px`,
      threshold: 0,
    });
    io.observe(el);
    return () => {
      io.disconnect();
      solid(false);
    };
  }, [picture]);
}
