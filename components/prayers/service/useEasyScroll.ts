"use client";

import { useEffect, type RefObject } from "react";

import { isTall, stepAtPlace } from "@/lib/prayers/easyScroll";
import { useReducedMotion } from "@/lib/ui/motion";
import { READING_PLACE, placeIn, visibleBand } from "@/lib/ui/readingPlace";
import { handTicks } from "@/lib/ui/scrollTicks";

/**
 * Easy Scroll (1.9, build 89 note 7, his name for it): on a prayer page, a
 * short swipe carries the reader to the start of the next prayer and settles
 * there, its first line at the reading place, lit (useLitLine.ts); a prayer
 * taller than the screen scrolls freely inside and settles at its end before
 * the next swipe moves on; and the hand feels a small click as each prayer
 * arrives, in the apps. His words: "It pretty much helps you scroll to the
 * next section easily ... with like an easy swipe ... and also add a haptic
 * feedback when they scroll to each section."
 *
 * The gesture is the phone's own scroll snapping, so it has the phone's own
 * feel and costs nothing while the finger moves: this hook switches it on for
 * the page (`data-easy-scroll` on <html>, app/globals.css "Easy Scroll"), keeps
 * the reading place and the foot of what can be seen as two numbers the
 * stylesheet reads, marks the prayers that are taller than the room under the
 * reading place, and gives the click. A frame-by-frame scroll would fight the
 * snapping; Begin and Your rule move with the browser's own smooth scroll
 * (goToPrayer), which lands exactly where a prayer settles.
 *
 * Only for a hand on a touch screen, and only with Purify's motion on:
 * with it off, or with a mouse or a trackpad, the page scrolls as any page.
 */
const ATTR = "data-easy-scroll";
/** A scroll that has not moved for this long has come to rest (where the browser cannot say so itself). */
const REST_MS = 140;

export function useEasyScroll(ref: RefObject<HTMLElement | null>, { enabled = true }: { enabled?: boolean } = {}) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root || reduced || !enabled || typeof window === "undefined") return;
    if (!window.matchMedia?.("(pointer: coarse)").matches) return;

    const html = document.documentElement;
    let place = 0;
    let foot = 0;
    let arrived: string | null = null;

    const measure = () => {
      const band = visibleBand();
      place = placeIn(band, READING_PLACE);
      foot = window.innerHeight - band.bottom;
      // A snap is measured from inside the page's own scroll padding (72px
      // at the top, kept for links to a part of a page), so the two numbers
      // are what is left of the reading place and the foot past it.
      const style = getComputedStyle(html);
      const padTop = parseFloat(style.scrollPaddingTop) || 0;
      const padBottom = parseFloat(style.scrollPaddingBottom) || 0;
      html.style.setProperty("--easy-place", `${Math.round(place - padTop)}px`);
      html.style.setProperty("--easy-foot", `${Math.max(0, Math.round(foot - padBottom))}px`);
      // The whole prayer is what settles, so a prayer taller than the screen
      // can be scrolled freely inside (the phone lets a snap area larger than
      // the screen move under the finger); its margin puts its first line, the
      // one marked data-snap-start, at the reading place.
      for (const step of root.querySelectorAll<HTMLElement>("[data-step]")) {
        const first = step.querySelector<HTMLElement>("[data-snap-start]");
        const box = step.getBoundingClientRect();
        if (first) {
          const into = first.getBoundingClientRect().top - box.top;
          step.style.setProperty("--easy-start", `${Math.round(place - padTop - into)}px`);
        } else {
          step.style.removeProperty("--easy-start");
        }
        const tall = first ? isTall(first.getBoundingClientRect().top, box.bottom, place, band.bottom) : false;
        if (tall) step.setAttribute("data-tall", "");
        else step.removeAttribute("data-tall");
      }
    };

    // One click as a prayer arrives; none for the end of a long prayer, the
    // head of the page or its foot, and none twice for the same prayer.
    const arrive = (target: Element | null) => {
      if (!target || !target.matches("[data-step], [data-snap-start]")) {
        if (target && !target.matches("[data-snap-end]")) arrived = null;
        return;
      }
      const id = target.closest("[data-step]")?.id ?? null;
      if (!id || id === arrived) return;
      arrived = id;
      const click = handTicks();
      click.tick();
      click.end();
    };

    // Where the browser says which place the scroll settled on (Chrome, the
    // Android app's engine), that; elsewhere, the prayer whose first line
    // stands at the reading place once the scroll has come to rest.
    const told = "onscrollsnapchange" in window;
    // A bar at the top or the foot can come or go while the reader reads, and
    // the reading place moves with it: measured again whenever a scroll
    // comes to rest, and only written when it has moved.
    const refresh = () => {
      const band = visibleBand();
      if (Math.abs(placeIn(band, READING_PLACE) - place) > 1 || Math.abs(window.innerHeight - band.bottom - foot) > 1) measure();
    };
    const onSnap = (e: Event) => {
      arrive((e as Event & { snapTargetBlock?: Element | null }).snapTargetBlock ?? null);
      refresh();
    };
    let rest: ReturnType<typeof setTimeout> | null = null;
    const settle = () => {
      refresh();
      const starts = [...root.querySelectorAll<HTMLElement>("[data-snap-start]")].map((el) => ({ el, top: el.getBoundingClientRect().top }));
      const id = stepAtPlace(
        starts.map(({ el, top }) => ({ id: el.closest("[data-step]")?.id ?? "", top })),
        place,
      );
      arrive(id ? (starts.find(({ el }) => el.closest("[data-step]")?.id === id)?.el ?? null) : null);
    };
    const onScroll = () => {
      if (rest) clearTimeout(rest);
      rest = setTimeout(settle, REST_MS);
    };

    measure();
    html.setAttribute(ATTR, "");
    if (told) document.addEventListener("scrollsnapchange", onSnap);
    else window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    const resized = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resized?.observe(root);
    // A wording switched, a name added: the prayers' heights have changed.
    const changed = new MutationObserver(measure);
    changed.observe(root, { childList: true, subtree: true });

    return () => {
      if (rest) clearTimeout(rest);
      html.removeAttribute(ATTR);
      html.style.removeProperty("--easy-place");
      html.style.removeProperty("--easy-foot");
      document.removeEventListener("scrollsnapchange", onSnap);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      resized?.disconnect();
      changed.disconnect();
      for (const step of root.querySelectorAll<HTMLElement>("[data-step]")) {
        step.removeAttribute("data-tall");
        step.style.removeProperty("--easy-start");
      }
    };
  }, [ref, reduced, enabled]);
}
