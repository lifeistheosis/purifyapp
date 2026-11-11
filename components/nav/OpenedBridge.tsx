"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { endKeepLength, noteReaderMovedPage, noteTap, readyKeepLength } from "@/lib/ui/keepLength";
import { endShowOpened, followIfOpened, noteOpeningTap, noteReaderMoved } from "@/lib/ui/showOpened";

// On the server there is no layout to read and useLayoutEffect only warns
// (the same choice components/nav/RouteTransition.tsx makes).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * What opens shows itself (1.9, build 93 note 15; the rule and the story are
 * in lib/ui/showOpened.ts).
 *
 * One mount for the whole app, so no part that opens has to remember it. It
 * hears a tap on anything that says it opens something (`aria-expanded`, a
 * `<summary>`), and watches for that control turning to open; the page is
 * then moved with what it opened. A part has only to say what it opens
 * (`aria-controls`), and lib/ui/__tests__/openedParts.test.ts fails one that
 * does not.
 *
 * Watched by attribute and not by the tap alone, because what a tap opens is
 * not always there when the tap's own handler returns: replies are read from
 * the device first, a list is filled a beat later. The control turns to open
 * when its part is drawn, and that is the moment to begin.
 *
 * AND WHAT CLOSES DOES NOT PULL THE PAGE (the pre-build gate's first rule;
 * the rule and the story are in lib/ui/keepLength.ts). The same mount, for
 * the other half of the same thing: a part that closes near the foot of a
 * page leaves the page too short for where the reader stands, and the
 * browser takes the page back up with their finger still on it. Every tap is
 * noted where it lands, and the page keeps the length the reader is looking
 * at. A change of page lets it go, before the next page is painted.
 *
 * Mounted once in the root layout, beside ScrollResetBridge and for the same
 * two reasons: Today sits outside the (app) group, and a root mount cannot be
 * forgotten when a route group is added.
 *
 * Renders nothing.
 */
export function OpenedBridge() {
  const pathname = usePathname() ?? "/";

  // No length is kept for a page that has gone.
  useIsoLayoutEffect(() => {
    endKeepLength();
  }, [pathname]);

  useEffect(() => {
    // Capturing, so the control is measured where the thumb met it, before
    // anything its own handler moves.
    document.addEventListener("click", noteOpeningTap, true);
    // The one thing keeping a page's length ever adds to the page, added now
    // and not at a tap (lib/ui/keepLength.ts, "Nothing is written on the page").
    readyKeepLength();
    document.addEventListener("click", noteTap, true);
    // The reader's own scroll: what they tapped before it is no longer where it was.
    window.addEventListener("touchmove", noteReaderMoved, { passive: true });
    window.addEventListener("wheel", noteReaderMoved, { passive: true });
    window.addEventListener("touchmove", noteReaderMovedPage, { passive: true });
    window.addEventListener("wheel", noteReaderMovedPage, { passive: true });
    const seen = new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.target instanceof Element && followIfOpened(change.target)) return;
      }
    });
    seen.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["aria-expanded", "open"] });
    return () => {
      document.removeEventListener("click", noteOpeningTap, true);
      document.removeEventListener("click", noteTap, true);
      window.removeEventListener("touchmove", noteReaderMoved);
      window.removeEventListener("wheel", noteReaderMoved);
      window.removeEventListener("touchmove", noteReaderMovedPage);
      window.removeEventListener("wheel", noteReaderMovedPage);
      seen.disconnect();
      endShowOpened();
      endKeepLength();
    };
  }, []);

  return null;
}
