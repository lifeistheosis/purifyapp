"use client";

import { Suspense, useState, useSyncExternalStore, type ReactNode } from "react";

const noSubscribe = () => () => {};
const mountedOnTheDevice = () => true;
const inThePageHtml = () => false;

/**
 * The boundary a page addressed by its query needs for the export, and only
 * there (1.9, Updates 90).
 *
 * A page that reads its address on the device (useSearchParams) needs a
 * Suspense boundary when the export renders it, or the build stops. Each such
 * page stood behind `<Suspense fallback={null}>`. In a page switch React does
 * not hold the page being left for a boundary that is new: it shows the new
 * boundary's fallback at once (react-dom, shouldRemainOnPreviousScreen holds
 * the old screen only while no new boundary stands above what waits), so the
 * screen stood empty while the page's script arrived. Measured on the export
 * of 17276848: /campaigns/detail/ 7 of 8 runs, /email/change/ 2 of 4.
 *
 * So the boundary is drawn only where the export needs it: in the page's own
 * HTML, and while that HTML wakes, so the first render matches it. A page
 * mounted by a switch on the device has none, so React keeps the page being
 * left on the screen until the new one can be drawn whole, and the switch is
 * the house's own. The choice is made once, at the first render, and kept:
 * a boundary taken away after waking would draw the page a second time.
 */
export function ArrivalBoundary({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(noSubscribe, mountedOnTheDevice, inThePageHtml);
  const [inHtml] = useState(!mounted);
  return inHtml ? <Suspense fallback={null}>{children}</Suspense> : children;
}
