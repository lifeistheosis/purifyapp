"use client";

import { useRef } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useScrollFill } from "@/lib/ui/useScrollFill";

/**
 * The reading line of a work's page: a slim white fill along the top of the
 * screen, under the status bar, as the Bible's runs (1.8, the owner's pick
 * A of r3-29; components/bible/ReadingProgressBar.tsx, globals.css
 * .reader-progress): the page has no bar for it to sit under, and on a
 * computer it runs under the header. It fills as the chapter scrolls. Until
 * 1.8 it was a gold line pinned under the work's top bar; what is lit glows
 * white.
 *
 * The scroll moves the fill directly (lib/ui/useScrollFill.ts): no React
 * render and no easing on each frame, which is what made a long work stutter
 * on Android phones.
 */
export function MobileWorkProgressBar() {
  const fill = useRef<HTMLDivElement>(null);
  useScrollFill(fill);

  return (
    <div aria-hidden data-work-progress="" className="reader-progress fixed left-0 right-0 z-50">
      <ProgressBar value={0} height={2} durationMs={0} fillRef={fill} tone="paper" />
    </div>
  );
}
