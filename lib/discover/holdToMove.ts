/**
 * What a finger on one of Discover's doors means (1.9, build 95 note 9).
 *
 * A tap opens the door, as it always has. A finger that moves before the
 * hold is the page's scroll, as it always has. A finger that rests for the
 * house's hold (400 ms, the verse's own, lib/bible/verseGesture.ts) lifts the
 * door with a tick in the hand; from then the door follows the finger, the
 * doors it passes step aside, and each change of place is another tick. When
 * the finger lifts, the door goes down into its new place and the order is
 * kept (./doorOrder.ts).
 *
 * The gesture is a little machine, `press`, from what happened (an event) to
 * what the list does (its effects). No DOM and no clock in it: the list
 * (components/discover/DoorOrder.tsx) measures, times and draws, and this
 * decides. So every rule a reader would notice is tested in plain node: a tap
 * still opens, a scroll still scrolls, the hold lifts with one tick, there is
 * one tick per change of place and none between, and the drop lands where the
 * door was shown (lib/discover/__tests__/holdToMove.test.ts).
 */

import { LONG_PRESS_MS, SCROLL_SLOP_PX } from "@/lib/bible/verseGesture";

/** How long a finger rests on a door before it lifts: the house's hold. */
export const HOLD_MS = LONG_PRESS_MS;
/** How far a finger may drift before the hold and still be holding, in CSS px. */
export const HOLD_SLOP_PX = SCROLL_SLOP_PX;

/** Where each door stands on the page (its top, from the page's top) and how tall it is, taken at the lift. */
export type Rows = { tops: readonly number[]; heights: readonly number[] };

export type Press =
  | { phase: "idle" }
  /** A finger is down on door `door`, at x, y on the screen, and the hold's clock runs. */
  | { phase: "pressing"; door: number; x: number; y: number }
  /** Door `door` is lifted and over place `to`; the finger was at `pageY` on the page when it lifted. */
  | { phase: "held"; door: number; to: number; pageY: number; rows: Rows }
  /** The finger lifted and the door is going down into its place: nothing new starts until it is there. */
  | { phase: "landing" }
  /** The touch is the page's (a scroll, or the stop of a glide): nothing more until it lifts. */
  | { phase: "passed" };

export type PressEvent =
  /** A finger down on door `door`. `gliding`: the page was still moving from a swipe. */
  | { type: "down"; door: number; x: number; y: number; gliding: boolean }
  /** The finger moved: x, y on the screen, and its height on the page (y plus the page's scroll). */
  | { type: "move"; x: number; y: number; pageY: number }
  /** The hold's time has come. The doors are measured now, and the finger's height on the page. */
  | { type: "hold"; rows: Rows; pageY: number }
  /** The page moved under a finger that is not holding a door. */
  | { type: "scroll" }
  | { type: "up" }
  | { type: "cancel" }
  /** The door has gone down into its place. */
  | { type: "landed" };

export type PressEffect =
  /** Start the hold's clock. */
  | { type: "arm" }
  /** Stop it. */
  | { type: "disarm" }
  /** Door `door` rises from the page, with a tick in the hand. */
  | { type: "lift"; door: number }
  /** The held door, `dy` from its own place, under the finger. */
  | { type: "follow"; dy: number }
  /** The held door is over place `to`: the doors step aside for it, with a tick. */
  | { type: "place"; to: number }
  /** The finger lifted: the door goes down into place `to` (its own, `from`, when nothing changed). */
  | { type: "land"; from: number; to: number }
  /** A quick touch: the door opens, as a tap always did. */
  | { type: "tap" };

export const IDLE: Press = { phase: "idle" };

/** The next state of the gesture, and what the list does about it. */
export function press(state: Press, event: PressEvent): [Press, PressEffect[]] {
  switch (state.phase) {
    case "idle":
      if (event.type !== "down") return [state, []];
      // A touch that stops a glide is the scroll's, never a hold (build 88
      // note 2's rule, lib/bible/verseGesture.ts).
      if (event.gliding) return [{ phase: "passed" }, []];
      return [{ phase: "pressing", door: event.door, x: event.x, y: event.y }, [{ type: "arm" }]];

    case "pressing":
      switch (event.type) {
        case "move":
          if (Math.hypot(event.x - state.x, event.y - state.y) > HOLD_SLOP_PX) return [{ phase: "passed" }, [{ type: "disarm" }]];
          return [state, []];
        case "scroll":
          return [{ phase: "passed" }, [{ type: "disarm" }]];
        case "hold":
          return [{ phase: "held", door: state.door, to: state.door, pageY: event.pageY, rows: event.rows }, [{ type: "lift", door: state.door }]];
        case "up":
          return [IDLE, [{ type: "disarm" }, { type: "tap" }]];
        case "cancel":
          return [IDLE, [{ type: "disarm" }]];
        default:
          return [state, []];
      }

    case "held":
      switch (event.type) {
        case "move": {
          const dy = withinList(state.rows, state.door, event.pageY - state.pageY);
          const to = landingIndex(state.rows, state.door, dy, state.to);
          // One click for a change of place. A finger fast enough to cross
          // two places between two moves gets one: the phone could not part
          // two clicks that close (lib/ui/scrollTicks.ts, MIN_GAP_MS).
          const effects: PressEffect[] = [{ type: "follow", dy }];
          if (to !== state.to) effects.push({ type: "place", to });
          return [{ ...state, to }, effects];
        }
        case "up":
          return [{ phase: "landing" }, [{ type: "land", from: state.door, to: state.to }]];
        case "cancel":
          // A touch the phone took away (a call, the app sent to the back):
          // the door goes back to its own place, and nothing is kept.
          return [{ phase: "landing" }, [{ type: "land", from: state.door, to: state.door }]];
        default:
          return [state, []];
      }

    case "landing":
      return event.type === "landed" ? [IDLE, []] : [state, []];

    case "passed":
      return event.type === "up" || event.type === "cancel" ? [IDLE, []] : [state, []];
  }
}

// ── The arithmetic of a move ────────────────────────────────────────────

/**
 * How far past a place's line the held door has to go before it takes the
 * place, or gives it back: a finger that trembles on the line does not flick
 * a door back and forth, nor click on every flick.
 */
export const PLACE_SLACK_PX = 6;

/**
 * The place the held door would land in, `dy` from its own place, while it
 * stands over place `current`. It takes a door's place once it covers half of
 * that door: going down, once its foot passes the door's middle; going up,
 * once its top does (the way a phone's own lists give way). Held at either end
 * of the list (withinList), it covers the end door whole, so the end place is
 * always reached.
 */
export function landingIndex(rows: Rows, from: number, dy: number, current = from, slack = PLACE_SLACK_PX): number {
  const next = placeFor(rows, from, dy);
  if (next > current) return Math.max(current, placeFor(rows, from, dy - slack));
  if (next < current) return Math.min(current, placeFor(rows, from, dy + slack));
  return current;
}

/** The place the held door covers `dy` from its own, with no slack. */
function placeFor(rows: Rows, from: number, dy: number): number {
  const { tops, heights } = rows;
  const top = tops[from] + dy;
  const foot = top + heights[from];
  for (let i = 0; i < from; i++) if (top <= tops[i] + heights[i] / 2) return i;
  for (let i = tops.length - 1; i > from; i--) if (foot >= tops[i] + heights[i] / 2) return i;
  return from;
}

/**
 * How far the held door may go from its own place: no higher than the first
 * door's top and no lower than the last door's foot. The finger may go on,
 * past the list; the door stays with the list, over no other part of the page.
 */
export function withinList(rows: Rows, door: number, dy: number): number {
  const { tops, heights } = rows;
  const last = tops.length - 1;
  const highest = tops[0] - tops[door];
  const lowest = tops[last] + heights[last] - (tops[door] + heights[door]);
  return Math.min(lowest, Math.max(highest, dy));
}

/** The space between two doors, as the list lays them out. */
export function gapOf(rows: Rows): number {
  return rows.tops.length > 1 ? Math.max(0, rows.tops[1] - (rows.tops[0] + rows.heights[0])) : 0;
}

/** How far door `i` stands aside while the door from `from` is over place `to`. */
export function shiftOf(rows: Rows, i: number, from: number, to: number): number {
  const step = rows.heights[from] + gapOf(rows);
  if (from < to && i > from && i <= to) return -step;
  if (from > to && i >= to && i < from) return step;
  return 0;
}

/** How far the held door travels from its own place to land in place `to`. */
export function landingOffset(rows: Rows, from: number, to: number): number {
  const { tops, heights } = rows;
  if (to > from) return tops[to] + heights[to] - (tops[from] + heights[from]);
  if (to < from) return tops[to] - tops[from];
  return 0;
}

/** How near an edge of the screen the finger brings the page along with it. */
export const EDGE_PX = 72;
/** The page's fastest, in CSS px a frame, with the finger at the very edge. */
export const EDGE_MAX_PX = 16;

/**
 * How far the page scrolls this frame with the finger at `y` on the screen,
 * between `top` (the foot of the bar at the top) and `bottom` (the top of the
 * tab bar): nothing in the middle, faster the nearer the edge, up or down.
 */
export function edgeSpeed(y: number, top: number, bottom: number): number {
  const depth = (into: number) => Math.max(1, Math.round(EDGE_MAX_PX * Math.min(1, into / EDGE_PX)));
  if (y < top + EDGE_PX) return -depth(top + EDGE_PX - y);
  if (y > bottom - EDGE_PX) return depth(y - (bottom - EDGE_PX));
  return 0;
}
