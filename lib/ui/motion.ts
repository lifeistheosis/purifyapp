"use client";

// Motion helpers shared across the app.
//
// Both of these existed already, copy-pasted: the reduced-motion check in
// four components (Odometer, EventHero, AudioPlayer, PrayerSlideshow) and
// the haptic tick in two (PrayerRope, TimelineFastScroll). Four copies of a
// matchMedia call is four chances to forget the SSR guard or the change
// listener, which is exactly what happened — two of the four read the query
// once and never subscribed, so toggling the OS setting did nothing until
// reload.
//
// The CSS side is not here: `app/globals.css` already carries a
// `prefers-reduced-motion` block next to every animation it defines. These
// are only for motion that JavaScript drives (rAF tweens, autoplay
// intervals, smooth-scroll calls), which CSS cannot opt out of.

import { useCallback, useSyncExternalStore } from "react";

import { isNativeClient } from "@/lib/platform/native";
import {
  MOTION_EVENT,
  MOTION_KEY,
  isMotionPreference,
  resolveReducedMotion,
  surfaceForPath,
  type MotionPreference,
} from "./motionPreference";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/** The stored choice, or "os" when nothing has been chosen or storage is shut. */
export function motionPreference(): MotionPreference {
  try {
    const v = window.localStorage.getItem(MOTION_KEY);
    return isMotionPreference(v) ? v : "os";
  } catch {
    return "os";
  }
}

export function setMotionPreference(next: MotionPreference): void {
  try {
    window.localStorage.setItem(MOTION_KEY, next);
  } catch {
    /* private mode: the choice holds for this page view only */
  }
  window.dispatchEvent(new CustomEvent(MOTION_EVENT));
}

/** Imperative read. Use inside event handlers and rAF loops, where a hook
 * cannot go. Returns false during SSR. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return resolveReducedMotion({
    preference: motionPreference(),
    surface: surfaceForPath(window.location.pathname),
    osReduce: window.matchMedia(REDUCE_QUERY).matches,
  });
}

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", onChange);
  // The preference is a second input, and it can move from this tab (the admin
  // toggle) or from another one (the storage event). Both have to re-resolve,
  // or the panel keeps animating after you asked it to stop.
  const onPref = () => onChange();
  const onStorage = (e: StorageEvent) => {
    if (e.key === MOTION_KEY) onChange();
  };
  window.addEventListener(MOTION_EVENT, onPref);
  window.addEventListener("storage", onStorage);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener(MOTION_EVENT, onPref);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Reactive form. Re-renders when the OS setting changes, so a user who
 * turns "Reduce motion" on mid-session gets the calm version immediately
 * rather than on next reload.
 *
 * SSR and the first client render both return false, matching the CSS
 * default, so there is no hydration mismatch.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => false,
  );
}

/** Scroll behavior that respects the setting. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

type HapticStrength = "light" | "medium";

/**
 * A single haptic tick.
 *
 * Inside the native shell this goes through the platform haptic engine:
 * iOS WKWebView never implemented `navigator.vibrate`, and a prayer-rope
 * knot is exactly where a real haptic matters. Browsers fall back to
 * `navigator.vibrate`, which Safari also lacks, so this is best-effort
 * everywhere and must never be the only feedback a control gives.
 *
 * Fire-and-forget: the dynamic import means the Capacitor plugin is not in
 * the web bundle, and every failure path is swallowed.
 */
export function haptic(strength: HapticStrength = "light"): void {
  if (isNativeClient()) {
    import("@capacitor/haptics")
      .then(({ Haptics, ImpactStyle }) =>
        Haptics.impact({
          style: strength === "medium" ? ImpactStyle.Medium : ImpactStyle.Light,
        }),
      )
      .catch(() => {});
    return;
  }
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(strength === "medium" ? 14 : 8);
    } catch {
      /* ignore */
    }
  }
}

/** Hook form, for components that want a stable callback in a dep array. */
export function useHaptics() {
  return useCallback((strength: HapticStrength = "light") => haptic(strength), []);
}
