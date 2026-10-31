"use client";

// The tour, run on the page (1.8, the owner's note 49 of build 80). Mounted
// by TourHost only while the tour is on (the pop-up, a step, the end card),
// and its script loaded only then, so a reader who never sees it never
// carries it.
//
// What it does, and nothing of how it looks (TourLook.tsx draws that):
//   - The pop-up: the page dimmed and held still, See what's new or Skip.
//   - A step: it goes to the step's page with the app's own client navigation,
//     so the apps' export moves offline. The first move adds one entry to the
//     history and the rest take its place, so Back after the tour leads to
//     where the reader was. It waits for the element, brings it to the
//     reading place (lib/ui/readingPlace.ts) and lights it, following it if
//     it moves. An element that does not come, or goes, is passed over.
//   - The page under a step cannot be scrolled (lockBodyScroll) or tapped
//     (the blockers round the hole), except the lit element on a step that
//     asks for a try.
//   - Escape and Android's back end it, as Skip does. The keyboard stays in
//     the card (Tab), and the arrow keys move between steps.
//   - The end card's Done goes back to where the tour began.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { focusablesIn, nextIndex } from "@/lib/ui/focusTrap";
import { haptic, prefersReducedMotion } from "@/lib/ui/motion";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { canGoBack, highlightSteps, stepCount, tourFor } from "@/lib/whatsNew/tour";
import {
  blockersAround,
  bringIntoPlace,
  captionPlace,
  findTarget,
  inSight,
  measureHole,
  phoneEdges,
  sameHole,
  samePage,
  type Hole,
} from "@/lib/whatsNew/tourDom";
import { dispatchTour, getTourState, startTour, useTour } from "@/lib/whatsNew/tourStore";

import { TourCaption, TourEnd, TourOffer, TourSpotlight, type TourWords } from "./TourLook";

/** How long a step's page may take to come. */
const ROUTE_WAIT_MS = 8000;
/** How long its element may take once a page the tour went to is there: a page that fetches draws it late. */
const ARRIVED_WAIT_MS = 2500;
/** On the page the reader was already on, which has had time to draw. */
const SAME_PAGE_WAIT_MS = 1500;
/** An element drawn on every page (the mini player) is there or it is not. */
const HERE_WAIT_MS = 700;
/** How often the layer looks while it waits. */
const LOOK_EVERY_MS = 100;
/** A lit element gone this long is passed over. */
const GONE_MS = 1000;
/** Second looks after the first move into place, for a page still arriving. */
const SETTLE_LOOKS_MS = [700, 1400] as const;
/** The ring's move to the next element on the same page, as "tour-hole[data-glide]" draws it. */
const GLIDE_MS = 460;
/** The pop-up's way out, as the "tour-fade-out" rule draws it. */
const OFFER_LEAVE_MS = 200;
/** Until a step's card has been measured. */
const CAPTION_GUESS_PX = 196;

/** The hole as last measured, and the page it was measured on. */
type Lit = { hole: Hole; page: string };

export function TourLayer() {
  const state = useTour();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { t } = useTranslate();
  const ids = useId();

  const [lit, setLit] = useState<Lit | null>(null);
  const [glide, setGlide] = useState(false);
  const [card, setCard] = useState<HTMLDivElement | null>(null);
  const [captionHeight, setCaptionHeight] = useState(CAPTION_GUESS_PX);
  const [view, setView] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [edges, setEdges] = useState(phoneEdges);
  const [leaving, setLeaving] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const seeRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const pathnameRef = useRef(pathname);
  const litRef = useRef<Lit | null>(null);
  /** The page the lit step stands on; leaving it ends the tour. */
  const pageRef = useRef<string | null>(null);
  /** Whether the tour has added its one entry to the history. */
  const pushedRef = useRef(false);
  /** What had the keyboard before the tour, given back after. */
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const tour = state.phase === "idle" ? null : tourFor(state.version);

  useLayoutEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // The page holds still for as long as the layer is up, and what had the
  // keyboard has it back afterwards.
  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();
    const onResize = () => {
      setView({ width: window.innerWidth, height: window.innerHeight });
      setEdges(phoneEdges());
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      unlockBodyScroll();
      const back = returnFocusRef.current;
      if (back?.isConnected) back.focus({ preventScroll: true });
    };
  }, []);

  // The pop-up is a modal card like any sheet: the tab bar steps aside under
  // it. A step is not: what it lights may stand at the tab bar's level.
  const offering = state.phase === "offer";
  useEffect(() => {
    if (!offering) return;
    setOverlayOpen(true);
    return () => setOverlayOpen(false);
  }, [offering]);

  // The card's own height decides whether it fits under the hole.
  useEffect(() => {
    if (!card || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(() => setCaptionHeight(card.offsetHeight || CAPTION_GUESS_PX));
    watch.observe(card);
    return () => watch.disconnect();
  }, [card]);

  /** Off to a step's page: one entry in the history, then in its place. */
  const go = useCallback(
    (route: string, origin: string) => {
      if (pushedRef.current && samePage(route, origin)) {
        pushedRef.current = false;
        router.back();
        return;
      }
      if (!pushedRef.current) {
        pushedRef.current = true;
        router.push(route);
        return;
      }
      router.replace(route);
    },
    [router],
  );

  // A step not found yet: go to its page, then look for its element.
  useEffect(() => {
    if (state.phase !== "step" || state.found) return;
    const step = tourFor(state.version)?.steps[state.index];
    const index = state.index;
    if (!step) {
      dispatchTour({ type: "missing", index });
      return;
    }
    pageRef.current = null;
    // Away to another page the ring cannot follow: the page dims meanwhile
    // (the hole belongs to the page it was measured on).
    const away = Boolean(step.route && !samePage(pathnameRef.current, step.route));
    if (away && step.route) go(step.route, state.origin.route);
    const route = step.route;
    const target = step.target;
    const patience = !route ? HERE_WAIT_MS : away ? ARRIVED_WAIT_MS : SAME_PAGE_WAIT_MS;
    let alive = true;
    let timer = 0;
    const began = performance.now();
    let onPageSince: number | null = null;
    const look = () => {
      if (!alive) return;
      const now = performance.now();
      const onPage = !route || samePage(pathnameRef.current, route);
      if (onPage) {
        onPageSince ??= now;
        if (findTarget(target)) {
          pageRef.current = pathnameRef.current;
          dispatchTour({ type: "found", index });
          return;
        }
        if (now - onPageSince > patience) {
          dispatchTour({ type: "missing", index });
          return;
        }
      } else if (now - began > ROUTE_WAIT_MS) {
        dispatchTour({ type: "missing", index });
        return;
      }
      timer = window.setTimeout(look, LOOK_EVERY_MS);
    };
    timer = window.setTimeout(look, 0);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [state, go]);

  // A step found: bring it into place, then follow it for as long as it is lit.
  useEffect(() => {
    if (state.phase !== "step" || !state.found) return;
    const step = tourFor(state.version)?.steps[state.index];
    if (!step) return;
    const index = state.index;
    const target = step.target;
    const page = pageRef.current ?? pathnameRef.current;
    let raf = 0;
    let goneSince: number | null = null;
    const timers: number[] = [];
    const follow = () => {
      const el = findTarget(target);
      if (!el) {
        goneSince ??= performance.now();
        if (performance.now() - goneSince > GONE_MS) {
          dispatchTour({ type: "missing", index });
          return;
        }
      } else {
        goneSince = null;
        const hole = measureHole(el);
        const before = litRef.current;
        if (hole && !(before && before.page === page && sameHole(before.hole, hole))) {
          litRef.current = { hole, page };
          setLit(litRef.current);
        }
      }
      raf = requestAnimationFrame(follow);
    };
    // Two frames, so the page's own scroll to its top (lib/ui/scrollReset.ts)
    // has happened before the move into place.
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        // The ring moves across from the element it lit on this same page;
        // on a new page it comes in on its own.
        const before = litRef.current;
        if (before && samePage(before.page, page)) {
          setGlide(true);
          timers.push(window.setTimeout(() => setGlide(false), GLIDE_MS));
        }
        const el = findTarget(target);
        if (el) bringIntoPlace(el);
        follow();
      });
    });
    for (const ms of SETTLE_LOOKS_MS) {
      timers.push(
        window.setTimeout(() => {
          const el = findTarget(target);
          if (el && !inSight(el)) bringIntoPlace(el, false);
        }, ms),
      );
    }
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [state]);

  // The reader left the lit step's page (a link in a step that asks for a
  // try, the system's back): the tour ends where they went.
  useEffect(() => {
    const s = getTourState();
    const shownHere = (s.phase === "step" && s.found) || s.phase === "end";
    if (!shownHere || !pageRef.current || samePage(pathname, pageRef.current)) return;
    pageRef.current = null;
    pushedRef.current = false;
    dispatchTour({ type: s.phase === "end" ? "finish" : "skip" });
  }, [pathname]);

  const see = useCallback(() => {
    const s = getTourState();
    if (s.phase !== "offer") return;
    haptic("light");
    startTour(s.version, { route: pathnameRef.current, via: "offer" });
  }, []);

  const skipOffer = useCallback(() => {
    if (prefersReducedMotion()) {
      dispatchTour({ type: "skip" });
      return;
    }
    setLeaving(true);
    window.setTimeout(() => dispatchTour({ type: "skip" }), OFFER_LEAVE_MS);
  }, []);

  const finish = useCallback(() => {
    const pushed = pushedRef.current;
    pushedRef.current = false;
    pageRef.current = null;
    dispatchTour({ type: "finish" });
    if (pushed) router.back();
  }, [router]);

  const next = useCallback(() => {
    haptic("light");
    dispatchTour({ type: "next" });
  }, []);

  const back = useCallback(() => {
    haptic("light");
    dispatchTour({ type: "back" });
  }, []);

  const skip = useCallback(() => dispatchTour({ type: "skip" }), []);

  /** Skip, Escape and Android's back: each ends what is showing. */
  const leave = useCallback(() => {
    const s = getTourState();
    if (s.phase === "offer") skipOffer();
    else if (s.phase === "end") finish();
    else if (s.phase === "step") skip();
  }, [skipOffer, finish, skip]);

  useAndroidBack(true, leave);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const s = getTourState();
      if (s.phase === "idle") return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        leave();
        return;
      }
      const dialog = rootRef.current?.querySelector<HTMLElement>('[role="dialog"]');
      if (e.key === "Tab" && dialog) {
        const stops = focusablesIn(dialog);
        const at = nextIndex(stops.length, stops.indexOf(document.activeElement as HTMLElement), e.shiftKey);
        if (at >= 0) {
          e.preventDefault();
          stops[at].focus();
        }
        return;
      }
      if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && s.phase === "step" && s.found) {
        if (!rootRef.current?.contains(document.activeElement)) return;
        const rtl = document.documentElement.dir === "rtl";
        const forward = (e.key === "ArrowRight") !== rtl;
        e.preventDefault();
        if (forward) next();
        else if (canGoBack(s)) back();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [leave, next, back]);

  const steps = tour?.steps ?? [];
  const missing = state.phase === "step" || state.phase === "end" ? state.missing : [];
  const shown = state.phase === "step" ? state.shown : null;
  const shownStep = shown !== null ? steps[shown] : undefined;
  const hole = state.phase === "step" && lit && samePage(pathname, lit.page) ? lit.hole : null;
  const place = captionPlace(hole, captionHeight, view, edges);
  const found = state.phase === "step" && state.found;
  const moving = state.phase === "step" && !state.found;
  const tryIt = found && state.phase === "step" && Boolean(steps[state.index]?.tryIt);

  // The keyboard goes to the way on: See what's new, Next, Done.
  useEffect(() => {
    if (state.phase === "offer") seeRef.current?.focus({ preventScroll: true });
    if (state.phase === "end") doneRef.current?.focus({ preventScroll: true });
  }, [state.phase]);
  useEffect(() => {
    if (!found || !card) return;
    if (!card.contains(document.activeElement)) nextRef.current?.focus({ preventScroll: true });
  }, [found, shown, card]);

  if (!tour) return null;

  const words: TourWords = {
    see: t("tour.offer.see"),
    skip: t("onboard.skip"),
    next: t("common.next"),
    back: t("common.back"),
    done: t("common.done"),
  };
  const count = shown !== null ? stepCount(shown, steps.length, missing) : null;
  const blockers = state.phase === "offer" ? [] : blockersAround(hole, view, tryIt);

  return createPortal(
    <div ref={rootRef} className="tour-root" data-tour-root={state.phase}>
      {state.phase === "offer" ? (
        <TourOffer
          name={t(tour.name)}
          line={t(tour.line)}
          highlights={highlightSteps(tour).map((s) => t(s.title))}
          words={words}
          titleId={`${ids}-offer`}
          leaving={leaving}
          seeRef={seeRef}
          onSee={see}
          onSkip={skipOffer}
        />
      ) : (
        <>
          <TourSpotlight hole={hole} glide={glide} />
          {blockers.map((b) => (
            <div
              key={`${b.top}:${b.left}:${b.width}:${b.height}`}
              aria-hidden
              className="tour-block"
              style={{ top: b.top, left: b.left, width: b.width, height: b.height }}
            />
          ))}
          {state.phase === "step" && shownStep && count ? (
            <TourCaption
              key={place}
              title={t(shownStep.title)}
              body={t(shownStep.body)}
              count={t("home.reviews.position", { index: count.at, total: count.of })}
              progress={count}
              place={place}
              canBack={canGoBack(state)}
              moving={moving}
              words={words}
              stepKey={shownStep.id}
              titleId={`${ids}-title`}
              bodyId={`${ids}-body`}
              nextRef={nextRef}
              cardRef={setCard}
              onNext={next}
              onBack={back}
              onSkip={skip}
            />
          ) : null}
          {state.phase === "end" ? (
            <TourEnd
              title={t("tour.end.title")}
              body={t("tour.end.body")}
              words={words}
              titleId={`${ids}-end`}
              doneRef={doneRef}
              cardRef={setCard}
              onDone={finish}
            />
          ) : null}
        </>
      )}
    </div>,
    document.body,
  );
}
