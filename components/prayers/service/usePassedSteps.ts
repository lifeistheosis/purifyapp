"use client";

import { useEffect, useRef, type RefObject } from "react";

import { passedNow, type PassState } from "@/lib/prayers/easyScroll";
import { READING_PLACE, placeIn, visibleBand } from "@/lib/ui/readingPlace";

/**
 * Each prayer counted as prayed as the reader passes it (1.9, build 89 note
 * 7): nothing is ticked under a prayer any more, so the page itself notices
 * a prayer the reader has moved down through, its whole length gone above the
 * reading place (lib/prayers/easyScroll.ts, passedNow), and says so once.
 * The Amen at the end still marks the whole rule.
 *
 * With Purify's motion on or off, and with Easy Scroll or without it: the
 * count is not motion. Cheap as useLitLine is: the prayers' ends are measured
 * when the page changes size or its words change, and a scroll reads only
 * where the page is, once a frame at most.
 */
export function usePassedSteps(ref: RefObject<HTMLElement | null>, onPassed: (id: string) => void, { ready = true }: { ready?: boolean } = {}) {
  const latest = useRef(onPassed);
  useEffect(() => {
    latest.current = onPassed;
  }, [onPassed]);

  useEffect(() => {
    const root = ref.current;
    if (!root || !ready || typeof window === "undefined") return;

    const state: PassState = { seen: new Set(), told: new Set() };
    let ends: { id: string; bottom: number }[] = [];
    let frame = 0;

    const measure = () => {
      const y = window.scrollY;
      ends = [...root.querySelectorAll<HTMLElement>("[data-step]")]
        .filter((step) => step.id)
        .map((step) => ({ id: step.id, bottom: step.getBoundingClientRect().bottom + y }));
    };
    const check = () => {
      frame = 0;
      const place = window.scrollY + placeIn(visibleBand(), READING_PLACE);
      for (const id of passedNow(ends, place, state)) latest.current(id);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    const remeasure = () => {
      measure();
      schedule();
    };

    measure();
    check();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    const resized = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(remeasure);
    resized?.observe(root);
    const changed = new MutationObserver(remeasure);
    changed.observe(root, { childList: true, subtree: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      resized?.disconnect();
      changed.disconnect();
    };
  }, [ref, ready]);
}
