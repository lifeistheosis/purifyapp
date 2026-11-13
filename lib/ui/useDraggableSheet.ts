"use client";

// A bottom sheet that follows the finger.
//
// WHY THIS EXISTS. The owner, 2026-09-29, on the reader's commentary sheet:
// "these cards are clunky and not movable (make it movable). also the
// background doesn't gradually blur it just pops up". The old sheet could be
// dragged only by a 16px strip around its handle, only downwards, and its
// backdrop blur arrived all at once.
//
// What this gives a sheet:
//   - Two resting heights when its content is long: it opens to `half` of the
//     screen, and pulling up takes it to its full height. Short content has a
//     single resting height, its own.
//   - The whole header drags, in both directions, with resistance above the
//     top. The body drags too: pulling down when it is scrolled to the top,
//     and pulling up while the sheet rests at half (so the first swipe opens
//     it rather than scrolling text hidden below the edge of the screen).
//   - Release settles by position and speed: a flick down closes it, a flick
//     up opens it fully.
//   - The scrim dims and blurs in step with the sheet: gradually on open and
//     close, and continuously while the finger moves. The blur itself is set
//     once at full strength and faded in with the scrim's opacity: animating
//     a blur RADIUS makes the browser recompute the blurred page on every
//     frame, which was most of what stuttered when a card opened on a phone.
//     A fixed blur behind a fading layer reads the same and costs one blur.
//
// Everything per frame is written straight to the DOM through refs, not
// through React state, so a drag re-renders nothing.
//
// Motion. Under the data-motion switch (lib/ui/motion.ts) nothing slides: the
// sheet and scrim dissolve in 160ms instead. A dissolve moves nothing, which
// is the usual reduced-motion substitute; a drag still follows the finger,
// because that is the reader's own hand and not an animation.
//
// No requestAnimationFrame to start a transition: reading offsetHeight forces
// the style flush instead, which works where rAF never fires (lib/ui/flip.ts
// explains the failure).

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { sheetLeaves, sheetRises } from "@/lib/ui/overlay";

type Snap = "full" | "half";

/** Timings, in ms. Opening is a large surface arriving (--duration-slow is
 *  480); closing gets out of the way faster. */
const OPEN_MS = 440;
const CLOSE_MS = 300;
const SNAP_MS = 380;
const DISSOLVE_MS = 160;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"; // --ease-house
const EASE_OUT = "cubic-bezier(0.4, 0, 1, 1)";

/** The scrim at rest: how dark, and how blurred. */
const SCRIM_BLUR_PX = 10;

/** How far the scrim reaches under a bottom sheet's top edge, past its
 *  rounded corners (rounded-t-3xl is 24px), so they still show it. */
const CORNER_PX = 32;

/** A half rest only exists when it would hide at least this much. */
const MIN_HALF_GAIN = 64;

/** Movement before the body hands a gesture to the sheet. */
const SLOP_PX = 6;

/** A release faster than this (px per ms) is a flick: the sheet leaves at the
 *  finger's own speed rather than starting again from a stop. */
const FLICK_PX_MS = 0.5;
/** A flicked sheet leaves in this long at least (a very fast flick) and at
 *  most CLOSE_MS. */
const THROW_MIN_MS = 120;
/** A thrown sheet starts one frame along its way. A transition's first frame
 *  is where it starts from, so a flick let go stood still for that frame under
 *  the lifted finger; begun a frame in, it carries on in the very next one. */
const THROW_HEAD_START_MS = 16;

/**
 * How long a sheet let go at `v` px per ms (down) takes to travel `distance`
 * px off the screen at that speed, or null for a release that is no flick,
 * which closes on the ordinary curve from a stop.
 */
export function throwMs(distance: number, v: number): number | null {
  if (!(v > FLICK_PX_MS) || !(distance > 0)) return null;
  return Math.round(Math.min(CLOSE_MS, Math.max(THROW_MIN_MS, distance / v)));
}

export type DraggableSheet = {
  /** Keep rendering until the close animation has finished. */
  mounted: boolean;
  panelRef: React.RefObject<HTMLDivElement | null>;
  scrimRef: React.RefObject<HTMLButtonElement | null>;
  bodyRef: React.RefObject<HTMLDivElement | null>;
  /** Spread on the handle and header: they drag in both directions. */
  grab: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
  /** Rise to full height, if the sheet is resting at half. */
  expand: () => void;
};

export function useDraggableSheet({
  open,
  onClose,
  reduced,
  half = 0.6,
  locked = false,
  smoothHeight = false,
}: {
  open: boolean;
  onClose: () => void;
  reduced: boolean;
  /** Share of the viewport a long sheet opens to. 1 opens every sheet at its
   *  own height, for one whose last line is its action. */
  half?: number;
  /** While true a drag cannot close the sheet: it springs back instead (a
   *  confirmation that is already working). */
  locked?: boolean;
  /** When what the sheet holds grows or shrinks while it rests open, its
   *  height follows in the house's motion instead of snapping (build 95
   *  note 13, the profile: "make the profile system even smoother"). A sheet
   *  pinned to the foot of a phone moves its top edge by the whole change, so
   *  a profile arriving under its loading lines lifted the card 432px in one
   *  frame. With motion off it changes at once, as before. */
  smoothHeight?: boolean;
}): DraggableSheet {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLButtonElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = useState(open);

  // Geometry and position, all in px of translateY from the fully open place.
  const height = useRef(0);
  /** Gap between the panel's resting bottom and the screen's: a sheet lifted
   *  off the edge (a desktop card) has that much further to travel to leave. */
  const below = useRef(0);
  const halfAt = useRef<number | null>(null);
  /** A sheet that spans the screen's width and rests on its bottom edge. */
  const fullBleed = useRef(false);
  /** The scrim's height behind such a sheet, and the transition running now. */
  const scrimH = useRef(Number.POSITIVE_INFINITY);
  const motion = useRef<{ ms: number; ease: string } | null>(null);
  const offset = useRef(0);
  const snap = useRef<Snap>("full");
  const closing = useRef(false);
  /** When the running open or settle transition ends (performance.now()). */
  const busyUntil = useRef(0);
  const drag = useRef<{ startY: number; startOffset: number; samples: { t: number; y: number }[] } | null>(null);
  /** The finger's speed down (px per ms) when a drag let the sheet go, until it has left. */
  const flick = useRef(0);

  const onCloseRef = useRef(onClose);
  const lockedRef = useRef(locked);
  const reducedRef = useRef(reduced);
  const smoothRef = useRef(smoothHeight);
  useEffect(() => {
    onCloseRef.current = onClose;
    lockedRef.current = locked;
    reducedRef.current = reduced;
    smoothRef.current = smoothHeight;
  }, [onClose, locked, reduced, smoothHeight]);

  /** Where the sheet rests lowest while open: half if it has one. */
  const restAt = useCallback(() => halfAt.current ?? 0, []);
  /** Wholly below the screen. */
  const goneAt = useCallback(() => height.current + below.current + 24, []);

  const measure = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    height.current = panel.offsetHeight;
    const rect = panel.getBoundingClientRect();
    below.current = Math.max(0, window.innerHeight - (rect.bottom - offset.current));
    fullBleed.current = rect.width >= window.innerWidth - 2 && below.current < 2;
    const visibleHalf = Math.round(window.innerHeight * half);
    const gain = height.current - visibleHalf;
    halfAt.current = gain >= MIN_HALF_GAIN ? gain : null;
  }, [half]);

  /** Paint a position. The scrim follows: full strength at the lowest rest,
   *  nothing when the sheet is gone.
   *
   *  Behind a bottom sheet the scrim covers only what the sheet leaves in view:
   *  its height ends just under the sheet's top. The blur is computed for
   *  everything the scrim covers, on every frame anything on screen moves, and
   *  a profile card with gold dust falling moves forever. Full-screen, under a
   *  sheet that hides nine tenths of it, that blur held the card to about 20
   *  frames a second on a phone-sized screen (2026-10-02, measured with the
   *  blur off at 60). Sized to the strip that shows, it costs about nothing.
   *  Height, not a transform: Chrome drops a backdrop-filter from a translated
   *  element, so a scrim moved with translate3d dimmed the strip but never
   *  blurred it. Growing never waits on a transition, because the scrim grows
   *  as the sheet uncovers the page; shrinking happens under the sheet, where
   *  a frame late is a frame nobody sees. A centred card (a desktop dialog)
   *  keeps the whole screen: the page shows all around it. */
  const paint = useCallback((y: number) => {
    offset.current = y;
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (panel) panel.style.transform = y === 0 ? "none" : `translate3d(0, ${y}px, 0)`;
    if (scrim) {
      const range = Math.max(1, height.current - restAt());
      const p = Math.min(1, Math.max(0, (height.current - y) / range));
      scrim.style.opacity = String(p);
      if (fullBleed.current) {
        const top = window.innerHeight - height.current + y;
        const next = Math.min(window.innerHeight, Math.max(0, Math.round(top + CORNER_PX)));
        const m = motion.current;
        scrim.style.transition = !m
          ? "none"
          : next < scrimH.current
            ? `opacity ${m.ms}ms ${m.ease}, height ${m.ms}ms ${m.ease}`
            : `opacity ${m.ms}ms ${m.ease}`;
        scrim.style.bottom = "auto";
        scrim.style.height = `${next}px`;
        scrimH.current = next;
      } else if (scrim.style.height) {
        scrim.style.bottom = "";
        scrim.style.height = "";
        scrimH.current = Number.POSITIVE_INFINITY;
      }
      // Full strength, once; the opacity above fades it in and out.
      if (!scrim.style.backdropFilter) {
        const blur = `blur(${SCRIM_BLUR_PX}px)`;
        scrim.style.backdropFilter = blur;
        scrim.style.setProperty("-webkit-backdrop-filter", blur);
      }
    }
  }, [restAt]);

  /**
   * "resize" hands the sheet's height over (smoothHeight), on the snap's time
   * and the house curve. "throw" is a flicked sheet leaving: linear, so it
   * goes on at the finger's own speed, in `thrownMs` (throwMs, above). A close from a stop (a
   * tap on the scrim, Close, Back) starts slow and speeds away (EASE_OUT); after
   * a flick that curve stood the sheet still for a frame or two and then
   * pulled it away again (build 95 note 13, measured on the export: 395, 399,
   * 408px after a release at 2.4px a millisecond).
   */
  const transitions = useCallback(
    (kind: "none" | "open" | "close" | "snap" | "resize" | "throw", thrownMs: number = CLOSE_MS) => {
      const panel = panelRef.current;
      const scrim = scrimRef.current;
      if (!panel || !scrim) return;
      if (kind === "none") {
        motion.current = null;
        panel.style.transition = "none";
        scrim.style.transition = "none";
        return;
      }
      const ms = kind === "open" ? OPEN_MS : kind === "close" ? CLOSE_MS : kind === "throw" ? thrownMs : SNAP_MS;
      const ease = kind === "close" ? EASE_OUT : kind === "throw" ? "linear" : EASE;
      motion.current = { ms, ease };
      busyUntil.current = performance.now() + ms;
      panel.style.transition =
        kind === "resize"
          ? `height ${ms}ms ${ease}`
          : kind === "throw"
            ? `transform ${ms}ms ${ease} -${THROW_HEAD_START_MS}ms`
            : `transform ${ms}ms ${ease}`;
      // A full-width sheet's scrim also follows its edge (paint sets that).
      scrim.style.transition = `opacity ${ms}ms ${ease}`;
    },
    [],
  );

  const setSnap = useCallback((s: Snap) => {
    snap.current = s;
    // At half, the lower part of the body is below the screen, so scrolling it
    // would move text nobody can see. The first swipe opens the sheet instead.
    const body = bodyRef.current;
    if (body) body.style.overflowY = s === "half" ? "hidden" : "auto";
  }, []);

  const settle = useCallback(
    (y: number) => {
      setSnap(y === 0 ? "full" : "half");
      if (reduced) {
        transitions("none");
        paint(y);
        return;
      }
      transitions("snap");
      paint(y);
    },
    [paint, reduced, setSnap, transitions],
  );

  const expand = useCallback(() => {
    if (snap.current === "half" && !closing.current) settle(0);
  }, [settle]);

  // A layout effect, so a close begins in the frame it was asked for: as a
  // passive effect it began after the next frame was drawn, and a flicked
  // sheet stood still for that frame under the lifted finger (build 95 note 13,
  // measured on the export: 0, then 40px a frame, every time).
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (open) {
      closing.current = false;
      setMounted(true);
      return;
    }
    if (!mounted) return;
    // Close: from wherever the sheet is, including mid-drag.
    closing.current = true;
    drag.current = null;
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (panel && scrim) {
      if (reduced) {
        panel.style.transition = `opacity ${DISSOLVE_MS}ms ease`;
        scrim.style.transition = `opacity ${DISSOLVE_MS}ms ease`;
        panel.style.opacity = "0";
        scrim.style.opacity = "0";
      } else {
        // Flicked away: on at the finger's speed, as far as the screen's edge.
        const thrown = throwMs(goneAt() - offset.current, flick.current);
        if (thrown !== null) transitions("throw", thrown);
        else transitions("close");
        paint(goneAt());
      }
    }
    flick.current = 0;
    const t = setTimeout(() => setMounted(false), reduced ? DISSOLVE_MS : CLOSE_MS);
    return () => clearTimeout(t);
  }, [open, mounted, goneAt, paint, reduced, transitions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Open: measure, park the sheet below the screen, flush, then send it to
  // its resting height. Runs before paint, so the parked frame is never seen.
  useLayoutEffect(() => {
    if (!open || !mounted) return;
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!panel || !scrim) return;
    // Measure from the resting place, not from wherever a last close left it.
    transitions("none");
    offset.current = 0;
    panel.style.transform = "none";
    panel.style.height = "";
    measure();
    const rest = restAt();
    if (reduced) {
      transitions("none");
      paint(rest);
      panel.style.opacity = "0";
      scrim.style.opacity = "0";
      void panel.offsetHeight;
      panel.style.transition = `opacity ${DISSOLVE_MS}ms ease`;
      scrim.style.transition = `opacity ${DISSOLVE_MS}ms ease`;
      panel.style.opacity = "1";
      scrim.style.opacity = "1";
    } else {
      panel.style.opacity = "1";
      transitions("none");
      paint(goneAt());
      void panel.offsetHeight;
      transitions("open");
      paint(rest);
    }
    setSnap(rest === 0 ? "full" : "half");
  }, [open, mounted, goneAt, measure, paint, reduced, restAt, setSnap, transitions]);

  // What stands behind the sheet (the tab bar, the players, the reader's pill,
  // dock and plates) goes as it rises and comes back as it leaves, on its time
  // and curve: lib/ui/overlay.ts writes the flags on <body>, app/globals.css
  // times them ("What stands behind a sheet", build 89 note 16). Every sheet
  // is built on this hook, so every sheet does it. One layout effect for both
  // moments, so the rise ends and the leaving begins in one step, and the
  // rise begins in the frame the sheet's own does (the effect above).
  useLayoutEffect(() => {
    if (!mounted) return;
    return open ? sheetRises() : sheetLeaves();
  }, [open, mounted]);

  // Content or screen size changed: keep the sheet where it was resting.
  // With smoothHeight, the height is handed over: the panel is held at the
  // height on the screen, then eased to its new one while the scrim follows
  // its edge; the hold is let go once it has arrived (the reflow after it).
  // Nothing is measured while a hand-over runs: a held height read mid-way
  // would cut the transition short.
  useEffect(() => {
    if (!mounted) return;
    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") return;
    let later: ReturnType<typeof setTimeout> | undefined;
    const reflow = () => {
      if (drag.current || closing.current) return;
      const wait = busyUntil.current - performance.now();
      if (wait > 0) {
        // Still rising or settling: what it holds changing now is held at the
        // height its motion began with (this runs before the frame is drawn,
        // so the jump is never seen) and handed over once the motion ends.
        if (smoothRef.current && !reducedRef.current && !panel.style.height && height.current > 0 && panel.offsetHeight !== height.current && !(snap.current === "half" && halfAt.current !== null)) {
          panel.style.height = `${height.current}px`;
        }
        clearTimeout(later);
        later = setTimeout(reflow, wait + 16);
        return;
      }
      // What is on the screen now, and its own height with any hold let go.
      // This runs after the new layout and before it is drawn: with no hold,
      // the screen still shows the height last measured, not offsetHeight.
      const held = panel.style.height !== "";
      const shown = held ? panel.offsetHeight : height.current;
      if (held) {
        panel.style.transition = "none";
        panel.style.height = "";
      }
      const was = { h: height.current, half: halfAt.current };
      measure();
      if (!held && height.current === was.h && halfAt.current === was.half) return;
      const atHalf = snap.current === "half" && halfAt.current !== null;
      if (smoothRef.current && !reducedRef.current && !atHalf && Math.abs(height.current - shown) >= 1) {
        panel.style.height = `${shown}px`;
        void panel.offsetHeight;
        transitions("resize");
        panel.style.height = `${height.current}px`;
        setSnap("full");
        paint(0);
        clearTimeout(later);
        later = setTimeout(reflow, SNAP_MS + 32);
        return;
      }
      transitions("none");
      if (atHalf) paint(halfAt.current as number);
      else {
        setSnap("full");
        paint(0);
      }
    };
    const ro = new ResizeObserver(reflow);
    ro.observe(panel);
    window.addEventListener("resize", reflow);
    return () => {
      clearTimeout(later);
      ro.disconnect();
      window.removeEventListener("resize", reflow);
    };
  }, [mounted, measure, paint, setSnap, transitions]);

  // ── The gesture ───────────────────────────────────────────────────────────
  const begin = useCallback(
    (y: number) => {
      if (closing.current) return;
      drag.current = { startY: y, startOffset: offset.current, samples: [{ t: performance.now(), y }] };
      flick.current = 0;
      transitions("none");
      // A height being handed over goes to its new height under the finger.
      const panel = panelRef.current;
      if (panel?.style.height) panel.style.height = "";
    },
    [transitions],
  );

  const move = useCallback(
    (y: number) => {
      const d = drag.current;
      if (!d) return;
      const raw = d.startOffset + (y - d.startY);
      // Above the top the sheet resists, so it can be tugged but not lifted.
      paint(raw < 0 ? raw * 0.3 : raw);
      const now = performance.now();
      d.samples.push({ t: now, y });
      while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift();
    },
    [paint],
  );

  const end = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const dt = Math.max(1, last.t - first.t);
    const v = (last.y - first.y) / dt; // px per ms, positive is down
    const y = offset.current;
    const low = restAt();
    const projected = y + v * 180;
    const closeLine = low + Math.min(140, (height.current - low) * 0.4);
    if (!lockedRef.current && (projected > closeLine || (v > 1 && y > low - 8))) {
      flick.current = Math.max(0, v);
      onCloseRef.current();
      return;
    }
    const rests = halfAt.current === null ? [0] : [0, halfAt.current];
    let target = rests[0];
    for (const r of rests) if (Math.abs(r - projected) < Math.abs(target - projected)) target = r;
    settle(target);
  }, [restAt, settle]);

  // Header: pointer events, both directions. Not from a button, or the close
  // button's click would land on the header instead.
  const grab = {
    onPointerDown: (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      begin(e.clientY);
    },
    onPointerMove: (e: React.PointerEvent) => move(e.clientY),
    onPointerUp: () => end(),
    onPointerCancel: () => end(),
  };

  // Body: touch events, because only a non-passive touchmove can take a
  // gesture away from native scrolling once it is under way.
  useEffect(() => {
    if (!mounted) return;
    const body = bodyRef.current;
    if (!body) return;
    let startY = 0;
    let tracking = false;
    let taken = false;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || closing.current) return;
      // A surface that is itself dragged, like a photo being cropped, keeps
      // its gestures: a pull down there moves the photo, not the sheet.
      if ((e.target as Element | null)?.closest?.("[data-sheet-nodrag]")) return;
      startY = e.touches[0].clientY;
      tracking = true;
      taken = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const y = e.touches[0].clientY;
      const dy = y - startY;
      if (!taken) {
        if (Math.abs(dy) < SLOP_PX) return;
        const pullDown = dy > 0 && body.scrollTop <= 0;
        const pullUpAtHalf = dy < 0 && snap.current === "half";
        if (!pullDown && !pullUpAtHalf) {
          tracking = false;
          return;
        }
        taken = true;
        begin(y);
      }
      e.preventDefault();
      move(y);
    };
    const onEnd = () => {
      if (taken) end();
      tracking = false;
      taken = false;
    };
    body.addEventListener("touchstart", onStart, { passive: true });
    body.addEventListener("touchmove", onMove, { passive: false });
    body.addEventListener("touchend", onEnd);
    body.addEventListener("touchcancel", onEnd);
    return () => {
      body.removeEventListener("touchstart", onStart);
      body.removeEventListener("touchmove", onMove);
      body.removeEventListener("touchend", onEnd);
      body.removeEventListener("touchcancel", onEnd);
    };
  }, [mounted, begin, move, end]);

  return { mounted, panelRef, scrimRef, bodyRef, grab, expand };
}
