/**
 * The prayers' scroll, its sums (1.9): kept here, pure, so the tests can hold
 * them without a browser. The hooks that measure the page are
 * components/prayers/service/useEasyScroll.ts (the click as each new prayer
 * arrives), useLitLine.ts (the verse at the reading place lit) and
 * usePassedSteps.ts (each prayer counted as it is passed).
 *
 * Easy Scroll (build 89 note 7, his name for it; by the verse from build 90
 * note 6) snapped the page to each prayer and then to each verse, with the
 * browser's own scroll snapping. Build 93 note 2 found it fighting the
 * finger, measured on the export: it was taken out (useEasyScroll.ts says
 * how), and with it the rests it placed. The page scrolls as the phone does.
 *
 * Every measure is in the same frame of reference as the reading place
 * (lib/ui/readingPlace.ts): pixels from the top of the screen, or from the top
 * of the page when the caller adds the scroll to both sides.
 */

/** How near the reading place a prayer's first line counts as standing on it. */
export const ON_PLACE_PX = 3;

/**
 * The prayer standing at the reading place: the one whose box holds it, or
 * null where none does (the head of the page, its foot, a gap between two).
 */
export function prayerAt(steps: readonly { id: string; top: number; bottom: number }[], place: number): string | null {
  for (const { id, top, bottom } of steps) if (top <= place && place < bottom) return id;
  return null;
}

/**
 * Whether the hand feels the click (build 89 note 7, his "haptic feedback
 * when they scroll to each section"): only when the prayer now at the reading
 * place is a new one, never for another verse of the same prayer, and never
 * for the head or the foot of the page, where none stands.
 */
export function clicksFor(arrived: string | null, now: string | null): boolean {
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
