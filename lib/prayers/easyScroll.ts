/**
 * Easy Scroll's sums (1.9, build 89 note 7, his name for it): kept here, pure,
 * so the tests can hold them without a browser. The gesture itself is the
 * phone's own scroll snapping (app/globals.css, "Easy Scroll"); the hooks that
 * measure the page are components/prayers/service/useEasyScroll.ts and
 * usePassedSteps.ts.
 *
 * Every measure is in the same frame of reference as the reading place
 * (lib/ui/readingPlace.ts): pixels from the top of the screen, or from the top
 * of the page when the caller adds the scroll to both sides.
 */

/** How near the reading place a prayer's first line counts as standing on it. */
export const ON_PLACE_PX = 3;

/**
 * A prayer that stops at its end too: with its first line at the reading
 * place, its end lies below the foot of what the reader can see. A swipe
 * then carries the reader through it freely and settles at its end before the
 * next swipe moves on, so no line of a long prayer is skipped.
 */
export function isTall(firstLineTop: number, bottom: number, place: number, bandBottom: number): boolean {
  return bottom - firstLineTop > bandBottom - place + 1;
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

/** The prayer whose first line stands at the reading place, or null. */
export function stepAtPlace(starts: readonly { id: string; top: number }[], place: number, slack: number = ON_PLACE_PX): string | null {
  for (const { id, top } of starts) if (Math.abs(top - place) <= slack) return id;
  return null;
}
