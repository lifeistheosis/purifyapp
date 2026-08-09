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

import { useCallback, useEffect } from "react";

import { useProReadingModes } from "@/components/reader/useProReadingModes";

import {
  READING_THEME_KEY,
  coerceReadingTheme,
} from "@/lib/reader/readingModes";

/** Same event ReaderPrefs broadcasts on write, so a change lands instantly. */
const PREFS_EVENT = "purify:reader-prefs";

export function AppThemeController() {
  // The Pro gate moved here with the application itself. It used to live in
  // ReaderPrefs' ReadingModeController; leaving it there while this applied
  // the attribute would have meant a non-Pro reader with a premium id still
  // in localStorage got the palette anyway, app-wide. The pre-paint script
  // cannot consult entitlements (they are async, and it must run before
  // paint), so it optimistically applies a stored palette and this corrects
  // it a frame later if the reader is not entitled.
  const { allows } = useProReadingModes();

  const apply = useCallback(() => {
    const el = document.documentElement;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(READING_THEME_KEY);
    } catch {
      /* storage blocked: keep the default palette */
    }
    // Per palette, not one boolean for all four. Light mode is free, so an
    // unentitled reader keeps it here; only the Pro palettes fall back.
    const stored = coerceReadingTheme(raw);
    const theme = allows(stored) ? stored : "default";
    if (theme === "default") el.removeAttribute("data-reading-mode");
    else el.setAttribute("data-reading-mode", theme);
  }, [allows]);

  useEffect(() => {
    // The pre-paint script in app/layout.tsx has normally already set the
    // attribute; this re-applies after hydration and then keeps it current.
    apply();
    window.addEventListener(PREFS_EVENT, apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener(PREFS_EVENT, apply);
      window.removeEventListener("storage", apply);
    };
  }, [apply]);

  return null;
}
