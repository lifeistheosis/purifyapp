"use client";

import { isNativeClient } from "@/lib/platform/native";

/**
 * Marks that land together are one moment. Finishing the morning rule is
 * usually also what keeps the day, and one tap should be felt once.
 */
const SAME_MOMENT_MS = 400;

let lastAt = 0;

/**
 * A soft tick in the hand, for the three quiet moments that get one: a prayer
 * rule finished, the day kept for the streak, a verse saved.
 *
 * The phone apps only. In a browser this does nothing at all: there is no
 * `navigator.vibrate` here, and the plugin is never loaded. `haptic()` in
 * ./motion.ts is the one that also buzzes a browser, and the controls that
 * use it (the tab bar, the timeline scrubber) keep it.
 *
 * It is the plugin's light impact, and not a selection or a notification:
 *   - On Android the light impact is one 50 ms pulse at under half strength
 *     (110 of 255). The selection tick is 100 ms, twice as long, and takes
 *     three calls (start, changed, end) meant for a finger moving through a
 *     picker. The success notification is two pulses at nearly full strength.
 *   - On an iPhone the light impact is the gentlest single tap the plugin
 *     has, and the success notification is a two-beat pattern, which is an
 *     announcement.
 * A finished rule is not a prize, so it gets the tap and not the fanfare.
 *
 * Fire-and-forget: it answers nothing and never throws. Whether the phone
 * moves is the phone's to decide: its own vibration settings stand above this,
 * and Purify has no switch of its own for it.
 */
export function softTick(): void {
  try {
    if (!isNativeClient()) return;
    const now = Date.now();
    // abs: a clock set back must not hold every tick until it catches up.
    if (Math.abs(now - lastAt) < SAME_MOMENT_MS) return;
    lastAt = now;
    import("@capacitor/haptics")
      .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
      .catch(() => {});
  } catch {
    // A tick is never worth an error on the screen.
  }
}
