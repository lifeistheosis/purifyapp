"use client";

import { use, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { momentFor, onTheWay } from "@/lib/ui/loadingGrace";

/**
 * Around a route's outline (`loading.tsx`): the outline waits a moment
 * before it shows, so a page that is ready at once arrives as itself. The
 * why, with the measurements, is in lib/ui/loadingGrace.ts.
 *
 * It waits by suspending, which is what keeps the page the reader is on in
 * front of them meanwhile, and only while they are on their way to this
 * page. On the server it never waits: the outline is what the first paint of
 * a slow page is made of.
 *
 * The wrapper draws nothing (`display: contents`). Its mark tells the page
 * switch that what arrived is an outline, which is not pictured as a page
 * arriving (components/nav/RouteTransition.tsx).
 */
export function AfterAMoment({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (typeof window !== "undefined" && onTheWay(pathname, window.location.pathname)) {
    use(momentFor(pathname));
  }
  return (
    <div data-route-loading="" className="contents">
      {children}
    </div>
  );
}
