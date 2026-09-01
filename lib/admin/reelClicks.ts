// When each digit passes the window on a spinning reel.
//
// The reel is animated by CSS, not by JavaScript: one transform from 0 to its
// resting digit over `durationMs`, shaped by a cubic-bezier. So nothing in JS
// observes a digit going past, and a click per digit cannot be fired from a
// frame loop without either drifting from the animation or pinning a rAF to
// every reel on screen.
//
// It does not need observing. The curve is known, so the crossings can be
// solved for ahead of time and the whole run scheduled on the audio clock in
// one go, which is also the only way the clicks land accurately: WebAudio
// schedules on its own clock, ahead of time, and is not subject to the main
// thread stalling for a poll or a render.
//
// THE MATHS. A CSS cubic-bezier(x1, y1, x2, y2) is a parametric curve in s,
// not a function of time. X(s) is the time axis and Y(s) is the progress
// axis, both with implicit endpoints at 0 and 1:
//
//   X(s) = 3(1-s)^2 s x1 + 3(1-s) s^2 x2 + s^3
//   Y(s) = 3(1-s)^2 s y1 + 3(1-s) s^2 y2 + s^3
//
// The reel travels `restIndex` digit positions, so digit k passes the window
// when progress Y = k / restIndex. Solve Y(s) = k/restIndex for s, then the
// time of that crossing is X(s) * durationMs.
//
// Binary search rather than a closed form. Y is monotonic for any easing CSS
// accepts, forty iterations is exact to well under a millisecond, and this
// runs once per reel per spin rather than per frame.

/** The curve the reel actually uses. Keep in step with Odometer.tsx. */
export const REEL_EASING = { x1: 0.12, y1: 0.62, x2: 0.15, y2: 1 } as const;

function bezier(s: number, a: number, b: number): number {
  const u = 1 - s;
  return 3 * u * u * s * a + 3 * u * s * s * b + s * s * s;
}

/** s such that Y(s) = y, for a monotonic easing. */
function solveForProgress(y: number, y1: number, y2: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (bezier(mid, y1, y2) < y) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Offsets in milliseconds, from the start of the spin, at which a digit
 * arrives in the window.
 *
 * One per digit crossed, so a reel resting on index 24 clicks 24 times: fast
 * and even at the start, stretching out as the curve decelerates, and the last
 * few audibly apart as it settles. That spacing is the whole effect, and it
 * falls out of the easing rather than being faked with a ramp.
 *
 * The crossing at k = 0 is not a click. It is where the reel already is when
 * the animation starts, so firing there would put a click at time zero on
 * every reel at once, which reads as one loud clack rather than a spin.
 */
export function clickTimes(restIndex: number, durationMs: number): number[] {
  if (!Number.isFinite(restIndex) || restIndex <= 0) return [];
  if (!Number.isFinite(durationMs) || durationMs <= 0) return [];
  const { x1, y1, x2, y2 } = REEL_EASING;
  const out: number[] = [];
  for (let k = 1; k <= restIndex; k++) {
    const s = solveForProgress(k / restIndex, y1, y2);
    out.push(bezier(s, x1, x2) * durationMs);
  }
  return out;
}

/**
 * Gain for a click this far through the spin.
 *
 * A real ratchet is loudest while the reel is travelling and softens as it
 * brakes. Flat gain across thirty clicks reads as a machine gun; this reads as
 * a wheel slowing down. Also keeps the total energy of a five reel spin from
 * being five times a single reel's, which is what makes a wall of noise.
 */
export function clickGain(index: number, total: number): number {
  if (total <= 1) return 0.5;
  const through = index / (total - 1);
  return 0.5 - 0.34 * through;
}
