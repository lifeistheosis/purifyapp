// A held screen, woken once its language is settled (Updates 88, 1.9).
//
// The hold (components/i18n/LaunchLanguageGate.tsx, RouteLanguageHold) keeps the
// router's move to a screen suspended while the reader's language is not settled,
// so the front door stays under the launch slate and the screen is drawn once, in
// the reader's words. React tries a suspended move again when the promise it waited
// on resolves. But an update that lands while the move is suspended with delay marks
// it suspended again and forgets that it was told (react-dom's scheduleUpdateOnFiber
// and markRootSuspended), and a resolved promise never tells twice, so the move was
// tried again only by some later update. Measured on the export at 390x844 with the
// processor slowed four times, Saints opened cold in Arabic sat 1.7 to 1.9 s after its
// language had settled, until an unrelated timer's update started it
// (docs/handoffs/updates-87.md, updates-88.md).
//
// So once the language is settled, and only if a screen was held, the hold is woken:
// an update of its own, in a later task, that draws nothing. Any update clears React's
// suspended marks, so the held move is tried with it. It is a transition, as the
// move is, so it never interrupts the screen's own render. If the screen is still not
// drawn, it is woken again, a few times at most, then left to React as before.

/** The most wakes a held screen is given. One that lands just after another update can be spent. */
export const HELD_SCREEN_WAKES = 3;
/** The gap between two wakes: time for the first to be drawn. */
export const HELD_SCREEN_WAKE_GAP_MS = 120;

type Later = (fn: () => void, ms: number) => unknown;

let wake: (() => void) | null = null;
let held = false;
let drawn = false;
let started = false;
let left = HELD_SCREEN_WAKES;

/** The hold's own update, handed in by the committed hold. Returns its removal. */
export function attachHeldScreenWake(fn: () => void): () => void {
  wake = fn;
  return () => {
    if (wake === fn) wake = null;
  };
}

/** A render of a screen was held for its language. */
export function heldScreenHeld(): void {
  held = true;
}

/** A screen was committed, so there is nothing left to wake. */
export function heldScreenDrawn(): void {
  drawn = true;
}

/**
 * Called once the language is settled. If a screen was held and is not drawn, it
 * is woken in a later task, and again after a gap while it is still not drawn, up
 * to HELD_SCREEN_WAKES times. Nothing happens when nothing was held.
 */
export function wakeHeldScreen(later: Later = (fn, ms) => setTimeout(fn, ms)): void {
  if (started || !held || drawn) return;
  started = true;
  const step = () => {
    if (drawn || left <= 0) return;
    left -= 1;
    wake?.();
    later(step, HELD_SCREEN_WAKE_GAP_MS);
  };
  later(step, 0);
}

/** For tests: as a page that has only just loaded. */
export function forgetHeldScreenWakeForTests(): void {
  wake = null;
  held = false;
  drawn = false;
  started = false;
  left = HELD_SCREEN_WAKES;
}
