"use client";

// Offers a release's tour on the first open of a new version (1.8, the
// owner's note 49 of build 80), and mounts the layer that runs it while it is
// on. Mounted once in components/layout/RootFrame.tsx: the app opens on Today,
// outside the (app) group, and Today is where the title page is shown.
//
// Who is offered it, and what the device keeps, is lib/whatsNew/tourState.ts.
// Here is when: once per app open, decided as the app comes up, and shown on
// the home screen (Today in the apps; the front page on a computer; the
// Windows app's home) once nothing else is on it: not over the onboarding, a
// sheet, or the store's "a new version is available" (they share one update
// screen per open), and not while a screen is still changing. Never on the
// mobile website, whose front page is there to send people to the app
// (components/onboarding/FirstRunGate.tsx says the same of the onboarding).
// Take the tour on What's New starts it anywhere.
//
// THE INTRO HOLDS (the owner's pick B of r3-14, "the story of 1.8": "the
// intro the reader has just watched does not lift away: the cross stays on
// the night with the horizon under it, and the release writes itself in
// beneath them"). On an open that will offer the tour, in the apps, on the
// home screen, with the intro still up, the intro is held
// (lib/whatsNew/tourDom.ts, holdIntro) and the layer's script fetched at once.
// The moment the intro has played and the app is ready, the title page is
// offered over it; once drawn, the layer takes the intro and its cover goes,
// unseen. If anything else stands in the way then, or the title page does not
// come within HOLD_MAX_MS, the intro lifts as it always does and the title
// page waits for its usual moment, arriving as its own entrance, as it does
// on the website.
//
// Renders nothing until the tour is on, and the layer's script is loaded only
// then, or on the open whose intro it continues.

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

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
import { holdIntro, introHeld, launchCoverUp, releaseIntro } from "@/lib/whatsNew/tourDom";
import { claimUpdateScreen, decideOffer, marksKept, readTourMark, writeTourMark } from "@/lib/whatsNew/tourState";
import { offerTour, useTour } from "@/lib/whatsNew/tourStore";
import { CURRENT_VERSION, whatsNewUnseen } from "@/lib/whatsNew/version";

// On the server there is no layout to read and useLayoutEffect only warns
// (as components/nav/ScrollResetBridge.tsx does).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const loadLayer = () => import("./TourLayer").then((m) => m.TourLayer);
const TourLayer = dynamic(loadLayer, { ssr: false });

/** After the home screen comes up, before the title page: Today's own entrance first. */
const SETTLE_MS = 1200;
/** How often to look again while something else is on screen. */
const RETRY_MS = 600;
/** How long to keep looking on one visit to the home screen. */
const PATIENCE_MS = 15_000;
/** The intro, held for the title page, holds no longer than this once it has played. */
const HOLD_MAX_MS = 4000;

/** Decided once per app open: module scope, as UpdateBridge's own check is. */
let decided = false;
/** This open offers the tour, once the reader is on the home screen. */
let pending = false;
/** The intro is held for the title page on this open. */
let holding = false;
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

/** Something other than the intro is on the screen, or the screen is still arriving. */
function busyBesidesIntro(): boolean {
  return (
    isOverlayOpen() ||
    isRouteExiting() ||
    document.visibilityState === "hidden" ||
    !isOnboarded() ||
    readResumeStage() !== null
  );
}

/** Something else is on the screen, or the screen is still arriving. */
function busy(): boolean {
  return busyBesidesIntro() || launchCoverUp();
}

/** The intro lifts as it always does; the title page waits for its usual moment. */
function letIntroGo(): void {
  holding = false;
  if (introHeld()) releaseIntro();
}

export function TourHost() {
  const pathname = usePathname() ?? "/";
  const state = useTour();

  // Once per open: a new install is marked so it is never offered this
  // release; an updater waits for the home screen, where the intro, if it is
  // still up, holds for the title page. A layout effect, so the hold is on
  // before the app can say it is ready and the intro begins to lift.
  useIsoLayoutEffect(() => {
    if (decided) return;
    decided = true;
    const tour = tourFor(CURRENT_VERSION);
    if (!tour) return;
    seenAtOpen = getSeenSnapshot();
    const decision = decide();
    if (decision === "new") writeTourMark(tour.version, "new");
    if (decision !== "offer") return;
    pending = true;
    if (isHome(pathname) && mobileStore() === null && launchCoverUp()) {
      holding = true;
      holdIntro();
      void loadLayer();
    }
    // Once per open, with the pathname the app opened on.
  }, []);

  // The intro held: offer the moment it has played and the app is ready.
  useEffect(() => {
    if (!holding) return;
    let watchdog = 0;
    let done = false;
    const attempt = () => {
      // Offered already, or given up on: nothing more to do here.
      if (done || !holding || !pending) return;
      if (launchCoverUp()) return;
      done = true;
      watch.disconnect();
      // Something else on the screen: the intro lifts, and the title page
      // waits for its usual moment.
      if (busyBesidesIntro()) {
        letIntroGo();
        return;
      }
      const tour = tourFor(CURRENT_VERSION);
      if (!tour || decide() !== "offer" || !claimUpdateScreen("tour")) {
        pending = false;
        letIntroGo();
        return;
      }
      pending = false;
      offerTour(CURRENT_VERSION);
      // The title page takes the intro once it is drawn over it; if it is not
      // drawn in time, the intro lifts, and the title page comes on its own.
      watchdog = window.setTimeout(letIntroGo, HOLD_MAX_MS);
    };
    const watch = new MutationObserver(attempt);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-launch", "data-intro"] });
    attempt();
    return () => {
      watch.disconnect();
      window.clearTimeout(watchdog);
    };
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
        letIntroGo();
        return;
      }
      // The reader has opened this release's notes on this open (the bell,
      // What's New): that was the update's screen, and the title page would
      // be a second. Take the tour stays on What's New.
      if (whatsNewUnseen(seenAtOpen) && !whatsNewUnseen(getSeenSnapshot())) {
        pending = false;
        letIntroGo();
        writeTourMark(tour.version, "seen");
        return;
      }
      if (holding || busy()) {
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
