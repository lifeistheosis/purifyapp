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
  themeAttributes,
  themeWorn,
} from "@/lib/reader/readingModes";
import { clearPass, keepWindow, nightHolds, nightNow, passHolds, readWindow, vespersOn, vespersTheme } from "@/lib/reader/vespers";
import { canMove } from "@/lib/ui/routeMotion";

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
  //
  // The answer is the app's one answer, the same one every picker reads
  // (lib/reader/plusModesGate.ts): this once kept its own, from the moment
  // the app opened, and a reader who signed in afterwards tapped a look on a
  // page that said yes while this still said no (build 93 note 3).
  const { allows } = usePlusReadingModes();
  // Candlelight at Vespers (1.9, lib/reader/vespers.ts): the night the
  // palette follows while the switch is on, and the clock to its next turn.
  const night = useRef<Night | null>(null);
  const turn = useRef<number | null>(null);
  const reckoning = useRef(false);
  // The latest apply, for the clock and the reckoning to call when they come due.
  const latest = useRef<() => void>(() => {});
  // What this controller last put on the page, so a change can be told from
  // the first apply after a load.
  const worn = useRef<{ mode: string | null; look: string | null } | null>(null);

  /**
   * `chosen` is true when a reader has just changed a setting on this screen
   * (the event ReaderPrefs broadcasts): a palette that changes then arrives
   * as a cross-fade. Every other apply (the first after a load, the gate's
   * answer, the clock at sunset, a phone waking) lands at once, as it always
   * has.
   */
  const apply = useCallback((chosen = false) => {
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
      // The switch off takes back a night given to the reader's own pick, so on again means Candlelight now.
      clearPass();
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
    // A palette picked after sunset is worn for the rest of that night
    // (lib/reader/vespers.ts, passTonight); the clock below still runs on the
    // night itself, so Candlelight is back at the next sunset.
    const wanted = vespersTheme(stored, on, held && !passHolds(now) ? held : null);
    // The reader's own where the gate lets them wear it, else Dark: the rule the pickers draw their check by.
    const theme = allows(wanted) ? wanted : themeWorn(stored, allows);
    // A palette is its own mode; a look (1.9) is worn over Dark or over Light.
    const { mode, look } = themeAttributes(theme);
    const wear = () => {
      if (mode) el.setAttribute("data-reading-mode", mode);
      else el.removeAttribute("data-reading-mode");
      if (look) el.setAttribute("data-look", look);
      else el.removeAttribute("data-look");
    };
    // A palette a reader has just picked arrives the way the reader's focus
    // does (1.9, the brief for the reading modes' page: "a tap applies it
    // with the house's motion"): the screen as it was and the screen as it
    // is are pictured, and the two cross-fade on the house curve ("View
    // Transition tuning", app/globals.css). Nothing travels, so nothing is
    // mirrored in Arabic. With motion off, or on a phone with no View
    // Transitions, canMove() says no and the palette lands at once.
    const before = worn.current;
    worn.current = { mode, look };
    const changed = before !== null && (before.mode !== mode || before.look !== look);
    if (chosen && changed && canMove()) {
      try {
        const moving = document as Document & { startViewTransition: (update: () => void) => { ready: Promise<unknown> } };
        // A skipped transition still runs the update; only its promise is refused.
        moving.startViewTransition(wear).ready.catch(() => {});
      } catch {
        wear();
      }
    } else wear();
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
    // A setting changed on this screen: the one apply that may be pictured.
    // Not the account's own writes (lib/sync/kept.ts marks them): a palette
    // arriving from another device is not a tap.
    const onPrefs = (event: Event) => apply((event as CustomEvent<{ source?: string } | null>).detail?.source !== "sync");
    const onStorage = () => apply();
    window.addEventListener(PREFS_EVENT, onPrefs);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(PREFS_EVENT, onPrefs);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      if (turn.current !== null) window.clearTimeout(turn.current);
    };
  }, [apply]);

  return null;
}
