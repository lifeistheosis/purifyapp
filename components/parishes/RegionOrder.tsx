"use client";

// Find a parish: draws the page's regions with the reader's own first
// (lib/parishes/regionFirst.ts says why and how it is told).
//
// The regions themselves are drawn by the server component and handed in as
// they are, so the list stays plain HTML in the website's page and in the
// apps' export. This only chooses their order.
//
// NOTHING MOVES AFTER THE PAGE IS DRAWN. A reader who comes to the page from
// inside Purify (the week's card, Discover) finds it drawn in their order
// from its first frame. A page opened from outside (a search engine, a link,
// the app waking on this page) was drawn by the server in the page's own
// order before any script ran, and it keeps that order for the visit:
// reordering it then would move the list under the reader's finger.

import { useSyncExternalStore, type ReactNode } from "react";

import type { ParishRegionId } from "@/lib/parishes/finders";
import { loadedOn, regionOfTimeZone, regionOrder } from "@/lib/parishes/regionFirst";

/** True when the page now showing is the one the document itself was loaded on (loadedOn says how). */
function loadedOnThisPage(): boolean {
  try {
    const [first] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return loadedOn(first?.name, window.location.href);
  } catch {
    // No such record to ask: a page opened from outside, which never reorders.
    return true;
  }
}

function deviceRegion(): ParishRegionId | null {
  try {
    return loadedOnThisPage() ? null : regionOfTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return null;
  }
}

const never = () => () => {};

export function RegionOrder({ ids, children }: { ids: readonly ParishRegionId[]; children: readonly ReactNode[] }) {
  // The server's answer is the page's own order, and a hydration keeps it.
  const first = useSyncExternalStore(never, deviceRegion, () => null);
  return <>{regionOrder(ids, first).map((i) => children[i])}</>;
}
