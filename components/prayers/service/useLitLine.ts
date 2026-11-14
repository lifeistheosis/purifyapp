"use client";

import { useEffect, type RefObject } from "react";

import { useReducedMotion } from "@/lib/ui/motion";
import { ON_PLACE_PX, clicksFor, lineAt, litShare } from "@/lib/prayers/easyScroll";
import { goToReadingPlace, placeIn, visibleBand } from "@/lib/ui/readingPlace";
import { handTicks, readyTicks } from "@/lib/ui/scrollTicks";

/**
 * The line being read, lit as the page scrolls (1.7): the owner asked for
 * the prayer reader to read like the player's live lyrics and the read-aloud
 * follow, the line being read bright and the rest a step back as you move
 * through, driven by the scroll and behind the app's motion switch.
 *
 * The line lit carries `data-lit`, and the reader carries `data-following`
 * once the first line has reached its place, so the page reads at full
 * strength until the reader begins. app/globals.css draws the step back,
 * under the motion switch only: with motion off, nothing is marked and every
 * line stays at full strength.
 *
 * The line lit is the one over the middle of the part of the screen the
 * reader can see, between the bar at the top and the tab bar and the mini
 * player at the foot (build 97 note 1, his words: "it should glow the quite
 * in the middle of the users screen"; LIT_AT in lib/ui/readingPlace.ts), the
 * same place Begin and Your rule today put a prayer's first line (goToPrayer,
 * below), so the line they land on is the one lit. It was two fifths down
 * that part until build 97, and two fifths of the whole window until build 81.
 *
 * Near the foot of the page the place slides down with the last lines, which
 * could otherwise never rise to it (litShare in lib/prayers/easyScroll.ts).
 *
 * The click (build 89 note 7's Easy Scroll, his "haptic feedback when they
 * scroll to each section"): one in the hand in the same frame as the line lit
 * lands in a new prayer, which moving down is that prayer's first line (build
 * 97 note 1: "rather than haptic feedback on a arbitrary feeling line with no
 * visual hook"). Until then it came from a measure of its own, when a
 * prayer's box, its name and the room above it, reached two fifths down a
 * band read only when the page changed size, while the glow was still on the
 * prayer before. None for another verse of the same prayer, none twice in a
 * row for one prayer, none for the prayer lit as the page opens. The click is
 * not motion: with Purify's motion off the line at the middle is still
 * followed for it, and only the marks wait. In a browser it is inert
 * (lib/ui/scrollTicks.ts).
 *
 * Easy Scroll's snapping went at build 93 note 2, his words: "When I try and
 * scroll down, it scrolls back up. When I try and scroll down, it just keeps
 * on scrolling." Measured on that build's export with real touch at 360, 390
 * and 820: a fling pulled back up 65 to 66px, a gentle flick run on 29 to
 * 273px where the phone's own momentum ends at 24 to 30px, a slow drag held
 * still moved on 30 to 73px. The page scrolls as the phone scrolls
 * (scripts/export-walk.mjs, section 55).
 *
 * The prayer the lit line stands in carries `data-praying` (1.8, the owner's
 * pick B, Immersive, for while you pray): the prayers before and after it step
 * back further than its own unlit lines, so the one being prayed sits lit in
 * the middle (app/globals.css). Each prayer of the page marks itself with
 * `data-step`.
 *
 * Cheap on an older phone: the lines' places are measured once, and again
 * only when the page changes size or its lines change (a wording switched, a
 * prayer marked); a scroll reads where the page is and the handful of bars
 * that make the band, and finds the line by halving, once a frame at most,
 * and touches the page only when the line changes.
 */
export function useLitLine(ref: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // With motion off nothing is marked: the clicks alone follow the line.
    const mark = !reduced;

    let lines: HTMLElement[] = [];
    let tops: number[] = [];
    let lit: HTMLElement | null = null;
    let praying: HTMLElement | null = null;
    // The prayer of the last click, or the one lit as the page opened.
    let reached: string | null = null;
    let opened = false;
    let frame = 0;
    readyTicks();

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
        if (step && mark) step.dataset.praying = "";
      }
      if (line && mark) {
        line.dataset.lit = "";
        root.dataset.following = "";
      } else {
        delete root.dataset.following;
      }
      // The click, in this same frame: the glow has just landed in a new prayer.
      const now = step?.id || null;
      if (opened && clicksFor(reached, now)) {
        const click = handTicks();
        click.tick();
        click.end();
      }
      if (now) reached = now;
    };

    const update = () => {
      frame = 0;
      if (lines.length === 0) {
        light(null);
        opened = true;
        return;
      }
      const band = visibleBand();
      const y = window.scrollY;
      const left = document.documentElement.scrollHeight - (y + window.innerHeight);
      // A line set exactly on its place (Begin, Your rule today) can sit a
      // fraction of a pixel past it: it is the one being read.
      const place = y + placeIn(band, litShare(band.bottom - band.top, left)) + ON_PLACE_PX;
      const at = lineAt(tops, place);
      light(at < 0 ? null : (lines[at] ?? null));
      opened = true;
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

/**
 * Takes the reader to a prayer of the page: Begin, and a prayer opened from
 * Your rule today (/prayers/personal/<part>#<step>). Its first line stands
 * over the band's middle, where the scroll lights it (build 97 note 1), with
 * the prayer's name just above, and the focus goes to the name without
 * moving the page.
 *
 * It stood the prayer at the very top of the screen, its name under the bar
 * (the owner's build 81 note: "popping up too high"). The first line and not
 * the name goes to the middle, because the line lit is the one there:
 * with the name there, the line lit would be the last of the prayer before,
 * and the prayer landed on would step back as one not being prayed. A step
 * with no lines (none today) is set by its name.
 */
export function goToPrayer(id: string, { smooth = true }: { smooth?: boolean } = {}): void {
  const step = document.getElementById(id);
  if (!step) return;
  const title = document.getElementById(`${id}-title`);
  goToReadingPlace(step.querySelector("[data-line]") ?? title ?? step, { smooth, align: "top" });
  title?.focus({ preventScroll: true });
}
