"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { endReturn, keepPlace, noteLinkTap, returnToPlace } from "@/lib/ui/returnPlace";
import { endScrollHold, noteTraversal, onRouteCommitted } from "@/lib/ui/scrollReset";

// On the server there is no layout to read and useLayoutEffect only warns
// (the same choice components/admin/charts.tsx makes).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Where a page starts, in both directions.
 *
 * Forward: every page opened by going forward starts at its top, and is held
 * there while it arrives. The why, with the measurements, is in
 * lib/ui/scrollReset.ts.
 *
 * Back: the reader is put where their thumb was. The browser restores a
 * number of pixels, and on a long list whose cards are placeholders until
 * they are scrolled to, that number is somewhere else: 3,022px from the saint
 * a reader had opened, forty saints down the list. The link that was tapped
 * is remembered instead, and the page is moved until it sits where it sat
 * (lib/ui/returnPlace.ts).
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
 * A layout effect, so the scroll is where it belongs before the page is ever
 * painted anywhere else.
 *
 * Renders nothing.
 */
export function ScrollResetBridge() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    window.addEventListener("popstate", noteTraversal);
    // Capturing, so the link is noted before anything it does: by the time a
    // handler has run, the page may already be on its way out.
    document.addEventListener("click", noteLinkTap, true);
    return () => {
      window.removeEventListener("popstate", noteTraversal);
      document.removeEventListener("click", noteLinkTap, true);
      endScrollHold();
      endReturn();
    };
  }, []);

  useIsoLayoutEffect(() => {
    // The page the visit began on is where the browser put it: a reload
    // comes back to where the reader was.
    if (first.current) {
      first.current = false;
      return;
    }
    if (onRouteCommitted() === "traversal") returnToPlace();
    else keepPlace();
  }, [pathname]);

  return null;
}
