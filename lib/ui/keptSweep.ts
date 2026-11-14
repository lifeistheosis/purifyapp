/**
 * Back finds a sideways row where the reader left it (the pre-build gate's
 * first rule: Back returns the reader to where they were).
 *
 * Settings' reading modes were the first row to keep their sweep (c77723ea;
 * lib/ui/sweepKept.ts, which keeps it in the session's storage by the page's
 * address and the row's name, and gives it back only to a reader who came back
 * by a step through history). Every other row swept sideways still opened at
 * its start, or on what it centres, after Back: the reading room's shelves of
 * covers, the shop's rails, the chants, the saints' centuries, a chapter's
 * strip. They are drawn by two rows, components/ui/ScrollRail.tsx and
 * components/ui/ChipScroller.tsx, and both now hold their sweep here.
 *
 * A row is named by its label (what it is called to assistive technology) and,
 * where a page has more than one row of that name, its place among them, as
 * the row's own mark says (data-sweep). It gives the kept sweep back at once,
 * as it opens; a row whose items are still arriving (a rail fetched after the
 * page) is given it again each frame, for about a second and a half, until it
 * is wide enough to stand there, and never once the reader's hand is on it.
 * While a sweep given back stands, the row's own opening move (centring what
 * is current) leaves it be: what the reader left is where they were.
 */

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

import { forgetSweep, keepSweep, sweepKept } from "./sweepKept";

/** The mark a row carries with its name, so a page's rows of one name are told apart by their place. */
export const SWEEP_ATTR = "data-sweep";

/** How many frames a sweep given back waits for its row to be wide enough: about a second and a half. */
export const WAIT_FRAMES = 90;

/** The first signs of a reader's own hand on the row (as Settings' row and lib/ui/scrollReset.ts listen for). */
const HAND = ["touchstart", "wheel", "keydown", "pointerdown"] as const;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Where a row is kept: the page's address (with its query, which names a shop's piece) and the row's name, with its place among the page's rows of that name after the first. */
export function sweepWhere(row: Element, name: string, page: { pathname: string; search: string }, rows: ArrayLike<Element>): string {
  const same = Array.from(rows).filter((r) => r.getAttribute(SWEEP_ATTR) === name);
  const n = same.indexOf(row);
  return `${page.pathname}${page.search} ${name}${n > 0 ? ` ${n + 1}` : ""}`;
}

/** The row's element, as far as holding its sweep needs it. */
type Row = Pick<HTMLElement, "scrollLeft" | "scrollTo" | "addEventListener" | "removeEventListener">;

/**
 * Hold the row's sweep for the reader: give back what was kept for a reader who
 * came back (waiting for the row to be wide enough, never against their hand),
 * let it go on a visit that went forward, and keep it as the row moves.
 * `given` says whether a kept sweep was given back.
 */
export function holdSweep(row: Row, where: string): { given: boolean; stop: () => void } {
  const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : null;
  const caf = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : () => {};
  let wait = 0;
  let keepFrame = 0;
  const kept = sweepKept(where);
  if (kept === null) forgetSweep(where);

  let held = kept !== null;
  const place = (): boolean => {
    row.scrollTo({ left: kept!, behavior: "instant" });
    return Math.abs(row.scrollLeft - kept!) <= 1;
  };
  if (held && !place() && raf) {
    let left = WAIT_FRAMES;
    const step = () => {
      wait = 0;
      if (!held || place() || --left <= 0) return;
      wait = raf(step);
    };
    wait = raf(step);
  }

  const hand = () => {
    held = false;
  };
  const keep = () => {
    if (!raf) {
      keepSweep(where, row.scrollLeft);
      return;
    }
    if (keepFrame) return;
    keepFrame = raf(() => {
      keepFrame = 0;
      keepSweep(where, row.scrollLeft);
    });
  };
  row.addEventListener("scroll", keep, { passive: true });
  for (const type of HAND) row.addEventListener(type, hand, { passive: true });

  return {
    given: kept !== null,
    stop: () => {
      held = false;
      caf(wait);
      caf(keepFrame);
      row.removeEventListener("scroll", keep);
      for (const type of HAND) row.removeEventListener(type, hand);
    },
  };
}

/**
 * The row named `name` keeps its sweep across Back. Put `data-sweep={name}` on
 * the same element. Returns a ref that reads true once a kept sweep has been
 * given back, for the row's own opening move to leave it be.
 */
export function useKeptSweep(track: RefObject<HTMLElement | null>, name: string): RefObject<boolean> {
  const given = useRef(false);
  useIsoLayoutEffect(() => {
    const row = track.current;
    if (!row) return;
    const where = sweepWhere(row, name, window.location, document.querySelectorAll(`[${SWEEP_ATTR}]`));
    const hold = holdSweep(row, where);
    given.current = hold.given;
    return hold.stop;
  }, [track, name]);
  return given;
}
