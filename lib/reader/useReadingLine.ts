"use client";

import { useEffect } from "react";

/** Where the eye rests on a phone held to read: this far down the screen. */
export const READING_LINE = 0.4;

/**
 * Candlelight's lit lines (1.9, the owner's pick A and B of 2026-11-06,
 * "the lines being read lit, the rest dimmed"): the verse under the reading
 * line, READING_LINE of the way down the screen, carries `data-lit`, and
 * app/globals.css dims the others a little while Candlelight is on.
 *
 * One look per frame at most, and only at the point on the line
 * (elementFromPoint), never over every verse. A gap between verses keeps the
 * verse lit before it. Off, it takes its mark away.
 */
export function useReadingLine(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let lit: Element | null = null;
    let frame = 0;
    const mark = () => {
      frame = 0;
      const y = Math.round(window.innerHeight * READING_LINE);
      const at = document.elementFromPoint(Math.round(window.innerWidth / 2), y);
      const verse = at?.closest("[data-verse]") ?? null;
      if (!verse || verse === lit) return;
      lit?.removeAttribute("data-lit");
      verse.setAttribute("data-lit", "");
      lit = verse;
    };
    const ask = () => {
      if (!frame) frame = window.requestAnimationFrame(mark);
    };
    ask();
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", ask);
      window.removeEventListener("resize", ask);
      lit?.removeAttribute("data-lit");
    };
  }, [active]);
}
