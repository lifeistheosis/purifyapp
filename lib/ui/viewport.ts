"use client";

/**
 * What of the screen is really there to draw on.
 *
 * `useVisibleFrame` is the part the on-screen keyboard has not covered. A
 * phone lays its keyboard over the bottom of the page without shrinking the
 * page (Chrome on Android since 108, Safari always), so `position: fixed;
 * bottom: 0` and `dvh` both sit under it. A surface that takes typing sizes
 * its box to this frame instead, and its last row ends above the keyboard.
 * A headless browser has no keyboard, so a check for this has to stand one in
 * by replacing `window.visualViewport` before the page's code runs.
 *
 * `useIsPhoneWidth` is the `md` breakpoint read live, for the few places
 * where a phone and a computer are different components rather than
 * different classes.
 *
 * Both are read through useSyncExternalStore, so the server and the first
 * client render agree (null, false) and nothing is set from an effect.
 */

import { useSyncExternalStore } from "react";

export type VisibleFrame = {
  /** How far the visible part starts below the top of the layout, in px. */
  top: number;
  /** Its height, in px. */
  height: number;
};

let frameCache: VisibleFrame | null = null;

function readFrame(): VisibleFrame | null {
  if (typeof window === "undefined") return null;
  const vv = window.visualViewport;
  if (!vv) return null;
  // A pinch zoom moves the visual viewport too. A zoomed page is the reader's
  // own doing: keep the last unzoomed frame rather than chase their fingers.
  if (Math.abs(vv.scale - 1) > 0.01) return frameCache;
  const top = Math.round(vv.offsetTop);
  const height = Math.round(vv.height);
  if (!frameCache || frameCache.top !== top || frameCache.height !== height) {
    frameCache = { top, height };
  }
  return frameCache;
}

function subscribeFrame(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener("resize", onChange);
  vv.addEventListener("scroll", onChange);
  return () => {
    vv.removeEventListener("resize", onChange);
    vv.removeEventListener("scroll", onChange);
  };
}

const noFrame = () => null;

/** The visible part of the screen, or null where the browser cannot say. */
export function useVisibleFrame(): VisibleFrame | null {
  return useSyncExternalStore(subscribeFrame, readFrame, noFrame);
}

const PHONE = "(max-width: 767.98px)";

function subscribePhone(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(PHONE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function readPhone(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.(PHONE).matches);
}

const notPhone = () => false;

/** True below the `md` breakpoint. False on the server and before hydration. */
export function useIsPhoneWidth(): boolean {
  return useSyncExternalStore(subscribePhone, readPhone, notPhone);
}
