"use client";

import { useEffect, type RefObject } from "react";

import { useReducedMotion } from "@/lib/ui/motion";

/**
 * The line being read, lit as the page scrolls (1.7): the owner asked for
 * the prayer reader to read like the player's live lyrics and the read-aloud
 * follow, the line being read bright and the rest a step back as you move
 * through, driven by the scroll and behind the app's motion switch.
 *
 * The line at the reading place (two fifths of the way down the screen, the
 * live lyrics' own) carries `data-lit`, and the reader carries
 * `data-following` once the first line has reached that place, so the page
 * reads at full strength until the reader begins. app/globals.css draws the
 * step back, under the motion switch only: with motion off, every line stays
 * at full strength and this listens to nothing.
 *
 * Near the foot of the page the place slides down with the last lines, which
 * could otherwise never rise to it.
 *
 * The prayer the lit line stands in carries `data-praying` (1.8, the owner's
 * pick B, Immersive, for while you pray): the prayers before and after it step
 * back further than its own unlit lines, so the one being prayed sits lit in
 * the middle (app/globals.css). Each prayer of the page marks itself with
 * `data-step`.
 *
 * Cheap on an older phone: the lines' places are measured once, and again
 * only when the page changes size or its lines change (a wording switched, a
 * prayer marked); a scroll reads two numbers and finds the line by halving,
 * once a frame at most, and touches the page only when the line changes.
 */
const PLACE = 0.4;
const FOOT = 0.9;

export function useLitLine(ref: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root || reduced) return;

    let lines: HTMLElement[] = [];
    let tops: number[] = [];
    let lit: HTMLElement | null = null;
    let praying: HTMLElement | null = null;
    let frame = 0;

    const measure = () => {
      lines = Array.from(root.querySelectorAll<HTMLElement>("[data-line]"));
      const y = window.scrollY;
      tops = lines.map((line) => line.getBoundingClientRect().top + y);
    };

    const light = (line: HTMLElement | null) => {
      if (line === lit) return;
      if (lit) delete lit.dataset.lit;
      lit = line;
      const step = line?.closest<HTMLElement>("[data-step]") ?? null;
      if (step !== praying) {
        if (praying) delete praying.dataset.praying;
        praying = step;
        if (step) step.dataset.praying = "";
      }
      if (line) {
        line.dataset.lit = "";
        root.dataset.following = "";
      } else {
        delete root.dataset.following;
      }
    };

    const update = () => {
      frame = 0;
      if (lines.length === 0) {
        light(null);
        return;
      }
      const view = window.innerHeight;
      const y = window.scrollY;
      const left = document.documentElement.scrollHeight - (y + view);
      const nearFoot = left < view ? 1 - Math.max(0, left) / view : 0;
      const place = y + view * (PLACE + (FOOT - PLACE) * nearFoot);
      if (place < tops[0]) {
        light(null);
        return;
      }
      // The last line whose top is above the reading place.
      let lo = 0;
      let hi = tops.length - 1;
      let at = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (tops[mid] <= place) {
          at = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      light(lines[at] ?? null);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const remeasure = () => {
      measure();
      schedule();
    };

    measure();
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    const resized = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(remeasure);
    resized?.observe(root);
    // A wording switched, or a prayer marked: the lines are new or have moved.
    const changed = new MutationObserver(remeasure);
    changed.observe(root, { childList: true, subtree: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      resized?.disconnect();
      changed.disconnect();
      light(null);
    };
  }, [ref, reduced]);
}
