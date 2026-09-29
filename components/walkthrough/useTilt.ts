"use client";

// Gyroscope parallax for the card drawings (the owner's specification: "line
// illustrations with gyroscope parallax"). Tilting the phone slides the
// drawing's three layers by different amounts, so the scene has depth.
//
// Writes --tx and --ty (each -1 to 1) straight onto the frame element inside
// requestAnimationFrame, never through React state, so a stream of sensor
// events never re-renders the card. Falls back to the pointer on a desktop.
// Does nothing under reduced motion (the attribute on <html>, so a phone that
// is judged slow stays still too).
//
// iOS asks permission for motion sensors, and only inside a tap:
// requestTiltPermission() is called from the tap that opens a card.

import { useEffect, type RefObject } from "react";

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

let permission: "unknown" | "granted" | "denied" = "unknown";

/** Call from a tap. Harmless where no permission is needed. */
export function requestTiltPermission(): void {
  if (permission !== "unknown" || typeof window === "undefined") return;
  const Ctor = (window as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent;
  if (!Ctor || typeof Ctor.requestPermission !== "function") {
    permission = "granted";
    return;
  }
  Ctor.requestPermission()
    .then((r) => {
      permission = r;
    })
    .catch(() => {
      permission = "denied";
    });
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

export function useTilt(frame: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const el = frame.current;
    if (!active || !el) return;
    if (document.documentElement.getAttribute("data-motion") === "reduce") return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let base: { beta: number; gamma: number } | null = null;
    const flush = () => {
      raf = 0;
      el.style.setProperty("--tx", tx.toFixed(3));
      el.style.setProperty("--ty", ty.toFixed(3));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(flush);
    };

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      // Relative to how the phone was held when the card opened.
      if (!base) base = { beta: e.beta, gamma: e.gamma };
      tx = clamp((e.gamma - base.gamma) / 18);
      ty = clamp((e.beta - base.beta) / 18);
      schedule();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      tx = clamp(((e.clientX - r.left) / r.width - 0.5) * 2);
      ty = clamp(((e.clientY - r.top) / r.height - 0.5) * 2);
      schedule();
    };

    window.addEventListener("deviceorientation", onOrient);
    el.addEventListener("pointermove", onPointer);
    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      el.removeEventListener("pointermove", onPointer);
      if (raf) cancelAnimationFrame(raf);
      el.style.removeProperty("--tx");
      el.style.removeProperty("--ty");
    };
  }, [frame, active]);
}
