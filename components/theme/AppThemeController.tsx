"use client";

// Applies the reader's chosen palette to the WHOLE app, not just the two
// reader routes.
//
// The mechanism already existed and was proven: `data-reading-mode` on
// <html> re-maps the @theme colour variables in globals.css, so every
// utility class re-themes in one paint with no per-component work. It was
// only ever mounted on the reader, and ReadingModeController deliberately
// stripped the attribute on unmount ("never leak a reading palette onto
// non-reader surfaces"), which is exactly what kept a chosen palette from
// following the reader anywhere else.
//
// This controller is mounted once in the root layout and does not strip.
// The palette is the app's palette now.
//
// It reads localStorage directly rather than going through
// ReaderPrefsProvider, because that provider is mounted per route and this
// has to work on every surface, including Today, which sits outside the
// (app) group entirely.

import { useCallback, useEffect, useRef } from "react";

import { usePlusReadingModes } from "@/components/reader/usePlusReadingModes";
import type { Night } from "@/lib/calendar/sun";
import {
  READING_THEME_KEY,
  coerceReadingTheme,
} from "@/lib/reader/readingModes";
import { keepWindow, nightHolds, nightNow, readWindow, vespersOn, vespersTheme } from "@/lib/reader/vespers";

/** The longest the controller sleeps before it looks at the night again. */
const LOOK_AGAIN_MS = 6 * 3_600_000;

/** Same event ReaderPrefs broadcasts on write, so a change lands instantly. */
const PREFS_EVENT = "purify:reader-prefs";

export function AppThemeController() {
  // The paid gate moved here with the application itself. It used to live in
  // ReaderPrefs' ReadingModeController; leaving it there while this applied
  // the attribute would have meant an unentitled reader with a premium id still
  // in localStorage got the palette anyway, app-wide. The pre-paint script
  // cannot consult entitlements (they are async, and it must run before
  // paint), so it optimistically applies a stored palette and this corrects
  // it a frame later if the reader is not entitled.
  const { allows } = usePlusReadingModes();
  // Candlelight at Vespers (1.9, lib/reader/vespers.ts): the night the
  // palette follows while the switch is on, and the clock to its next turn.
  const night = useRef<Night | null>(null);
  const turn = useRef<number | null>(null);
  const reckoning = useRef(false);
  // The latest apply, for the clock and the reckoning to call when they come due.
  const latest = useRef<() => void>(() => {});

  const apply = useCallback(() => {
    const el = document.documentElement;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(READING_THEME_KEY);
    } catch {
      /* storage blocked: keep the default palette */
    }
    // Per palette, not one boolean for every palette. Light mode is free, so an
    // unentitled reader keeps it here; only the paid palettes fall back.
    const stored = coerceReadingTheme(raw);
    const on = vespersOn();
    const now = Date.now();
    if (turn.current !== null) window.clearTimeout(turn.current);
    turn.current = null;
    // The night as the pre-paint script read it, until it is reckoned afresh.
    if (on && !nightHolds(night.current, now)) night.current = readWindow(now);
    if (!on) {
      night.current = null;
      keepWindow(null);
    } else if (!nightHolds(night.current, now) && !reckoning.current) {
      reckoning.current = true;
      void nightNow()
        .then((fresh) => {
          night.current = fresh;
          keepWindow(fresh);
        })
        .finally(() => {
          reckoning.current = false;
          latest.current();
        });
    }
    const held = on && nightHolds(night.current, now) ? night.current : null;
    const wanted = vespersTheme(stored, on, held);
    const theme = allows(wanted) ? wanted : allows(stored) ? stored : "default";
    if (theme === "default") el.removeAttribute("data-reading-mode");
    else el.setAttribute("data-reading-mode", theme);
    // At sunset or sunrise, look again.
    if (held) {
      const wait = (held.now ? held.end : held.start) - now;
      turn.current = window.setTimeout(() => {
        night.current = null;
        latest.current();
      }, Math.min(Math.max(wait, 1_000), LOOK_AGAIN_MS));
    }
  }, [allows]);

  useEffect(() => {
    latest.current = apply;
    // The pre-paint script in app/layout.tsx has normally already set the
    // attribute; this re-applies after hydration and then keeps it current.
    apply();
    // A phone asleep through sunset wakes to the right palette.
    const onVisible = () => {
      if (document.visibilityState === "visible") apply();
    };
    window.addEventListener(PREFS_EVENT, apply);
    window.addEventListener("storage", apply);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(PREFS_EVENT, apply);
      window.removeEventListener("storage", apply);
      document.removeEventListener("visibilitychange", onVisible);
      if (turn.current !== null) window.clearTimeout(turn.current);
    };
  }, [apply]);

  return null;
}
