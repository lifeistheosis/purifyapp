"use client";

import { useEffect, type RefObject } from "react";

import { clicksFor, stepAtPlace, stopsOf } from "@/lib/prayers/easyScroll";
import { useReducedMotion } from "@/lib/ui/motion";
import { READING_PLACE, placeIn, visibleBand } from "@/lib/ui/readingPlace";
import { handTicks } from "@/lib/ui/scrollTicks";

/**
 * Easy Scroll (1.9, build 89 note 7, his name for it), by the verse since
 * build 90 note 6: on a prayer page a short swipe brings the next verse to the
 * reading place and rests there, lit (useLitLine.ts); a fling runs on through
 * the verses but never past a prayer's last one; the next prayer comes on a
 * swipe of its own; and the hand feels a small click as each new prayer
 * arrives, in the apps. His words then: "It pretty much helps you scroll to
 * the next section easily ... with like an easy swipe ... and also add a
 * haptic feedback when they scroll to each section", and on build 90: "I
 * noticed myself scrolling to another section when I just realistically want
 * to scroll to the next verse or next bar within the same section."
 *
 * Until build 90 a prayer rested only at its first line and, when taller than
 * the screen, at its end at the foot; the whole prayer was the stop, so the
 * phone let the page run free inside it. Measured on the export, that end
 * left two to five verses below the reading place, never lit, and a swipe
 * from it carried them off the screen into the next prayer.
 *
 * The gesture is the phone's own scroll snapping, so it has the phone's own
 * feel and costs nothing while the finger moves: this hook switches it on for
 * the page (`data-easy-scroll` on <html>, app/globals.css "Easy Scroll"),
 * keeps the reading place as a number the stylesheet reads, and places each
 * prayer's rests as small marks in its own holder (`data-verse-rests`): each
 * verse's start, the parts of a verse taller than the room under the reading
 * place, and a last rest a line into the prayer's last verse
 * (lib/prayers/easyScroll.ts, stopsOf). They are placed again only when the
 * page changes size or its words change, and written only when they moved.
 * A frame-by-frame scroll would fight the snapping; Begin and Your rule move
 * with the browser's own smooth scroll (goToPrayer), which lands on a
 * prayer's first verse, one of its rests.
 *
 * Only for a hand on a touch screen, and only with Purify's motion on:
 * with it off, or with a mouse or a trackpad, the page scrolls as any page.
 */
const ATTR = "data-easy-scroll";
/** A scroll that has not moved for this long has come to rest (where the browser cannot say so itself). */
const REST_MS = 140;
/** Each prayer's holder of its rests (PrayerStep.tsx, CommemorationStep.tsx). */
const HOLDER = "[data-verse-rests]";

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
      // at the top, kept for links to a part of a page), so the number is
      // what is left of the reading place past it.
      const padTop = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
      html.style.setProperty("--easy-place", `${Math.round(place - padTop)}px`);
      const room = band.bottom - place;
      for (const step of root.querySelectorAll<HTMLElement>("[data-step]")) {
        const holder = step.querySelector<HTMLElement>(`:scope > ${HOLDER}`);
        if (!holder) continue;
        const from = holder.getBoundingClientRect().top;
        // Its verses; a step of words with no lines rests on its name.
        const lines = [...step.querySelectorAll<HTMLElement>("[data-line]")];
        const shown = lines.length ? lines : [step.querySelector<HTMLElement>("h2")].filter((el): el is HTMLElement => !!el);
        const verses = shown.map((el) => {
          const box = el.getBoundingClientRect();
          const line = parseFloat(getComputedStyle(el).lineHeight) || box.height;
          return { top: box.top - from, height: box.height, line: Math.min(line, box.height) };
        });
        const stops = stopsOf(verses, room);
        const sig = stops.map((s) => `${s.kind}@${s.at}`).join(",");
        if (holder.dataset.sig === sig) continue;
        holder.dataset.sig = sig;
        holder.replaceChildren(
          ...stops.map((s) => {
            const mark = document.createElement("span");
            mark.setAttribute("aria-hidden", "true");
            mark.setAttribute("data-verse-stop", s.kind);
            mark.style.top = `${s.at}px`;
            return mark;
          }),
        );
      }
    };

    // One click as a new prayer comes to rest at the reading place; none for
    // another verse of the same prayer, none for the head of the page or its
    // foot, and none twice for the same prayer.
    const arrive = (target: Element | null) => {
      if (!target) return;
      if (target.matches("[data-snap-edge]")) {
        arrived = null;
        return;
      }
      const id = target.closest("[data-step]")?.id ?? null;
      if (!clicksFor(arrived, id)) return;
      arrived = id;
      const click = handTicks();
      click.tick();
      click.end();
    };

    // Where the browser says which place the scroll settled on (Chrome, the
    // Android app's engine), that; elsewhere, the rest standing at the
    // reading place once the scroll has come to rest.
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
      const marks = [...root.querySelectorAll<HTMLElement>("[data-verse-stop]")];
      const id = stepAtPlace(
        marks.map((el) => ({ id: el.closest("[data-step]")?.id ?? "", top: el.getBoundingClientRect().top })),
        place,
      );
      arrive(id ? (marks.find((el) => el.closest("[data-step]")?.id === id) ?? null) : null);
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
    // A wording switched, a name added: the verses have moved. The rests'
    // own holders change only when measure writes them, so they are not news.
    const changed = new MutationObserver((records) => {
      if (records.every((r) => (r.target as Element).closest?.(HOLDER))) return;
      measure();
    });
    changed.observe(root, { childList: true, subtree: true });

    return () => {
      if (rest) clearTimeout(rest);
      html.removeAttribute(ATTR);
      html.style.removeProperty("--easy-place");
      document.removeEventListener("scrollsnapchange", onSnap);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      resized?.disconnect();
      changed.disconnect();
      for (const holder of root.querySelectorAll<HTMLElement>(HOLDER)) {
        holder.replaceChildren();
        delete holder.dataset.sig;
      }
    };
  }, [ref, reduced, enabled]);
}
