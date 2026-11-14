/**
 * The prayers' scroll, its sums (1.9): kept here, pure, so the tests can hold
 * them without a browser. The hooks that measure the page are
 * components/prayers/service/useLitLine.ts (the line over the band's middle
 * lit, and the click as each new prayer arrives there, in the same frame) and
 * usePassedSteps.ts (each prayer counted as it is passed).
 *
 * Easy Scroll (build 89 note 7, his name for it; by the verse from build 90
 * note 6) snapped the page to each prayer and then to each verse, with the
 * browser's own scroll snapping. Build 93 note 2 found it fighting the
 * finger, measured on the export: it was taken out (useLitLine.ts says
 * how), and with it the rests it placed. The page scrolls as the phone does.
 *
 * Every measure is in the same frame of reference as the reading place
 * (lib/ui/readingPlace.ts): pixels from the top of the screen, or from the top
 * of the page when the caller adds the scroll to both sides.
 */

import { LIT_AT, blockAt } from "@/lib/ui/readingPlace";

/** How near its place a line set there (Begin, Your rule today) counts as standing on it. */
export const ON_PLACE_PX = 3;

/** How far down the band the last lines are read at the very foot of the page. */
export const LIT_FOOT = 0.9;

/**
 * How far down the band the line lit is read (build 97 note 1): over the
 * middle (LIT_AT), and near the page's foot sliding down with the last lines,
 * which could otherwise never rise to it. `room` is the band's height, `left`
 * how much of the page is still below the screen.
 */
export function litShare(room: number, left: number): number {
  const nearFoot = left < room ? 1 - Math.max(0, left) / room : 0;
  return LIT_AT + (LIT_FOOT - LIT_AT) * nearFoot;
}

/**
 * The line lit: the last whose top is at or above the place, or -1 while the
 * place is above them all (the head of the page). `tops` in the page's order.
 */
export function lineAt(tops: readonly number[], place: number): number {
  if (tops.length === 0 || place < tops[0]) return -1;
  return blockAt(tops.length, (i) => tops[i], place);
}

/**
 * Whether the hand feels the click (build 89 note 7, his "haptic feedback
 * when they scroll to each section"): only when the line lit stands in a new
 * prayer, never for another verse of the same prayer, and never where no
 * prayer stands. Asked in the frame the line is lit (build 97 note 1), so the
 * click comes as the glow lands in that prayer: moving down, on its first
 * line.
 */
export function clicksFor<T>(arrived: T | null, now: T | null): boolean {
  return now !== null && now !== arrived;
}

export type PassState = {
  /** Prayers seen at or below the reading place during this visit. */
  seen: Set<string>;
  /** Prayers already counted, which are not counted again. */
  told: Set<string>;
};

/**
 * The prayers a reader moving down has just passed: seen at or below the
 * reading place before, wholly above it now. A prayer the page opened past
 * (Your rule beginning further on) was never seen below the place, so it is
 * not counted as prayed. Moving back up counts nothing and takes nothing back.
 */
export function passedNow(steps: readonly { id: string; bottom: number }[], place: number, state: PassState): string[] {
  const out: string[] = [];
  for (const { id, bottom } of steps) {
    if (state.told.has(id)) continue;
    if (bottom >= place) {
      state.seen.add(id);
      continue;
    }
    if (state.seen.has(id)) {
      state.told.add(id);
      out.push(id);
    }
  }
  return out;
}
