"use client";

// The bar a guided flow stands in at the foot of a chapter: today's readings
// in one go (components/bible/ReadingsFlowBar.tsx) and a reading plan's day
// (components/plans/PlanFlowBar.tsx), one component so the two are one bar.
// Moved here unchanged from the readings bar in 1.7 (the owner's note 22,
// "the plan bar while reading, like today's readings").

import { useEffect } from "react";

/**
 * At the foot, over the tab bar and over the mini player when one plays.
 * While it is up it says so on <html> (.has-readings-flow, globals.css), as
 * the mini player does, so the way out of focus mode stands above it. Only one
 * flow is ever under way (lib/plans/session.ts and lib/readings/flow.ts end
 * each other), so one class is enough for both.
 */
export function FlowBarShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-readings-flow");
    return () => root.classList.remove("has-readings-flow");
  }, []);
  return (
    <div
      className="now-playing-lift pointer-events-none fixed inset-x-0 bottom-0 z-[54] px-3 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] md:pb-4"
      style={{ transform: "translateY(calc(-1 * var(--now-playing-h, 0px)))" }}
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-[18px] bg-night-soft py-2 pl-4 pr-2 shadow-[0_14px_34px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-paper/10">
        {children}
      </div>
    </div>
  );
}
