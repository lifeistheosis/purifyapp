"use client";

// The reader's current calendar day, resolved on the client.
//
// WHY THIS EXISTS. Every "today" surface used to call
// `startOfDayUtc(new Date())` inside a server component. Under
// `output: "export"` (the Android target) a server component renders ONCE,
// at build time, and that render is frozen into the APK. So the app showed
// the day the build was cut: a member on the 2026-07-27 build was still
// being shown July 27, with July 27's saint, fast, readings and Pascha
// countdown, four days later. `export const revalidate` does nothing in a
// static export. The only correct answer is to resolve the day after mount,
// on the device.
//
// It also fixes a second, quieter bug: the UTC day runs ahead of local time
// for the whole Western hemisphere, so a reader in Florida opening the app
// at 9pm saw tomorrow's commemoration. `startOfDayLocal` reads the device's
// own calendar day.
//
// Returns `null` wherever the page is drawn on the server. That is
// deliberate, not laziness: if the prerender produced a date, the static
// export would bake it into the HTML again and we would be back where we
// started. Callers render a quiet placeholder for the one frame before
// hydration. On the device the day is there from the first render (since
// 1.9: useToday is useTodayAtOnce, below).

import { useSyncExternalStore } from "react";
import { startOfDayLocal } from "@/lib/calendar/orthodox";

/** Milliseconds until just after the next local midnight. */
function msUntilLocalMidnight(now: Date): number {
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    2,
  );
  return Math.max(1000, next.getTime() - now.getTime());
}

/**
 * The device's calendar day: null wherever the page is drawn on the server
 * (the export's prerender, the website's first page), so no date is baked
 * into the HTML, and the day itself from the first render wherever the page
 * is drawn on the device. Read again just after each local midnight and when
 * the app comes back to the foreground.
 *
 * It is useTodayAtOnce (below). Until 1.9 it was the day set in an effect
 * after mount, so a page switched to was drawn first without it and again
 * with it; a page switch is a View Transition, which takes its picture of
 * the page arriving before an effect's change is drawn, so whatever the day
 * decides landed in the live page and moved what was under it: Reading
 * plans' season card pushed the plans 354px down as it came, and Today's
 * prayer's fasting line moved 198px (Gate 2.0's run, 2026-11-13). The 1.8
 * mend of the same fault (note 58, the chants) made useTodayAtOnce and gave
 * it to the chants alone; every screen that reads the day has it now.
 */
export function useToday(): Date | null {
  return useTodayAtOnce();
}

let shownDay: Date | null = null;

/**
 * The device's calendar day now, as the same Date until the day turns, so a
 * store that hands it out changes only when the day does.
 */
export function todayNow(now: Date = new Date()): Date {
  const day = startOfDayLocal(now);
  if (!shownDay || shownDay.getTime() !== day.getTime()) shownDay = day;
  return shownDay;
}

/** The day is read again just after each local midnight, and when the app comes back to the foreground. */
function subscribeDay(onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    timer = setTimeout(() => {
      onChange();
      arm();
    }, msUntilLocalMidnight(new Date()));
  };
  arm();
  const resync = () => {
    if (!document.hidden) onChange();
  };
  document.addEventListener("visibilitychange", resync);
  window.addEventListener("focus", resync);
  return () => {
    if (timer) clearTimeout(timer);
    document.removeEventListener("visibilitychange", resync);
    window.removeEventListener("focus", resync);
  };
}

const noDayOnTheServer = () => null;

/**
 * The same day as useToday, known in the first render wherever a page is
 * drawn on the device: every screen in the apps, and every screen of the
 * website after its first. A page drawn on the server (the export's
 * prerender, the website's first page) starts with none, exactly as
 * useToday does, so no date is baked into the HTML; React reads the
 * server's answer while it takes that page over, then the device's.
 *
 * Why (1.8, the owner's note 58, going back from a chant "is buggy"): with
 * useToday a screen is drawn once with no day and again a frame later with
 * it, so whatever the day decides arrives in the second frame and moves
 * what is under it. Chants came back from a chant without its rows (this
 * week's tone, the feast, the Psalms) and jumped as they arrived; the walk
 * of the 1.8 export saw the list under them drop 370px and come back.
 */
export function useTodayAtOnce(): Date | null {
  return useSyncExternalStore(subscribeDay, todayNow, noDayOnTheServer);
}
