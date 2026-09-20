/**
 * The arithmetic behind the admin Select, pulled out so it can be tested.
 *
 * vitest runs in a node environment with no DOM (vitest.config.ts), so the
 * component itself cannot be exercised there. What can be is everything that
 * decides WHERE the cursor goes and WHERE the menu opens, which is also where
 * a listbox usually goes wrong: a cursor that lands on a disabled row, a
 * type-ahead that cannot reach the second "S" option, a menu that opens off
 * the bottom of a phone.
 */

export type ListboxItem = { label: string; hint?: string; disabled?: boolean };

/**
 * The next enabled index from `from`, walking `step` rows at a time.
 *
 * `from` may be -1 (nothing active yet). Moving past either end clamps to the
 * last enabled row in that direction rather than wrapping: a select that wraps
 * sends ArrowDown on the last row back to the top, which reads as the menu
 * jumping. Returns -1 only when nothing is enabled at all.
 */
export function stepEnabled(items: readonly ListboxItem[], from: number, step: number): number {
  if (items.length === 0 || step === 0) return from;
  const dir = step > 0 ? 1 : -1;
  let target = from < 0 ? (dir > 0 ? -1 : items.length) : from;
  let moved = 0;
  let lastGood = from >= 0 && !items[from]?.disabled ? from : -1;
  while (moved < Math.abs(step)) {
    target += dir;
    if (target < 0 || target >= items.length) break;
    if (items[target].disabled) continue;
    lastGood = target;
    moved += 1;
  }
  // Nothing enabled on the way: the far enabled row in the direction of travel
  // is the closest thing to what was asked for.
  return lastGood >= 0 ? lastGood : edgeEnabled(items, dir > 0 ? "last" : "first");
}

/** The first or last enabled index, or -1. */
export function edgeEnabled(items: readonly ListboxItem[], edge: "first" | "last"): number {
  if (edge === "first") {
    for (let i = 0; i < items.length; i++) if (!items[i].disabled) return i;
  } else {
    for (let i = items.length - 1; i >= 0; i--) if (!items[i].disabled) return i;
  }
  return -1;
}

/** Lowercased, accents off, so "Theotokos" matches "théo" and "Saint" matches "saint". */
export function fold(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Type-ahead: the row a burst of keystrokes points at.
 *
 * Starts looking AFTER `from`, so pressing S twice walks from "Saints" to
 * "Sets & Collections" instead of finding "Saints" again. A buffer made of one
 * repeated letter ("sss") is treated as that letter, which is what makes the
 * repeated press cycle. Emoji and other leading marks are skipped, since a
 * label that opens with a flag or a dot should still answer to its first word.
 */
export function typeahead(items: readonly ListboxItem[], buffer: string, from: number): number {
  const raw = fold(buffer);
  if (!raw) return -1;
  const needle = /^(.)\1+$/u.test(raw) ? raw[0] : raw;
  const n = items.length;
  for (let k = 1; k <= n; k++) {
    const i = (Math.max(from, -1) + k + n) % n;
    const item = items[i];
    if (item.disabled) continue;
    const label = fold(item.label).replace(/^[^\p{L}\p{N}]+/u, "");
    if (label.startsWith(needle)) return i;
  }
  return -1;
}

/** The rows a filter query keeps, matched on the label and the hint. */
export function filterItems<T extends ListboxItem>(items: readonly T[], query: string): T[] {
  const q = fold(query.trim());
  if (!q) return [...items];
  return items.filter((it) => fold(`${it.label} ${it.hint ?? ""}`).includes(q));
}

export type Placement = {
  side: "below" | "above";
  /** Viewport px. `top` is set when opening below, `bottom` when above. */
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  /** True when this is the phone sheet rather than a menu on its trigger. */
  sheet?: boolean;
};

/**
 * The phone shape: a sheet across the bottom, above the keyboard.
 *
 * Anchoring to the trigger is right with a mouse and wrong with a thumb. On a
 * phone the trigger is often in the lower half, which leaves a menu 100px
 * tall holding 700px of options, and the filter box on a long list opens the
 * keyboard straight over it. Reported 2026-09-19 as "the selectors are not
 * scrollable on tablet or phone": the list was scrollable, there was just
 * nowhere to scroll it.
 *
 * So on a coarse pointer the menu leaves its trigger and sits above the
 * keyboard, as wide as the screen allows and as tall as two thirds of what is
 * visible. `keyboard` is how much of the layout viewport the on-screen
 * keyboard covers (window.innerHeight minus visualViewport.height), so the
 * sheet rides up with it instead of hiding behind it.
 */
export function placeSheet(input: {
  viewport: { width: number; height: number };
  /** Pixels of the viewport the keyboard covers, 0 when it is closed. */
  keyboard?: number;
  margin?: number;
  /** Never taller than this, however big the screen. */
  cap?: number;
}): Placement {
  const margin = input.margin ?? 8;
  const keyboard = Math.max(0, input.keyboard ?? 0);
  const cap = input.cap ?? 420;
  const visible = Math.max(0, input.viewport.height - keyboard);
  return {
    side: "above",
    bottom: keyboard + margin,
    left: margin,
    width: Math.max(0, input.viewport.width - margin * 2),
    // Two thirds of what the reader can actually see, and never so short that
    // it cannot hold two rows.
    maxHeight: Math.max(120, Math.min(cap, Math.round(visible * 0.66))),
    sheet: true,
  };
}

/**
 * Where the menu opens, from the trigger's box and the viewport.
 *
 * Below by default. Above only when below cannot fit `want` px AND above has
 * more room, because a menu that flips up on a trigger with 200px under it is
 * a menu that moves every time the page scrolls a little. Width is at least the
 * trigger's and never wider than the viewport minus the margin; the left edge
 * is pulled back in when a wide menu would run off the right side.
 */
export function placeMenu(input: {
  trigger: { top: number; bottom: number; left: number; width: number };
  viewport: { width: number; height: number };
  want: number;
  minWidth?: number;
  maxWidth?: number;
  gap?: number;
  margin?: number;
  align?: "start" | "end";
}): Placement {
  const gap = input.gap ?? 6;
  const margin = input.margin ?? 8;
  const { trigger, viewport } = input;
  const room = Math.max(0, viewport.width - margin * 2);
  const width = Math.min(
    room,
    Math.max(trigger.width, input.minWidth ?? 0),
    Math.max(trigger.width, input.maxWidth ?? Number.POSITIVE_INFINITY),
  );
  const rawLeft = input.align === "end" ? trigger.left + trigger.width - width : trigger.left;
  const left = Math.min(Math.max(margin, rawLeft), Math.max(margin, viewport.width - margin - width));

  const below = viewport.height - trigger.bottom - gap - margin;
  const above = trigger.top - gap - margin;
  const flip = below < input.want && above > below;
  if (flip) {
    return {
      side: "above",
      bottom: viewport.height - trigger.top + gap,
      left,
      width,
      maxHeight: Math.max(96, Math.min(input.want, above)),
    };
  }
  return {
    side: "below",
    top: trigger.bottom + gap,
    left,
    width,
    maxHeight: Math.max(96, Math.min(input.want, below)),
  };
}
