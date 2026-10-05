/**
 * The finger that opened a pill must not be the one that closes it.
 *
 * Purify's hold pills (a verse's tools, the Copy pill) appear while the
 * finger is still on the glass. When it lifts, a browser may deliver that
 * lift as a tap on whatever is now under it, and what is under it is the
 * pill's own backdrop, whose job is to dismiss on a tap. Seen on the 1.5.2
 * export with real touch events: touchstart, the pill at 400 ms, touchend at
 * 900 ms, and the pill gone again before it could be read. A phone that turns
 * a long hold into its own context menu swallows that tap and never showed
 * it; one that does not, would.
 *
 * So a tap that arrives within a moment of a finger lifting is the lift, and
 * is ignored: by the backdrop, and by the pill's buttons too, since a hold
 * near the foot of the screen lifts on top of one of them.
 *
 * `noteLift` is called from a touchend or touchcancel listener; `isLift`
 * answers for a tap happening now. Kept as plain functions over a clock that
 * is passed in, so they are tested without a browser.
 */

/** How soon after a finger lifts a tap is still that lift. */
export const LIFT_MS = 350;

export type LiftGuard = {
  /** A finger has lifted. Only the first lift after `reset` counts. */
  noteLift: (now?: number) => void;
  /** True when a tap at `now` is the lift, not a tap of its own. */
  isLift: (now?: number) => boolean;
  /** A new pill is up: forget the last one's lift. */
  reset: () => void;
};

export function createLiftGuard(): LiftGuard {
  let liftedAt: number | null = null;
  return {
    noteLift: (now = Date.now()) => {
      if (liftedAt === null) liftedAt = now;
    },
    isLift: (now = Date.now()) => liftedAt !== null && now - liftedAt < LIFT_MS,
    reset: () => {
      liftedAt = null;
    },
  };
}
