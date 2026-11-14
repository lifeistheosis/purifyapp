"use client";

// Readies the first opening of each tab ahead once the first screen of a cold
// start has settled (build 97 note 3; the work is lib/nav/readyAhead.ts).
// Settled: the document has loaded and a moment has passed with the reader
// looking at it. A tap before then means they are on their way somewhere, and
// the page they asked for comes first: this start is dropped. A reader still
// in the onboarding is readied at its end instead (HandoffSlate.tsx), so the
// questions' own motion is never shared.

import { useEffect } from "react";

import { isOnboarded } from "@/lib/onboarding/state";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { startReadyAhead } from "@/lib/nav/readyAhead";

/** After the load, how long the first screen is left to settle. */
export const SETTLE_MS = 1500;

export function ReadyAhead() {
  useEffect(() => {
    if (!IS_STATIC_EXPORT) return;
    let timer = 0;
    const dropped = () => window.clearTimeout(timer);
    const settle = () => {
      timer = window.setTimeout(() => {
        document.removeEventListener("pointerdown", dropped, true);
        if (isOnboarded()) startReadyAhead();
      }, SETTLE_MS);
    };
    document.addEventListener("pointerdown", dropped, true);
    if (document.readyState === "complete") settle();
    else window.addEventListener("load", settle, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", settle);
      document.removeEventListener("pointerdown", dropped, true);
    };
  }, []);
  return null;
}
