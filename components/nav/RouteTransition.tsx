"use client";

import { Suspense, ViewTransition, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { noteOpening, openingWritten } from "@/lib/nav/addressOpening";
import { noteWayRoute, noteWayTap } from "@/lib/nav/readerWay";
import { isNativeClient } from "@/lib/platform/native";
import { overlayOwnsBack } from "@/lib/platform/useAndroidBack";
import { outlinesForgotten } from "@/lib/ui/outlineLeave";
import { arrived, beginNav, canMove, carryIn, dropReturn, endNav, isReturning, liftFrom, namedByQuery, noteNav, pageOf, quietEntrance, returnBy, samePage, takeNav } from "@/lib/ui/routeMotion";
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
 * its <ViewTransition>. When the new page commits, React starts the
 * browser's transition; the layout effect, which runs inside it and before
 * the new page is pictured, says how this change moves and keeps the whole
 * page in the picture (routeMotion.beginNav). The effect below it hands the
 * page back, which is safe whenever it runs (routeMotion, `dress`).
 *
 * THE MARK ASKS ONLY WHILE THE ADDRESS IS CHANGING (`settled`, below). It
 * asked always, until the week 1.9 was finished, on the reasoning that only
 * the address is inside it. That is not how React decides. On every change
 * it may picture (a part of a page arriving a beat late, a filter that
 * rewrites the address, a page taking its outline's place) React names every
 * <ViewTransition> standing anywhere beside what changed, in case it moved,
 * and starts a transition to find out (react-dom,
 * commitNestedViewTransitions). Nothing was seen to move, but the transition
 * was real: it ran its 420ms unseen, and React holds its next change until a
 * picture is over. Measured on the export on 2026-11-11, a page whose script
 * was there 450ms after the tap: three transitions for the one tap, and the
 * page on screen at 1246ms where it could have been there at 615, the rest
 * spent waiting on pictures of nothing. So between changes of address the
 * mark says "none", which React takes at its word. The layout effect says so
 * the moment a change has been pictured, and React draws the mark again at
 * once, before anything else can commit.
 *
 * A PAGE THAT IS SLOW TO COME shows its outline first (`loading.tsx`, held
 * off for a moment by lib/ui/loadingGrace.ts), and the outline is pictured
 * here exactly as its page would be: it IS the page arriving, as far as a
 * reader can tell. Until that same week it was left out of the picture and
 * cut in, on the fear that picturing it would keep the page itself back.
 * Measured since: React keeps an outline it has shown for 300ms whatever we
 * do (react-dom, FALLBACK_THROTTLE_MS: an outline that flashed would be worse
 * than none), and the picture is over in 340, so the page waits on the
 * picture for a few hundredths of a second at the most, and only when it was
 * ready that soon. When the page is ready it takes its outline's place with
 * no picture from React at all (the mark says "none" by then), and the
 * outline dissolves over it (lib/ui/outlineLeave.ts).
 *
 * BACK. A step through history is committed at once, and React pictures
 * nothing. The step itself is taken inside a transition the app starts
 * (routeMotion.returnBy, from lib/nav/goBack.ts and from the phone's Back
 * button below); when the page behind commits, the layout effect lets that
 * transition go on (routeMotion.arrived).
 *
 * Keyed on `usePathname()`, like its neighbours: a filter that only rewrites
 * the query string is not a page switch. The one exception is a page
 * addressed by its query, the export's page for a piece (routeMotion,
 * `pageOf`): from one piece to another only the query changes, and that is
 * pictured by `QueryRoute` below, mounted only on such a page and inside a
 * Suspense boundary of its own: the static export cannot draw what reads the
 * query, and leaves it to the device, so no other page reads it.
 *
 * Renders the mark, and nothing a reader can see.
 */
export function RouteTransition() {
  const pathname = usePathname() ?? "/";
  // The page now on screen, for the listeners, which outlive a render.
  const here = useRef(pathname);
  // Its query, where the query names the page (QueryRoute): which piece.
  const queryRef = useRef("");
  // The last address this bridge has dealt with. While it is not the one
  // being rendered, a change of address is on its way, and only then does
  // the mark ask React for a picture.
  const [settled, setSettled] = useState(pathname);
  const changing = !samePage(settled, pathname);

  useEffect(() => {
    // Before the router's own listener (a child's effects run before its
    // parents', and the router is this bridge's ancestor), so the step is
    // known before the page it brings is committed.
    const onStep = () => {
      if (isReturning()) {
        // The step the app took, landing on the same page: it closed
        // something that had made a history entry of its own (a sheet), and
        // no page is coming. Let the picture go at once.
        if (pageOf(window.location.pathname, window.location.search) === pageOf(here.current, queryRef.current)) dropReturn();
        return;
      }
      // The browser's own Back or Forward: not pictured.
      noteNav("traverse");
    };
    // A tap on a card whose picture leads to its own page: the picture is
    // lifted now, to travel (routeMotion, "A picture that leads to its own
    // page"). Capturing, so it is lifted before anything the tap does.
    // And the address a tapped link opens, for the page arriving to read its
    // place from before the router writes it (lib/nav/addressOpening.ts).
    const onTap = (event: MouseEvent) => {
      liftFrom(event.target);
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (link instanceof HTMLAnchorElement) noteOpening(link.href);
    };
    // And where the page stood at every tap, for a reader who is leaving it
    // for a room they will come back out of (lib/nav/readerWay.ts). Once now
    // too, so the page the visit began on is known.
    const onWay = () => noteWayTap();
    onWay();
    window.addEventListener("popstate", onStep);
    document.addEventListener("click", onTap, true);
    document.addEventListener("click", onWay, true);
    return () => {
      window.removeEventListener("popstate", onStep);
      document.removeEventListener("click", onTap, true);
      document.removeEventListener("click", onWay, true);
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
    // The router has written the address with this commit: the window says it now.
    openingWritten();
    // This change of address is dealt with: the mark asks for nothing more
    // until the next one. Said here and not in the effect below, because
    // React draws again at once for a layout effect, before any other change
    // can commit, and leaves the effect below until the picture is over.
    setSettled(pathname);
    if (samePage(from, pathname)) return;
    // The tab bar's dim is lifted here, before the new page is pictured or
    // painted (RouteExitBridge lifts it again after, and is the one that
    // holds when this does not run).
    endRouteExit();
    // An outline that left with the page being left is in this change's own
    // picture, and is not left over the next page (lib/ui/outlineLeave.ts).
    outlinesForgotten();
    const note = takeNav(from, pathname);
    if (arrived()) {
      // A step through history, whatever the two addresses say of it. Every
      // route is told to the way out of a reader, with how it came
      // (lib/nav/readerWay.ts).
      noteWayRoute("traverse");
      quietEntrance("back");
      return;
    }
    noteWayRoute(note);
    if (note === "traverse" || !canMove()) return;
    // Whatever arrived is pictured as the page arriving: the page, or its
    // outline where the page was slow to come (see above).
    beginNav(note);
    quietEntrance(note);
    carryIn(pathname);
  }, [pathname]);

  useEffect(() => {
    endNav();
  }, [pathname]);

  return (
    <>
      <ViewTransition default="none" update={changing && canMove() ? "route-mark" : "none"}>
        <span aria-hidden data-route-mark={pathname} className="route-mark" />
      </ViewTransition>
      {namedByQuery(pathname) ? (
        <Suspense fallback={null}>
          <QueryRoute pathname={pathname} queryRef={queryRef} />
        </Suspense>
      ) : null}
    </>
  );
}

/**
 * From one page to another of a page addressed by its query (1.9, Updates
 * 62; routeMotion, `pageOf`): the export's page for a piece, from one piece
 * to another (a card in the set or in "You may also like" on a piece's
 * page), or back. The path does not change, so the bridge above hears
 * nothing, and this was a cut, filmed on the export (Updates 46's Open 2;
 * scripts/piece-switch-walk.mjs). It is the bridge's own way, for the query:
 * a mark that asks React for a picture only while the piece is changing, and
 * a layout effect that says how the change moves, carries the card's
 * picture into the new piece's (fault 7's carry), or lets a step back go on.
 * With motion reduced, nothing is pictured, as everywhere.
 *
 * Its first draw is the arrival on the page, which the bridge has dealt
 * with, so it pictures nothing then.
 */
function QueryRoute({ pathname, queryRef }: { pathname: string; queryRef: RefObject<string> }) {
  const search = useSearchParams().toString();
  const page = pageOf(pathname, search);
  const heard = useRef(page);
  const [settled, setSettled] = useState(page);
  const changing = settled !== page;

  useIsoLayoutEffect(() => {
    const from = heard.current;
    heard.current = page;
    queryRef.current = search;
    setSettled(page);
    if (from === page) return;
    openingWritten();
    outlinesForgotten();
    const note = takeNav(from, page);
    if (arrived()) {
      noteWayRoute("traverse");
      quietEntrance("back");
      return;
    }
    noteWayRoute(note);
    if (note === "traverse" || !canMove()) return;
    beginNav(note);
    quietEntrance(note);
    carryIn(pathname);
  }, [page]);

  useEffect(() => {
    endNav();
  }, [page]);

  return (
    <ViewTransition default="none" update={changing && canMove() ? "route-mark" : "none"}>
      <span aria-hidden data-route-mark={page} className="route-mark" />
    </ViewTransition>
  );
}
