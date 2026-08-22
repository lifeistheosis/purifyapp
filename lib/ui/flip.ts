/**
 * FLIP, for lists whose order changes.
 *
 * First, Last, Invert, Play. Measure where the rows are, let React reorder the
 * DOM, measure where they landed, transform each one back to where it started,
 * then release the transform so the browser animates it home.
 *
 * WHY FLIP RATHER THAN A CSS TRANSITION. A transition on `top` or on a grid
 * row cannot animate a DOM reorder at all: React moves the node, the browser
 * paints it at its new position, and there is nothing in between to interpolate.
 * FLIP animates `transform` only, which is the one property that moves a row
 * without touching layout, so a table with fifty rows does not relayout on
 * every frame of the animation.
 *
 * NO requestAnimationFrame. The usual recipe waits a frame between inverting
 * and playing, which fails in any environment that does not composite: the
 * callback never fires, the inverse transform is never released, and every row
 * is left visually stuck at its old position. Reading `offsetHeight` forces a
 * synchronous style flush instead, which is what actually makes the browser
 * commit the inverted transform as a starting value. It costs one reflow and
 * it works everywhere.
 *
 * Reduced motion is honoured by skipping the animation entirely rather than
 * shortening it. A user who asked for no motion wants the row to BE in its new
 * place, not to get there quickly.
 */

import { prefersReducedMotion } from "@/lib/ui/motion";

export type FlipSnapshot = Map<string, number>;

/** Where every keyed row currently sits, in viewport coordinates. */
export function measureRows(
  container: HTMLElement | null,
  attr = "data-flip-key",
): FlipSnapshot {
  const out: FlipSnapshot = new Map();
  if (!container) return out;
  for (const el of Array.from(container.querySelectorAll<HTMLElement>(`[${attr}]`))) {
    const key = el.getAttribute(attr);
    if (key) out.set(key, el.getBoundingClientRect().top);
  }
  return out;
}

/**
 * Animate every row from where the snapshot says it was to where it is now.
 *
 * Returns the number of rows that actually moved, which is what a caller
 * asserts on in a test: an animation that ran over zero moved rows is a
 * reorder that silently did nothing.
 */
export function playFlip(
  container: HTMLElement | null,
  before: FlipSnapshot,
  opts: { durationMs?: number; easing?: string; attr?: string } = {},
): number {
  const attr = opts.attr ?? "data-flip-key";
  if (!container || before.size === 0) return 0;

  // The repo's helper, not a hand-rolled matchMedia. It is the mandated entry
  // point for anything JavaScript drives, and it already handles the absent
  // matchMedia of a server render.
  if (prefersReducedMotion()) return 0;

  const rows = Array.from(container.querySelectorAll<HTMLElement>(`[${attr}]`));
  const moved: { el: HTMLElement; delta: number }[] = [];

  for (const el of rows) {
    const key = el.getAttribute(attr);
    if (!key) continue;
    const wasTop = before.get(key);
    if (wasTop === undefined) continue;
    const delta = wasTop - el.getBoundingClientRect().top;
    // Sub-pixel deltas are rounding noise from a scroll offset, not movement.
    if (Math.abs(delta) < 1) continue;
    moved.push({ el, delta });
  }

  if (moved.length === 0) return 0;

  // INVERT. Put every row back where it came from, with no transition, so the
  // jump is never painted.
  //
  // data-flipping is not decoration. A transformed element becomes the
  // containing block for any position: sticky descendant, and admin tables pin
  // their first cell below 1024px so a horizontally scrolled row stays
  // identifiable. Without this flag the pinned cell would detach and slide
  // during every reorder on a phone. The CSS it drives suspends the pin for
  // exactly as long as the row is transformed, and no row is transformed at
  // rest.
  for (const { el, delta } of moved) {
    el.setAttribute("data-flipping", "");
    el.style.transition = "none";
    el.style.transform = `translateY(${delta}px)`;
  }

  // Force the style flush that commits those transforms as the starting value.
  // Without this the browser coalesces the invert and the play into a single
  // computation and nothing animates.
  void container.offsetHeight;

  // PLAY.
  const duration = opts.durationMs ?? 220;
  const easing = opts.easing ?? "cubic-bezier(0.2, 0.8, 0.2, 1)";
  for (const { el } of moved) {
    el.style.transition = `transform ${duration}ms ${easing}`;
    el.style.transform = "";
    const clear = () => {
      el.style.transition = "";
      el.removeAttribute("data-flipping");
      el.removeEventListener("transitionend", clear);
    };
    el.addEventListener("transitionend", clear);
    // A belt for the case where transitionend never fires, which happens if
    // the row is unmounted or the tab is backgrounded mid-animation. Leaving
    // data-flipping set would strand the sticky pin off.
    window.setTimeout(clear, duration + 80);
  }

  return moved.length;
}

/**
 * Move one item of an array to another index, returning a new array.
 *
 * Clamped rather than throwing, because both call sites are a button that can
 * be pressed at the end of a list and a drag that can end past the last row.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  if (from < 0 || from >= next.length) return next;
  const target = Math.max(0, Math.min(next.length - 1, to));
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}
