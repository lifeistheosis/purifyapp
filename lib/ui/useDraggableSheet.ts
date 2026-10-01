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
//     close, and continuously while the finger moves.
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

/** A half rest only exists when it would hide at least this much. */
const MIN_HALF_GAIN = 64;

/** Movement before the body hands a gesture to the sheet. */
const SLOP_PX = 6;

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
  const offset = useRef(0);
  const snap = useRef<Snap>("full");
  const closing = useRef(false);
  /** When the running open or settle transition ends (performance.now()). */
  const busyUntil = useRef(0);
  const drag = useRef<{ startY: number; startOffset: number; samples: { t: number; y: number }[] } | null>(null);

  const onCloseRef = useRef(onClose);
  const lockedRef = useRef(locked);
  useEffect(() => {
    onCloseRef.current = onClose;
    lockedRef.current = locked;
  }, [onClose, locked]);

  /** Where the sheet rests lowest while open: half if it has one. */
  const restAt = useCallback(() => halfAt.current ?? 0, []);
  /** Wholly below the screen. */
  const goneAt = useCallback(() => height.current + below.current + 24, []);

  const measure = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    height.current = panel.offsetHeight;
    below.current = Math.max(0, window.innerHeight - (panel.getBoundingClientRect().bottom - offset.current));
    const visibleHalf = Math.round(window.innerHeight * half);
    const gain = height.current - visibleHalf;
    halfAt.current = gain >= MIN_HALF_GAIN ? gain : null;
  }, [half]);

  /** Paint a position. The scrim follows: full strength at the lowest rest,
   *  nothing when the sheet is gone. */
  const paint = useCallback((y: number) => {
    offset.current = y;
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (panel) panel.style.transform = y === 0 ? "none" : `translate3d(0, ${y}px, 0)`;
    if (scrim) {
      const range = Math.max(1, height.current - restAt());
      const p = Math.min(1, Math.max(0, (height.current - y) / range));
      scrim.style.opacity = String(p);
      const blur = `blur(${(SCRIM_BLUR_PX * p).toFixed(2)}px)`;
      scrim.style.backdropFilter = blur;
      scrim.style.setProperty("-webkit-backdrop-filter", blur);
    }
  }, [restAt]);

  const transitions = useCallback(
    (kind: "none" | "open" | "close" | "snap") => {
      const panel = panelRef.current;
      const scrim = scrimRef.current;
      if (!panel || !scrim) return;
      if (kind === "none") {
        panel.style.transition = "none";
        scrim.style.transition = "none";
        return;
      }
      const ms = kind === "open" ? OPEN_MS : kind === "close" ? CLOSE_MS : SNAP_MS;
      const ease = kind === "close" ? EASE_OUT : EASE;
      busyUntil.current = performance.now() + ms;
      panel.style.transition = `transform ${ms}ms ${ease}`;
      scrim.style.transition = [
        `opacity ${ms}ms ${ease}`,
        `backdrop-filter ${ms}ms ${ease}`,
        `-webkit-backdrop-filter ${ms}ms ${ease}`,
      ].join(", ");
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
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
        transitions("close");
        paint(goneAt());
      }
    }
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

  // Content or screen size changed: keep the sheet where it was resting.
  useEffect(() => {
    if (!mounted) return;
    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") return;
    let later: ReturnType<typeof setTimeout> | undefined;
    const reflow = () => {
      if (drag.current || closing.current) return;
      const wait = busyUntil.current - performance.now();
      if (wait > 0) {
        clearTimeout(later);
        later = setTimeout(reflow, wait + 16);
        return;
      }
      const was = { h: height.current, half: halfAt.current };
      measure();
      if (height.current === was.h && halfAt.current === was.half) return;
      transitions("none");
      if (snap.current === "half" && halfAt.current !== null) paint(halfAt.current);
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
      transitions("none");
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
