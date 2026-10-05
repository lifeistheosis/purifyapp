"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { endScrollHold, noteTraversal, onRouteCommitted } from "@/lib/ui/scrollReset";

// On the server there is no layout to read and useLayoutEffect only warns
// (the same choice components/admin/charts.tsx makes).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Starts every page opened by going forward at its top, and holds it there
 * while the page arrives. The why, with the measurements, is in
 * lib/ui/scrollReset.ts.
 *
 * Mounted once in the root layout, beside RouteExitBridge and for the same
 * two reasons: Today sits outside the (app) group, and a root mount cannot be
 * forgotten when a route group is added.
 *
 * Keyed on `usePathname()`, like RouteExitBridge: a filter that only rewrites
 * the query string is not a new page and must not throw the reader to the
 * top. The one page that changes by its query string, a product in the apps
 * (/shop/icons/detail?slug=), resets itself when its slug changes.
 *
 * A layout effect, so the scroll is at the top before the new page is ever
 * painted lower down.
 *
 * Renders nothing.
 */
export function ScrollResetBridge() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    window.addEventListener("popstate", noteTraversal);
    return () => {
      window.removeEventListener("popstate", noteTraversal);
      endScrollHold();
    };
  }, []);

  useIsoLayoutEffect(() => {
    // The page the visit began on is where the browser put it: a reload
    // comes back to where the reader was.
    if (first.current) {
      first.current = false;
      return;
    }
    onRouteCommitted();
  }, [pathname]);

  return null;
}
