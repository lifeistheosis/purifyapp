"use client";

import { ViewTransition, useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { isNativeClient } from "@/lib/platform/native";
import { overlayOwnsBack } from "@/lib/platform/useAndroidBack";
import { arrived, beginNav, canMove, carryIn, dropReturn, endNav, isReturning, liftFrom, noteNav, quietEntrance, returnBy, samePage, takeNav } from "@/lib/ui/routeMotion";
import { endRouteExit } from "@/lib/ui/routeTransition";

// On the server there is no layout to read and useLayoutEffect only warns
// (the same choice components/nav/ScrollResetBridge.tsx makes).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Every page switch moves (1.9, build 89 note 4). The why, and the two ways
 * in, are in lib/ui/routeMotion.ts; this is the one place the routes are
 * wired to it.
 *
 * Mounted once in the root layout, beside RouteExitBridge and
 * ScrollResetBridge and after them, for their reasons: Today sits outside the
 * (app) group, and a root mount cannot be forgotten when a route group is
 * added. After them, because effects run in order and this one pictures what
 * they have set right: the dim lifted, the scroll where it belongs.
 *
 * FORWARD AND ACROSS. The mark below is what React is asked to picture. It
 * draws nothing: one transparent pixel that carries the address, alone inside
 * its <ViewTransition>. React pictures a <ViewTransition> when something
 * inside it changes, and the only thing inside this one is the address, so
 * nothing else a page does in a React transition (a search answering, a list
 * arriving) is ever pictured as a page switch. When the new page commits,
 * React starts the browser's transition; the layout effect, which runs
 * inside it and before the new page is pictured, says how this change moves
 * and keeps the whole page in the picture (routeMotion.beginNav). The effect
 * below it hands the page back, which is safe whenever it runs (routeMotion,
 * `dress`).
 *
 * BACK. A step through history is committed at once, and React pictures
 * nothing. The step itself is taken inside a transition the app starts
 * (routeMotion.returnBy, from lib/nav/goBack.ts and from the phone's Back
 * button below); when the page behind commits, the layout effect lets that
 * transition go on (routeMotion.arrived).
 *
 * Keyed on `usePathname()`, like its neighbours: a filter that only rewrites
 * the query string is not a page switch.
 *
 * Renders the mark, and nothing a reader can see.
 */
export function RouteTransition() {
  const pathname = usePathname() ?? "/";
  // The page now on screen, for the listeners, which outlive a render.
  const here = useRef(pathname);

  useEffect(() => {
    // Before the router's own listener (a child's effects run before its
    // parents', and the router is this bridge's ancestor), so the step is
    // known before the page it brings is committed.
    const onStep = () => {
      if (isReturning()) {
        // The step the app took, landing on the same page: it closed
        // something that had made a history entry of its own (a sheet), and
        // no page is coming. Let the picture go at once.
        if (samePage(window.location.pathname, here.current)) dropReturn();
        return;
      }
      // The browser's own Back or Forward: not pictured.
      noteNav("traverse");
    };
    // A tap on a card whose picture leads to its own page: the picture is
    // lifted now, to travel (routeMotion, "A picture that leads to its own
    // page"). Capturing, so it is lifted before anything the tap does.
    const onTap = (event: MouseEvent) => liftFrom(event.target);
    window.addEventListener("popstate", onStep);
    document.addEventListener("click", onTap, true);
    return () => {
      window.removeEventListener("popstate", onStep);
      document.removeEventListener("click", onTap, true);
    };
  }, []);

  useEffect(() => {
    // The phone's Back button, on Android. With no listener the shell steps
    // the WebView back itself (Capacitor's AppPlugin, handleOnBackPressed),
    // which is the browser's own Back to this page and is not pictured. With
    // this one the same step is taken from here, inside a transition. A
    // sheet or a dialog that has taken Back for itself keeps it
    // (lib/platform/useAndroidBack.ts); at the bottom of the history nothing
    // happens, as before.
    if (!isNativeClient()) return;
    let disposed = false;
    let remove: (() => void) | undefined;
    void (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          if (overlayOwnsBack()) return;
          if (canGoBack) returnBy(() => window.history.back());
        });
        if (disposed) {
          void handle.remove();
          return;
        }
        remove = () => void handle.remove();
      } catch {
        // No plugin: the shell goes on stepping back itself.
      }
    })();
    return () => {
      disposed = true;
      remove?.();
    };
  }, []);

  useIsoLayoutEffect(() => {
    const from = here.current;
    here.current = pathname;
    if (samePage(from, pathname)) return;
    // The tab bar's dim is lifted here, before the new page is pictured or
    // painted (RouteExitBridge lifts it again after, and is the one that
    // holds when this does not run).
    endRouteExit();
    const note = takeNav(from, pathname);
    if (arrived()) {
      quietEntrance("back");
      return;
    }
    if (note === "traverse" || !canMove()) return;
    // The page took more than a moment to read and its outline has come
    // first (components/ui/AfterAMoment.tsx). An outline is not pictured as
    // a page arriving: React keeps the page itself back until a picture has
    // finished, and the reader would wait a third of a second more for it.
    // Left unnamed, the page is out of this transition, which is then over
    // in a frame (the mark's own picture is instant, app/globals.css).
    if (document.querySelector("[data-route-loading]")) return;
    beginNav(note);
    quietEntrance(note);
    carryIn(pathname);
  }, [pathname]);

  useEffect(() => {
    endNav();
  }, [pathname]);

  return (
    <ViewTransition default="none" update={canMove() ? "route-mark" : "none"}>
      <span aria-hidden data-route-mark={pathname} className="route-mark" />
    </ViewTransition>
  );
}
