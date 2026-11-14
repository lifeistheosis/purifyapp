// How the profile-open walk judges the card's height between painted frames
// (scripts/profile-open-walk.mjs, build 97 note 6). Kept here, not in the
// walk, so a unit test holds it (lib/profile/__tests__/cardSteps.test.ts).
//
// The card's height follows what arrives on the house curve, 380ms
// (useDraggableSheet, smoothHeight). That curve starts fast: in the first
// 34ms (two frames at 60Hz) it covers under two fifths of the way, so a frame
// that comes that soon after the one before it never carries half of a
// growth while the hand-over runs, whatever the CPU. A long frame can (the
// walk slows the CPU four times, and a 66ms frame carried 90 of 210px), so a
// long frame is not judged here: a growth in fewer than three frames is
// (the walk's own check).

/** A painted frame: when (ms from the tap) and the card's height in px. */
export type CardFrame = { t: number; h: number };

/** A frame no later than this after the one before it is a short one: two frames at 60Hz. */
export const SHORT_FRAME_MS = 34;

/** A change of the card's height a reader follows: smaller ones are not judged. */
export const GROWTH_PX = 100;

export type CardJump = { at: number; step: number; growth: number };

/**
 * Every short frame in which the card's height moved more than half of its
 * whole change from the first frame given to the last: a jump, eased or not
 * around it. Updates 66 read one in 2 of 3 runs (566, 776, 566px, then eased
 * up) that the walk passed, since it fails only a growth in under 3 frames.
 */
export function oneFrameJumps(frames: readonly CardFrame[]): CardJump[] {
  if (frames.length < 2) return [];
  const growth = frames[frames.length - 1].h - frames[0].h;
  if (Math.abs(growth) <= GROWTH_PX) return [];
  const jumps: CardJump[] = [];
  for (let i = 1; i < frames.length; i++) {
    const step = frames[i].h - frames[i - 1].h;
    if (frames[i].t - frames[i - 1].t <= SHORT_FRAME_MS && Math.abs(step) > Math.abs(growth) / 2) jumps.push({ at: frames[i].t, step, growth });
  }
  return jumps;
}
