// The glide the player's words take (components/player/LiveCaptions.tsx):
// the house curve the script drives the box's scroll on, and the pace of the
// glide they take when they wake (Updates 75). Kept here, not in the
// component, so a unit test holds it (lib/player/__tests__/wordsWake.test.ts).

/** cubic-bezier(0.22, 1, 0.36, 1), the house curve (--ease-house), for the scroll the script drives. */
export function houseEase(p: number): number {
  const cx = 0.66;
  const bx = 3 * (0.36 - 0.22) - cx;
  const ax = 1 - cx - bx;
  const cy = 3;
  const by = -3;
  const ay = 1;
  let t = p;
  for (let i = 0; i < 8; i++) {
    const x = ((ax * t + bx) * t + cx) * t - p;
    const dx = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(x) < 1e-5 || dx === 0) break;
    t -= x / dx;
  }
  t = Math.min(1, Math.max(0, t));
  return ((ay * t + by) * t + cy) * t;
}

/** The most a frame counts for in the wake's glide: two frames at 60Hz (lib/profile/cardSteps.ts, SHORT_FRAME_MS). */
export const WAKE_FRAME_MS = 34;

/**
 * The clock of the glide the words take when they wake: the share of a glide
 * of `ms` run at each frame, from the times its frames are given. The first
 * frame stands at the start, and no frame counts for more than WAKE_FRAME_MS,
 * so a long frame (the wake's own on a phone's CPU, where a sheet is dropped
 * and the rows are drawn again) carries no more of the way than two short
 * ones would. The house curve covers under two fifths of a glide in 34ms
 * (houseEase(34 / 520) is 0.28), so no frame carries half of it, however long.
 * A clock that ran through the wake's frame put most of the way into it.
 */
export function wakeClock(ms: number, cap: number = WAKE_FRAME_MS): (now: number) => number {
  let ran = 0;
  let last: number | null = null;
  return (now) => {
    if (last !== null) ran += Math.min(cap, Math.max(0, now - last));
    last = now;
    return Math.min(1, ran / ms);
  };
}

/**
 * Whether `el` can be seen: neither it nor anything it stands in is at
 * opacity 0. Now Playing's Words panel stands at 0 while its view is Cover,
 * and is still at 0 as it is chosen again, before its fade begins: words
 * woken there are placed at once, unseen, and fade in where they belong.
 */
export function seen(el: Element | null): boolean {
  for (let node = el; node; node = node.parentElement) if (getComputedStyle(node).opacity === "0") return false;
  return true;
}
