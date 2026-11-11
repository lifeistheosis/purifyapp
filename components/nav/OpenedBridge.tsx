"use client";

import { useEffect } from "react";

import { endShowOpened, followIfOpened, noteOpeningTap, noteReaderMoved } from "@/lib/ui/showOpened";

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
 * Mounted once in the root layout, beside ScrollResetBridge and for the same
 * two reasons: Today sits outside the (app) group, and a root mount cannot be
 * forgotten when a route group is added.
 *
 * Renders nothing.
 */
export function OpenedBridge() {
  useEffect(() => {
    // Capturing, so the control is measured where the thumb met it, before
    // anything its own handler moves.
    document.addEventListener("click", noteOpeningTap, true);
    // The reader's own scroll: what they tapped before it is no longer where it was.
    window.addEventListener("touchmove", noteReaderMoved, { passive: true });
    window.addEventListener("wheel", noteReaderMoved, { passive: true });
    const seen = new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.target instanceof Element && followIfOpened(change.target)) return;
      }
    });
    seen.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["aria-expanded", "open"] });
    return () => {
      document.removeEventListener("click", noteOpeningTap, true);
      window.removeEventListener("touchmove", noteReaderMoved);
      window.removeEventListener("wheel", noteReaderMoved);
      seen.disconnect();
      endShowOpened();
    };
  }, []);

  return null;
}
