"use client";

// The tour, run on the page (1.8, the owner's note 49 of build 80; the engine
// mended for his note 51 of build 85: "on the guided update system, it's
// laggy and buggy. And there's certain parts where it doesn't even show").
// Mounted by TourHost only while the tour is on (the title page, a stop, the
// close), and its script loaded only then, so a reader who never sees it
// never carries it.
//
// What it does, and nothing of how it looks (TourLook.tsx draws that, the
// owner's pick B of r3-14, the story of 1.8):
//   - The title page, over the apps' intro when TourHost held it
//     (lib/whatsNew/tourDom.ts, holdIntro): once drawn over the intro's cover
//     it takes it, and the cover goes, unseen under it.
//   - A stop: it goes to the stop's page with the app's own client
//     navigation, so the apps' export moves offline. The first move adds one
//     entry to the history and the rest take its place, so Back after the
//     tour leads to where the reader was.
//   - It watches the page for the stop's element (a MutationObserver, checked
//     at most once a frame and only after the page changed), so the move
//     starts in the frame the element is drawn. It gives up on it only by the
//     rule in tourDom.ts (lookVerdict): a page that has settled without it,
//     or one that never settles.
//   - It plans the stop before anything moves (tourDom.ts, planStop): where
//     the words stand, where the page goes, and what is lit, held to the
//     stage between the bars and clear of the words. Then the light and the
//     page move together, one frame loop on the house curve, the light's box
//     written on the root as CSS variables, so React draws nothing while it
//     moves. With Purify's motion off they are there at once.
//   - While a stop is lit it follows its element by observers (its size, the
//     page's size, a scroll, an animation ending), never by measuring every
//     frame. An element that goes is passed over.
//   - On the website the next stop's page is fetched while the reader reads
//     this one (router.prefetch), so Next does not wait for it. Not in the
//     apps: their export does not carry the per-part files a prefetch asks
//     for (scripts/native-build.mjs leaves them out), and a prefetch that
//     found none held the next page back by about 30 s on the export.
//   - The page under a stop cannot be scrolled (lockBodyScroll) or tapped
//     (the blockers round the lit box), except the lit element on a stop that
//     asks for a try.
//   - Escape and Android's back end it, as Skip does. The keyboard stays in
//     the words (Tab), and the arrow keys move between stops.
//   - The close's Done goes back to where the tour began.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { isNativeClient } from "@/lib/platform/native";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { focusablesIn, nextIndex } from "@/lib/ui/focusTrap";
import { haptic, prefersReducedMotion } from "@/lib/ui/motion";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { canGoBack, highlightSteps, stepAfter, stepCount, tourFor } from "@/lib/whatsNew/tour";
import {
  GLIDE_MS,
  REPLAN_PX,
  bandFor,
  boxOf,
  closedAt,
  findTarget,
  houseEase,
  introHeld,
  isPinned,
  litBox,
  lookVerdict,
  maxScroll,
  mixBox,
  mixNumber,
  pageArriving,
  phoneEdges,
  planStop,
  releaseIntro,
  sameBox,
  samePage,
  tapBlockers,
  takeIntro,
  type Box,
  type FootPlace,
  type Stage,
} from "@/lib/whatsNew/tourDom";
import { dispatchTour, getTourState, startTour, useTour } from "@/lib/whatsNew/tourStore";

import { TourClose, TourHush, TourStoryFoot, TourTitlePage, type NightEntrance, type TourWords } from "./TourLook";

/** The night lifting away, as the intro's does (app/globals.css, tour-lift). */
const LIFT_MS = 600;
/** The quiet and the words going at Skip. */
const EXIT_MS = 240;
/** The light going out where it stood, once its page has gone. */
const OUT_MS = 200;
/** A lit element gone this long is passed over. */
const GONE_MS = 1000;
/** Second plans for one stop at most, for a page that moves under it. */
const REPLANS = 3;
/** Until the story's foot has been measured. */
const FOOT_GUESS_PX = 300;
/**
 * The room after a page's end while the tour runs: half the screen, more than
 * the story's foot takes in any language, so it is given once and not again
 * for each stop. Giving it lays the whole page out anew: given at See what's
 * new, the first frame after the tap took 1.1 s on Today on the export slowed
 * four times, and 0.34 s with it given before. So on the title page it is
 * given under the night, ROOM_AFTER_MS in, where nothing moves.
 */
const ROOM_SHARE = 0.5;
const ROOM_AFTER_MS = 1500;
/** The intro's cross, from the document when the apps carry it, or the same picture from the bundle. */
const CROSS_FILE = "/purify-cross-mark.png";

const EMPTY: Box = { top: 0, left: 0, width: 0, height: 0 };

type Light = { box: Box; open: number };

export function TourLayer() {
  const state = useTour();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { t } = useTranslate();
  const ids = useId();

  const [place, setPlace] = useState<FootPlace>("bottom");
  const [titleLeaving, setTitleLeaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [exiting, setExiting] = useState(false);
  // How the title page comes: over the intro TourHost held, or on its own.
  const [entrance] = useState<NightEntrance>(() => (introHeld() ? "intro" : "own"));
  const [crossSrc] = useState(() => document.querySelector<HTMLImageElement>(".launch-cross")?.src || CROSS_FILE);

  const rootRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const seeRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const pathnameRef = useRef(pathname);
  /** The light as last written on the root. */
  const lightRef = useRef<Light>({ box: EMPTY, open: 0 });
  /** The frame loop moving the light and the page, while one runs. */
  const glideRef = useRef(0);
  /** The page the lit stop stands on; leaving it ends the tour. */
  const pageRef = useRef<string | null>(null);
  /** Whether the tour has added its one entry to the history. */
  const pushedRef = useRef(false);
  /** What had the keyboard before the tour, given back after. */
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const placeRef = useRef<FootPlace>("bottom");
  /** The room given after the page's end, in px, or null. */
  const roomRef = useRef<number | null>(null);
  /** Whether a stop has been lit yet: the first light comes up in place. */
  const litOnceRef = useRef(false);

  const tour = state.phase === "idle" ? null : tourFor(state.version);

  useLayoutEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // ---------------------------------------------------------------------------
  // The light: written on the root, never through React.

  const writeLight = useCallback((light: Light) => {
    lightRef.current = light;
    const root = rootRef.current;
    if (!root) return;
    const { box, open } = light;
    root.style.setProperty("--tour-x", `${box.left.toFixed(1)}px`);
    root.style.setProperty("--tour-y", `${box.top.toFixed(1)}px`);
    root.style.setProperty("--tour-w", `${box.width.toFixed(1)}px`);
    root.style.setProperty("--tour-h", `${box.height.toFixed(1)}px`);
    root.style.setProperty("--tour-open", open.toFixed(3));
  }, []);

  const stopGlide = useCallback(() => {
    if (glideRef.current) cancelAnimationFrame(glideRef.current);
    glideRef.current = 0;
  }, []);

  /**
   * The light to `to`, and the page to `scrollTo` under it, together on the
   * house curve: one loop, the light's box written each frame. With motion
   * off, both at once. Each frame's scroll is the page's own "auto", which
   * the root keeps instant (app/globals.css, html scroll-behavior), so the
   * page goes exactly where the light is going.
   */
  const glide = useCallback(
    (to: Light, scrollTo: number | null, ms: number, done?: () => void) => {
      stopGlide();
      const from = lightRef.current;
      const y0 = window.scrollY;
      const y1 = scrollTo ?? y0;
      const still = Math.abs(y1 - y0) < 0.5;
      if (ms <= 0 || prefersReducedMotion()) {
        if (!still) window.scrollTo({ top: y1, behavior: "auto" });
        writeLight(to);
        done?.();
        return;
      }
      const start = performance.now();
      const frame = (now: number) => {
        const u = Math.min(1, (now - start) / ms);
        const e = houseEase(u);
        if (!still) window.scrollTo({ top: mixNumber(y0, y1, e), behavior: "auto" });
        writeLight({ box: mixBox(from.box, to.box, e), open: mixNumber(from.open, to.open, e) });
        if (u < 1) {
          glideRef.current = requestAnimationFrame(frame);
        } else {
          glideRef.current = 0;
          done?.();
        }
      };
      glideRef.current = requestAnimationFrame(frame);
    },
    [stopGlide, writeLight],
  );

  /** The story's foot as it stands: its height, which the plan keeps the light clear of. */
  const footHeight = useCallback(() => footRef.current?.offsetHeight || FOOT_GUESS_PX, []);

  /** Room after the page's end while the tour runs (app/globals.css, html[data-tour-room]); null takes it away. */
  const giveRoom = useCallback((px: number | null) => {
    const html = document.documentElement;
    roomRef.current = px;
    if (px === null) {
      html.removeAttribute("data-tour-room");
      html.style.removeProperty("--tour-room");
      return;
    }
    html.style.setProperty("--tour-room", `${Math.round(px)}px`);
    html.setAttribute("data-tour-room", "");
  }, []);

  /** The room, at least `atLeast` (the foot as measured): given once, and only ever raised. */
  const ensureRoom = useCallback(
    (atLeast = 0) => {
      const want = Math.ceil(Math.max(window.innerHeight * ROOM_SHARE, atLeast));
      if (roomRef.current !== null && roomRef.current >= want) return;
      giveRoom(want);
    },
    [giveRoom],
  );

  // ---------------------------------------------------------------------------
  // The page holds still for as long as the layer is up, and what had the
  // keyboard has it back afterwards.

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();
    const onResize = () => {
      if (roomRef.current !== null) ensureRoom();
      window.dispatchEvent(new Event("tour:replan"));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      unlockBodyScroll();
      stopGlide();
      giveRoom(null);
      releaseIntro();
      const back = returnFocusRef.current;
      if (back?.isConnected) back.focus({ preventScroll: true });
    };
  }, [stopGlide, giveRoom, ensureRoom]);

  // The title page is a modal page like any sheet: the tab bar steps aside
  // under it. A stop is not: what it lights may stand at the tab bar's level.
  const offering = state.phase === "offer";
  useEffect(() => {
    if (!offering) return;
    setOverlayOpen(true);
    return () => setOverlayOpen(false);
  }, [offering]);

  // The room after the page's end, given under the title page once its
  // entrance has settled.
  useEffect(() => {
    if (!offering) return;
    const timer = window.setTimeout(() => ensureRoom(), ROOM_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [offering, ensureRoom]);

  // Over the intro: once the title page has been drawn over the cover, the
  // cover may go, at once and unseen.
  useEffect(() => {
    if (!offering || entrance !== "intro") return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => takeIntro());
    });
    return () => cancelAnimationFrame(raf);
  }, [offering, entrance]);

  /** Off to a stop's page: one entry in the history, then in its place. */
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

  // ---------------------------------------------------------------------------
  // A stop not found yet: go to its page, and watch for its element.

  useEffect(() => {
    if (state.phase !== "step" || state.found) return;
    const steps = tourFor(state.version)?.steps ?? [];
    const step = steps[state.index];
    const index = state.index;
    if (!step) {
      dispatchTour({ type: "missing", index });
      return;
    }
    pageRef.current = null;
    ensureRoom();
    const away = Boolean(step.route && !samePage(pathnameRef.current, step.route));
    if (away && step.route) go(step.route, state.origin.route);

    const root = rootRef.current;
    const began = performance.now();
    let arrivedAt: number | null = away ? null : began;
    let changedAt = began;
    let frames = 0;
    let dirty = true;
    let alive = true;
    let raf = 0;
    let wentOut = false;

    const watch = new MutationObserver((records) => {
      for (const r of records) {
        if (root && root.contains(r.target)) continue;
        changedAt = performance.now();
        frames = 0;
        dirty = true;
        return;
      }
    });
    watch.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-tour", "class", "hidden", "style", "data-skeleton"],
    });

    const frame = () => {
      if (!alive) return;
      frames += 1;
      const now = performance.now();
      const onPage = !step.route || samePage(pathnameRef.current, step.route);
      if (onPage && arrivedAt === null) {
        arrivedAt = now;
        changedAt = now;
        frames = 0;
        dirty = true;
      }
      if (onPage && dirty) {
        dirty = false;
        if (findTarget(step.target)) {
          pageRef.current = pathnameRef.current;
          dispatchTour({ type: "found", index });
          return;
        }
        // Its page has come and the element is not on it yet: the light goes
        // out where it stood, over a page it does not belong to.
        if (away && !wentOut && lightRef.current.open > 0) {
          wentOut = true;
          glide({ box: closedAt(lightRef.current.box), open: 0 }, null, OUT_MS);
        }
      }
      const looking = {
        onPage,
        sinceStart: now - began,
        sinceArrived: arrivedAt === null ? null : now - arrivedAt,
        sinceChange: now - changedAt,
        framesSinceChange: frames,
        arriving: false,
      };
      let verdict = lookVerdict(looking);
      if (verdict === "missing" && onPage) verdict = lookVerdict({ ...looking, arriving: pageArriving() });
      if (verdict === "missing") {
        dispatchTour({ type: "missing", index });
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      watch.disconnect();
    };
  }, [state, go, glide, ensureRoom]);

  // ---------------------------------------------------------------------------
  // A stop found: plan it, move the light and the page together, then follow
  // the element for as long as it is lit.

  useEffect(() => {
    if (state.phase !== "step" || !state.found) return;
    const steps = tourFor(state.version)?.steps ?? [];
    const step = steps[state.index];
    if (!step) return;
    const index = state.index;
    const target = step.target;
    let alive = true;
    let replans = 0;
    let stage: Stage | null = null;
    let goneSince: number | null = null;
    let queued = 0;
    let settled = false;

    const planNow = (first: boolean) => {
      const el = findTarget(target);
      if (!el) return false;
      const height = footHeight();
      ensureRoom(height);
      const plan = planStop({
        box: boxOf(el),
        pinned: isPinned(el),
        view: { width: window.innerWidth, height: window.innerHeight },
        band: bandFor(el),
        insets: phoneEdges(),
        foot: { height },
        scrollY: window.scrollY,
        maxScrollY: maxScroll(),
      });
      stage = plan.stage;
      if (plan.place !== placeRef.current) {
        placeRef.current = plan.place;
        setPlace(plan.place);
      }
      const to: Light = plan.lit ? { box: plan.lit, open: 1 } : { box: closedAt(boxOf(el)), open: 0 };
      // The first light of the tour comes up where it shines; after that it
      // moves across from where the stop before left it.
      if (first && !litOnceRef.current && plan.lit) writeLight({ box: closedAt(plan.lit), open: 0 });
      if (plan.lit) litOnceRef.current = true;
      settled = false;
      glide(to, plan.scrollTo, GLIDE_MS, () => {
        settled = true;
        queue();
      });
      return true;
    };

    /** After the page moved under the lit element: follow it, or plan again when it moved far. */
    const follow = () => {
      queued = 0;
      if (!alive || !settled) return;
      const el = findTarget(target);
      if (!el) {
        goneSince ??= performance.now();
        if (performance.now() - goneSince > GONE_MS) {
          dispatchTour({ type: "missing", index });
          return;
        }
        window.setTimeout(queue, 250);
        return;
      }
      goneSince = null;
      const lit = stage ? litBox(boxOf(el), stage) : null;
      const now = lightRef.current;
      if (sameBox(lit, now.open > 0 ? now.box : null)) return;
      const far =
        !lit ||
        Math.abs(lit.top - now.box.top) > REPLAN_PX ||
        Math.abs(lit.height - now.box.height) > REPLAN_PX ||
        Math.abs(lit.left - now.box.left) > REPLAN_PX;
      if (far && replans < REPLANS) {
        replans += 1;
        planNow(false);
        return;
      }
      if (lit) writeLight({ box: lit, open: 1 });
    };
    const queue = () => {
      if (!queued) queued = requestAnimationFrame(follow);
    };

    if (!planNow(true)) {
      dispatchTour({ type: "missing", index });
      return;
    }

    // The next stop's page, fetched while this one is read: on the website
    // only (see the head of this file).
    const nextIndex = stepAfter(index, 1, steps.length, state.missing);
    const nextRoute = nextIndex !== null ? steps[nextIndex].route : null;
    if (nextRoute && !samePage(pathnameRef.current, nextRoute) && !isNativeClient()) router.prefetch(nextRoute);

    const root = rootRef.current;
    const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(queue);
    const el = findTarget(target);
    if (sizes && el) {
      sizes.observe(el);
      sizes.observe(document.body);
    }
    const watch = new MutationObserver((records) => {
      for (const r of records) {
        if (root && root.contains(r.target)) continue;
        queue();
        return;
      }
    });
    watch.observe(document.body, { childList: true, subtree: true });
    const onReplan = () => {
      replans = 0;
      if (settled) planNow(false);
    };
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("tour:replan", onReplan);
    document.addEventListener("animationend", queue, true);
    document.addEventListener("transitionend", queue, true);
    return () => {
      alive = false;
      cancelAnimationFrame(queued);
      sizes?.disconnect();
      watch.disconnect();
      window.removeEventListener("scroll", queue);
      window.removeEventListener("tour:replan", onReplan);
      document.removeEventListener("animationend", queue, true);
      document.removeEventListener("transitionend", queue, true);
    };
  }, [state, router, glide, writeLight, ensureRoom, footHeight]);

  // The reader left the lit stop's page (a link in a stop that asks for a
  // try, the system's back): the tour ends where they went.
  useEffect(() => {
    const s = getTourState();
    const shownHere = (s.phase === "step" && s.found) || s.phase === "end";
    if (!shownHere || !pageRef.current || samePage(pathname, pageRef.current)) return;
    pageRef.current = null;
    pushedRef.current = false;
    dispatchTour({ type: s.phase === "end" ? "finish" : "skip" });
  }, [pathname]);

  // The close: the room after the page's end goes once the night is over it.
  useEffect(() => {
    if (state.phase !== "end") return;
    const timer = window.setTimeout(() => giveRoom(null), prefersReducedMotion() ? 0 : 340);
    return () => window.clearTimeout(timer);
  }, [state.phase, giveRoom]);

  // ---------------------------------------------------------------------------
  // The reader's moves.

  const see = useCallback(() => {
    const s = getTourState();
    if (s.phase !== "offer") return;
    haptic("light");
    if (!prefersReducedMotion()) {
      setTitleLeaving(true);
      window.setTimeout(() => setTitleLeaving(false), LIFT_MS);
    }
    startTour(s.version, { route: pathnameRef.current, via: "offer" });
  }, []);

  /** Skip on the title page: the night lifts away onto the page. */
  const skipOffer = useCallback(() => {
    if (prefersReducedMotion()) {
      dispatchTour({ type: "skip" });
      return;
    }
    setTitleLeaving(true);
    window.setTimeout(() => dispatchTour({ type: "skip" }), LIFT_MS);
  }, []);

  /** Skip on a page of the story: the quiet and the words go together. */
  const skip = useCallback(() => {
    if (prefersReducedMotion()) {
      dispatchTour({ type: "skip" });
      return;
    }
    setExiting(true);
    window.setTimeout(() => dispatchTour({ type: "skip" }), EXIT_MS);
  }, []);

  /** Done: back to where the tour began, under the night, and the night lifts away onto it. */
  const finish = useCallback(() => {
    const pushed = pushedRef.current;
    pushedRef.current = false;
    pageRef.current = null;
    if (pushed) router.back();
    if (prefersReducedMotion()) {
      dispatchTour({ type: "finish" });
      return;
    }
    setClosing(true);
    window.setTimeout(() => dispatchTour({ type: "finish" }), LIFT_MS);
  }, [router]);

  const next = useCallback(() => {
    haptic("light");
    dispatchTour({ type: "next" });
  }, []);

  const back = useCallback(() => {
    haptic("light");
    dispatchTour({ type: "back" });
  }, []);

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
  const found = state.phase === "step" && state.found;
  const moving = state.phase === "step" && !state.found;
  const tryIt = found && state.phase === "step" && Boolean(steps[state.index]?.tryIt);

  // The keyboard goes to the way on: See what's new, Next, Done.
  useEffect(() => {
    if (state.phase === "offer") seeRef.current?.focus({ preventScroll: true });
    if (state.phase === "end") doneRef.current?.focus({ preventScroll: true });
  }, [state.phase]);
  useEffect(() => {
    if (!found) return;
    const foot = footRef.current;
    if (foot && !foot.contains(document.activeElement)) nextRef.current?.focus({ preventScroll: true });
  }, [found, shown]);

  if (!tour) return null;

  const words: TourWords = {
    see: t("tour.offer.see"),
    skip: t("onboard.skip"),
    next: t("common.next"),
    back: t("common.back"),
    done: t("common.done"),
  };
  const count = shown !== null ? stepCount(shown, steps.length, missing) : null;
  const stepping = state.phase === "step";
  const blockers = state.phase === "offer" ? [] : tapBlockers(tryIt);

  return createPortal(
    <div
      ref={rootRef}
      className="tour-root"
      data-tour-root={state.phase}
      data-tour-stop={found && shownStep ? shownStep.id : undefined}
      data-tour-moving={moving ? "" : undefined}
      data-exiting={exiting ? "" : undefined}
    >
      {/* Drawn from the title page on, so the quiet comes in under it at See what's new. */}
      <TourHush shown={stepping || (state.phase === "end" && !closing)} />
      {stepping || state.phase === "end"
        ? blockers.map((b) => <div key={b.name} aria-hidden className="tour-block" style={b.style as CSSProperties} />)
        : null}
      {stepping && shownStep && count ? (
        <TourStoryFoot
          title={t(shownStep.title)}
          story={t(shownStep.body)}
          count={t("home.reviews.position", { index: count.at, total: count.of })}
          progress={count}
          place={place}
          canBack={canGoBack(state)}
          moving={moving}
          words={words}
          stepKey={shownStep.id}
          titleId={`${ids}-title`}
          storyId={`${ids}-story`}
          nextRef={nextRef}
          footRef={footRef}
          onNext={next}
          onBack={back}
          onSkip={skip}
        />
      ) : null}
      {state.phase === "offer" || titleLeaving ? (
        <TourTitlePage
          brand={t(tour.name).replace(tour.version, "").trim() || "Purify"}
          version={tour.version}
          line={t(tour.line)}
          highlights={highlightSteps(tour).map((s) => t(s.title))}
          words={words}
          titleId={`${ids}-offer`}
          entrance={entrance}
          crossSrc={crossSrc}
          leaving={titleLeaving}
          seeRef={seeRef}
          onSee={see}
          onSkip={skipOffer}
        />
      ) : null}
      {state.phase === "end" ? (
        <TourClose
          title={t("tour.close.title", { version: tour.version })}
          line={t("tour.close.body")}
          signature={t("whatsnew.fromTheTeam")}
          words={words}
          titleId={`${ids}-end`}
          crossSrc={crossSrc}
          leaving={closing}
          doneRef={doneRef}
          onDone={finish}
        />
      ) : null}
    </div>,
    document.body,
  );
}
