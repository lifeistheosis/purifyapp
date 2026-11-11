"use client";

import { use, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { momentFor, onTheWay } from "@/lib/ui/loadingGrace";
import { outlineLeft } from "@/lib/ui/outlineLeave";

// On the server there is no layout to read and useLayoutEffect only warns
// (the same choice components/nav/RouteTransition.tsx makes).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
 * When the moment is over the outline arrives as its page would have: the
 * page switch pictures whatever arrives (components/nav/RouteTransition.tsx,
 * "A page that is slow to come"). And when the page is ready and React takes
 * the outline out, the outline says so from its own cleanup, while it still
 * stands, so that it can dissolve over the page and not be cut away
 * (lib/ui/outlineLeave.ts).
 *
 * The wrapper draws nothing (`display: contents`). Its mark names the
 * outline for the stylesheet (an outline that came in a picture is whole in
 * it: app/globals.css) and for the check that watches one arrive
 * (scripts/route-motion.mjs).
 */
export function AfterAMoment({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (typeof window !== "undefined" && onTheWay(pathname, window.location.pathname)) {
    use(momentFor(pathname));
  }
  const outline = useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    const el = outline.current;
    return () => {
      if (el) outlineLeft(el);
    };
  }, []);
  return (
    <div ref={outline} data-route-loading="" className="contents">
      {children}
    </div>
  );
}
