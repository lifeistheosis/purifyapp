"use client";

// Offers a release's tour on the first open of a new version (1.8, the
// owner's note 49 of build 80), and mounts the layer that runs it while it is
// on. Mounted once in components/layout/RootFrame.tsx: the app opens on Today,
// outside the (app) group, and Today is where the pop-up is shown.
//
// Who is offered it, and what the device keeps, is lib/whatsNew/tourState.ts.
// Here is when: once per app open, decided as the app comes up, and shown on
// the home screen (Today in the apps; the front page on a computer; the
// Windows app's home) once nothing else is on it: not under the apps' opening
// cover, not over the onboarding, a sheet, or the store's "a new version is
// available" (they share one update screen per open), and not while a screen
// is still changing. Never on the mobile website, whose front page is there to
// send people to the app (components/onboarding/FirstRunGate.tsx says the
// same of the onboarding). Take the tour on What's New starts it anywhere.
//
// Renders nothing until the tour is on, and the layer's script is loaded only
// then.

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { isDesktopApp } from "@/lib/desktop/bridge";
import { DESKTOP_HOME } from "@/lib/desktop/homeRedirect";
import { isOnboarded, onboardedBefore, readResumeStage } from "@/lib/onboarding/state";
import { isTesting } from "@/lib/onboarding/testing";
import { mobileStore } from "@/lib/platform/mobileWeb";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { isOverlayOpen } from "@/lib/ui/overlay";
import { isRouteExiting } from "@/lib/ui/routeTransition";
import { getSeenSnapshot } from "@/lib/whatsNew/seenStore";
import { tourFor } from "@/lib/whatsNew/tour";
import { launchCoverUp } from "@/lib/whatsNew/tourDom";
import { claimUpdateScreen, decideOffer, marksKept, readTourMark, writeTourMark } from "@/lib/whatsNew/tourState";
import { offerTour, useTour } from "@/lib/whatsNew/tourStore";
import { CURRENT_VERSION, whatsNewUnseen } from "@/lib/whatsNew/version";

const TourLayer = dynamic(() => import("./TourLayer").then((m) => m.TourLayer), { ssr: false });

/** After the home screen comes up, before the pop-up: Today's own entrance first. */
const SETTLE_MS = 1200;
/** How often to look again while something else is on screen. */
const RETRY_MS = 600;
/** How long to keep looking on one visit to the home screen. */
const PATIENCE_MS = 15_000;

/** Decided once per app open: module scope, as UpdateBridge's own check is. */
let decided = false;
/** This open offers the tour, once the reader is on the home screen. */
let pending = false;
/** purify:whatsNewSeen as this open found it. */
let seenAtOpen: string | null = null;

function decide(): ReturnType<typeof decideOffer> {
  const tour = tourFor(CURRENT_VERSION);
  return decideOffer({
    hasTour: tour !== null,
    mark: tour ? readTourMark(tour.version) : null,
    seenVersion: getSeenSnapshot(),
    current: CURRENT_VERSION,
    signedIn: readLocalSessionUser() !== null,
    onboardedBefore: onboardedBefore(),
    onboarded: isOnboarded(),
    midOnboarding: readResumeStage() !== null,
    testing: isTesting(),
    storage: marksKept(),
  });
}

function isHome(pathname: string): boolean {
  return pathname === "/" || (pathname === DESKTOP_HOME && isDesktopApp());
}

/** Something else is on the screen, or the screen is still arriving. */
function busy(): boolean {
  return (
    isOverlayOpen() ||
    launchCoverUp() ||
    isRouteExiting() ||
    document.visibilityState === "hidden" ||
    !isOnboarded() ||
    readResumeStage() !== null
  );
}

export function TourHost() {
  const pathname = usePathname() ?? "/";
  const state = useTour();

  // Once per open: a new install is marked so it is never offered this
  // release; an updater waits for the home screen.
  useEffect(() => {
    if (decided) return;
    decided = true;
    const tour = tourFor(CURRENT_VERSION);
    if (!tour) return;
    seenAtOpen = getSeenSnapshot();
    const decision = decide();
    if (decision === "new") writeTourMark(tour.version, "new");
    if (decision === "offer") pending = true;
  }, []);

  useEffect(() => {
    if (!pending || !isHome(pathname) || mobileStore() !== null) return;
    const began = Date.now();
    let timer = 0;
    const attempt = () => {
      if (!pending) return;
      const tour = tourFor(CURRENT_VERSION);
      // Still to be offered: nothing has marked it since the open decided.
      if (!tour || decide() !== "offer") {
        pending = false;
        return;
      }
      // The reader has opened this release's notes on this open (the bell,
      // What's New): that was the update's screen, and the pop-up would be a
      // second. Take the tour stays on What's New.
      if (whatsNewUnseen(seenAtOpen) && !whatsNewUnseen(getSeenSnapshot())) {
        pending = false;
        writeTourMark(tour.version, "seen");
        return;
      }
      if (busy()) {
        if (Date.now() - began < PATIENCE_MS) timer = window.setTimeout(attempt, RETRY_MS);
        return;
      }
      pending = false;
      if (!claimUpdateScreen("tour")) return;
      offerTour(CURRENT_VERSION);
    };
    timer = window.setTimeout(attempt, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (state.phase === "idle") return null;
  return <TourLayer />;
}
