"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/lib/ui/motion";
import { joinNumeric, splitNumeric, valueAt } from "@/lib/admin/ledger/countUp";

/**
 * A figure that counts up once, on first paint, over --adm-count-ms.
 *
 * Takes a formatted string or a number and animates the number inside it
 * (lib/admin/ledger/countUp.ts does the splitting), so "$1,204.50" runs
 * from "$0.00" and "3.2%" from "0.0%". Later changes to the value are
 * swapped in, not re-run: a panel that polls every minute and animates
 * every poll is a fruit machine. Reduced motion renders the final value.
 *
 * TRUTH DOES NOT DEPEND ON A FRAME. The old odometer learned this the hard
 * way: it once held the digit in state advanced by requestAnimationFrame,
 * rAF does not fire in a hidden tab, and the panel showed 00,000 where the
 * figure was 12,480. So here the final value is written by a timeout as
 * well as by the last frame, the tab going hidden snaps to it, and a
 * throttled frame loop can only ever make the number arrive late, never
 * make it wrong.
 */
export const COUNT_MS = 400;

export function CountUp({
  value,
  className,
}: {
  value: string | number;
  className?: string;
}) {
  const text = typeof value === "number" ? value.toLocaleString("en-US") : value;
  const reduced = useReducedMotion();
  const split = splitNumeric(text);
  // Animate exactly once per mount, and only when there is something to
  // count and motion is allowed. The ref is the "once".
  const ran = useRef(false);
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current || reduced || !split) return;
    ran.current = true;
    const start = performance.now();
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      setShown(null);
      document.removeEventListener("visibilitychange", onHide);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") finish();
    };
    const tick = (now: number) => {
      const t = (now - start) / COUNT_MS;
      if (t >= 1) {
        finish();
        return;
      }
      setShown(joinNumeric(split, valueAt(split.value, t)));
      frame = requestAnimationFrame(tick);
    };
    setShown(joinNumeric(split, 0));
    frame = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", onHide);
    // The backstop: whatever the frame loop did, the true figure is on
    // screen by the time the budget is spent.
    const timer = window.setTimeout(finish, COUNT_MS + 50);
    return () => {
      window.clearTimeout(timer);
      finish();
    };
    // Mount only: the value on later renders is swapped in through `text`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {/* A reader gets the real figure once; the counting frames are
          decoration and are hidden from it. */}
      {shown !== null ? (
        <>
          <span className="sr-only">{text}</span>
          <span aria-hidden>{shown}</span>
        </>
      ) : (
        text
      )}
    </span>
  );
}
