"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * Whether the header should use its menu button at lg and above because the
 * full link row does not fit.
 *
 * The row used to switch to the menu at a fixed 1024px, on the belief that
 * it needs about 900px. It needs more than that, and how much more depends
 * on the language and on who is signed in: in English it ran 68 to 83px off
 * the right edge of every page between 1024 and about 1090px wide (found
 * 2026-09-27), and Greek, Filipino or German labels need far more. No fixed
 * breakpoint is right for all of them, so the row measures itself.
 *
 * Measured while the row is showing: if it is wider than the space it has,
 * switch to the menu and remember the width it needed. Measured while the
 * menu is showing: go back to the row once the space reaches that width. A
 * change in the row's own contents (a font arriving, the account link
 * becoming an avatar, the Premium pill turning into "Plus Activated") resizes
 * its children, which the observer sees, so a row that stops fitting is
 * caught however it happened.
 *
 * The row's links must not wrap (whitespace-nowrap), or a two-word label
 * folds onto a second line instead of overflowing, and nothing gets caught.
 */
export function useNavCompact(rowRef: RefObject<HTMLElement | null>): boolean {
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const neededRef = useRef(0);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const lg = window.matchMedia("(min-width: 1024px)");

    const set = (next: boolean) => {
      if (compactRef.current === next) return;
      compactRef.current = next;
      setCompact(next);
    };

    const check = () => {
      if (!lg.matches) {
        // Below lg the menu is the layout already. Forget the measurement so
        // the row is measured afresh on the way back up.
        neededRef.current = 0;
        set(false);
        return;
      }
      if (!compactRef.current) {
        if (row.scrollWidth > row.clientWidth + 1) {
          neededRef.current = row.scrollWidth;
          set(true);
        }
      } else if (row.clientWidth >= neededRef.current) {
        set(false);
      }
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(row);
    for (const child of Array.from(row.children)) observer.observe(child);
    lg.addEventListener("change", check);
    return () => {
      observer.disconnect();
      lg.removeEventListener("change", check);
    };
  }, [rowRef]);

  return compact;
}

/** Close an open menu when the row comes back, so its panel does not stay
 *  open, hidden, holding the header's background on. */
export function useCloseMenuWhenRowReturns(compact: boolean, setOpen: (open: boolean) => void) {
  const was = useRef(compact);
  useEffect(() => {
    if (was.current && !compact) setOpen(false);
    was.current = compact;
  }, [compact, setOpen]);
}
