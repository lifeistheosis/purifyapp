"use client";

import { useSyncExternalStore } from "react";

/**
 * Clicks as you scroll (1.9; the arbiter's ask of 2026-11-11 and its yes to
 * the row's words): one switch in Settings for the light click in the hand as
 * each prayer, chapter or event passes, and when a rule is complete.
 *
 * Every click it covers reads it at the moment it would come, so a change in
 * Settings holds everywhere at once:
 *   - handTicks and attachScrollTicks (./scrollTicks.ts): the prayers as each
 *     reaches the reading place, the saints' century timeline, the Bible's
 *     chapter strip and the other rows that click, an event's steps, the
 *     atlas's wheel;
 *   - the rule's completion (components/prayers/PrayerRuleReader.tsx), and
 *     with it the day that completion keeps (./softTick.ts, quietMoment), so
 *     the moment is still when the switch is off.
 * A tap's own answer (a verse saved, a bookmark) is not a click as you scroll
 * and stays as it is.
 *
 * On unless the reader turns it off. Kept on this phone only: the clicks are
 * the phone's, and a browser never gives one.
 */

const KEY = "purify:scroll-clicks";
const EVT = "purify:scroll-clicks:change";

/** The choice when storage cannot be read or written, for the rest of the visit. */
let held: boolean | null = null;

/** Whether the clicks are on. */
export function clicksOn(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return held ?? true;
  }
}

/** Turn the clicks on or off, and tell everything that shows the choice. */
export function setClicks(on: boolean): void {
  if (typeof window === "undefined") return;
  held = on;
  try {
    if (on) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, "off");
  } catch {
    /* storage may be unavailable: the choice holds for this visit */
  }
  window.dispatchEvent(new Event(EVT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The switch's state and its setter, for the row in Settings. */
export function useClicksSetting(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, clicksOn, () => true);
  return [on, setClicks];
}
