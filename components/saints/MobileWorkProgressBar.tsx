"use client";

import { useRef } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useScrollFill } from "@/lib/ui/useScrollFill";

/**
 * Slim 2px gold progress bar at the top of a saint-work reader on
 * mobile. Anchored under the 48px MobileTopBar. Scroll-driven; the
 * gold fill scales from 0→1 as the reader moves through the document.
 *
 * The scroll moves the fill directly (lib/ui/useScrollFill.ts): no React
 * render and no easing on each frame, which is what made a long work stutter
 * on Android phones.
 */
export function MobileWorkProgressBar() {
  const fill = useRef<HTMLDivElement>(null);
  useScrollFill(fill);

  return (
    <div
      aria-hidden
      // Sits flush under the 48px MobileTopBar; below-topbar adds the
      // status-bar inset on native so it clears the taller pinned bar.
      className="md:hidden native-md-block fixed left-0 right-0 top-12 below-topbar z-30"
    >
      <ProgressBar value={0} height={2} durationMs={0} fillRef={fill} />
    </div>
  );
}
