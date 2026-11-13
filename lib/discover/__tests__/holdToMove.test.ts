// What a finger on one of Discover's doors means (1.9, build 95 note 9; lib/discover/holdToMove.ts).
//
// His word, 2026-11-13: "allow the user to hold down each section and the
// haptic feedback hits and they can move each section according to their
// wants (and every time it switches a section a haptic feedback hits)".
// What a reader would notice if this broke: a tap that no longer opens a
// door, a page that will not scroll from a door, a hold with no tick or two,
// a click missing at a change of place or one between places, a door that
// lands somewhere other than where it was shown, or that slides back and
// forth as it lands.

import { describe, expect, it } from "vitest";

import { moveDoor } from "@/lib/discover/doorOrder";
import {
  EDGE_MAX_PX,
  EDGE_PX,
  HOLD_MS,
  HOLD_SLOP_PX,
  IDLE,
  PLACE_SLACK_PX,
  edgeSpeed,
  landingIndex,
  landingOffset,
  press,
  shiftOf,
  withinList,
  type Press,
  type PressEffect,
  type PressEvent,
  type Rows,
} from "@/lib/discover/holdToMove";
import { LONG_PRESS_MS, SCROLL_SLOP_PX } from "@/lib/bible/verseGesture";

/** Discover's twelve bands as a phone lays them out: 96px tall, 10px apart, the first 100px down the page. */
const ROWS: Rows = { tops: Array.from({ length: 12 }, (_, i) => 100 + i * 106), heights: Array(12).fill(96) };

/** Run events through the gesture, and gather what it did. */
function play(events: PressEvent[], from: Press = IDLE): { state: Press; effects: PressEffect[] } {
  let state = from;
  const effects: PressEffect[] = [];
  for (const event of events) {
    const [next, out] = press(state, event);
    state = next;
    effects.push(...out);
  }
  return { state, effects };
}

const kinds = (effects: PressEffect[]) => effects.map((e) => e.type);
const down = (door: number, y = 150, x = 120): PressEvent => ({ type: "down", door, x, y, gliding: false });
const move = (y: number, x = 120, scroll = 0): PressEvent => ({ type: "move", x, y, pageY: y + scroll });
const hold = (pageY = 150): PressEvent => ({ type: "hold", rows: ROWS, pageY });

describe("a finger on a door", () => {
  it("holds for the house's hold, as a verse does", () => {
    expect(HOLD_MS).toBe(LONG_PRESS_MS);
    expect(HOLD_MS).toBe(400);
    expect(HOLD_SLOP_PX).toBe(SCROLL_SLOP_PX);
  });

  it("opens the door on a tap: nothing lifts and nothing stands in the tap's way", () => {
    const { state, effects } = play([down(2), up()]);
    expect(kinds(effects)).toEqual(["arm", "disarm", "tap"]);
    expect(state).toEqual(IDLE);
  });

  it("opens the door on a tap that drifts a little, as a finger does", () => {
    const { effects } = play([down(2, 150, 120), move(154, 123), up()]);
    expect(kinds(effects)).toEqual(["arm", "disarm", "tap"]);
  });

  it("leaves a swipe to the page: past the slop it is a scroll, and nothing lifts after it", () => {
    const { state, effects } = play([down(2), move(150 + HOLD_SLOP_PX + 1), hold(), move(300)]);
    expect(kinds(effects)).toEqual(["arm", "disarm"]);
    expect(state.phase).toBe("passed");
    // And no tap when it lifts: a scroll opens nothing.
    expect(kinds(play([up()], state).effects)).toEqual([]);
    expect(play([up()], state).state).toEqual(IDLE);
  });

  it("leaves to the page a touch that stops a glide, or one the page moves under", () => {
    const glide = play([{ type: "down", door: 1, x: 100, y: 100, gliding: true }, hold()]);
    expect(kinds(glide.effects)).toEqual([]);
    expect(glide.state.phase).toBe("passed");
    const scrolled = play([down(1), { type: "scroll" }, hold()]);
    expect(kinds(scrolled.effects)).toEqual(["arm", "disarm"]);
  });

  it("lifts the door with one tick when the hold comes", () => {
    const { state, effects } = play([down(4, 150), hold(150)]);
    expect(effects.filter((e) => e.type === "lift")).toEqual([{ type: "lift", door: 4 }]);
    expect(state.phase).toBe("held");
    // Held still, and let go: it goes back into its own place, and nothing changes.
    expect(play([up()], state).effects).toEqual([{ type: "land", from: 4, to: 4 }]);
  });

  it("clicks once each time the held door takes another's place, and never between", () => {
    const lifted = play([down(0, 150), hold(150)]).state;
    // Down the page a pixel at a time, then back up.
    const events: PressEvent[] = [];
    for (let y = 151; y <= 750; y++) events.push(move(y));
    for (let y = 749; y >= 150; y--) events.push(move(y));
    const { state, effects } = play(events, lifted);
    const places = effects.filter((e): e is Extract<PressEffect, { type: "place" }> => e.type === "place").map((e) => e.to);
    // Going down its foot passes the middles of doors 1 to 6, and going back
    // its foot leaves them again: one click for each, and none between.
    expect(places).toEqual([1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0]);
    // The door is under the finger for every move.
    expect(effects.filter((e) => e.type === "follow")).toHaveLength(events.length);
    expect(state.phase === "held" && state.to).toBe(0);
  });

  it("lands where it was last shown, and starts nothing new until it is there", () => {
    const lifted = play([down(1, 260), hold(260)]).state;
    const moved = play([move(500), move(620)], lifted);
    const shown = moved.effects.filter((e): e is Extract<PressEffect, { type: "place" }> => e.type === "place").at(-1)?.to;
    expect(shown).toBe(4);
    const let_go = play([up()], moved.state);
    expect(let_go.effects).toEqual([{ type: "land", from: 1, to: 4 }]);
    expect(let_go.state.phase).toBe("landing");
    // A finger that comes down while it lands does nothing to it.
    expect(play([down(3), hold()], let_go.state).effects).toEqual([]);
    expect(play([{ type: "landed" }], let_go.state).state).toEqual(IDLE);
  });

  it("puts the door back in its own place when the phone takes the touch away", () => {
    const lifted = play([down(1, 260), hold(260)]).state;
    const moved = play([move(600)], lifted).state;
    expect(play([{ type: "cancel" }], moved).effects).toEqual([{ type: "land", from: 1, to: 1 }]);
    // Cancelled before the hold: no tap, nothing lifts.
    expect(kinds(play([down(1), { type: "cancel" }]).effects)).toEqual(["arm", "disarm"]);
  });

  it("keeps the held door with the list when the finger goes past its ends", () => {
    // Door 2 held, and the finger taken far above the list and far below it.
    const lifted = play([down(2, 360), hold(360)]).state;
    const above = play([move(-2000)], lifted);
    expect(above.effects[0]).toEqual({ type: "follow", dy: ROWS.tops[0] - ROWS.tops[2] });
    expect(above.effects.at(-1)).toEqual({ type: "place", to: 0 });
    const below = play([move(9000)], lifted);
    const lastFoot = ROWS.tops[11] + ROWS.heights[11];
    expect(below.effects[0]).toEqual({ type: "follow", dy: lastFoot - (ROWS.tops[2] + ROWS.heights[2]) });
    expect(below.effects.at(-1)).toEqual({ type: "place", to: 11 });
    expect(withinList(ROWS, 5, 40)).toBe(40);
  });

  it("follows the finger as the page scrolls under it near an edge", () => {
    // The finger still on the screen while the page scrolls 300px: on the page it has gone 300px down.
    const lifted = play([down(0, 150), hold(150)]).state;
    const { effects } = play([move(150, 120, 300)], lifted);
    expect(effects[0]).toEqual({ type: "follow", dy: 300 });
    expect(effects.find((e) => e.type === "place")).toEqual({ type: "place", to: 3 });
  });

  it("does not flick a door back and forth, nor click, for a finger trembling on a place's line", () => {
    const lifted = play([down(3, 470), hold(470)]).state;
    // Door 3 takes door 4's place 64px down (its foot past door 4's middle, and the slack).
    const across = play([move(470 + 64)], lifted);
    expect(across.effects.filter((e) => e.type === "place")).toEqual([{ type: "place", to: 4 }]);
    // Then the finger trembles a few pixels either side of the line: no flick, no click.
    const events: PressEvent[] = [];
    for (let i = 0; i < 20; i++) events.push(move(470 + 58 + (i % 2 ? 3 : -3)));
    const trembling = play(events, across.state);
    expect(trembling.effects.filter((e) => e.type === "place")).toEqual([]);
  });
});

function up(): PressEvent {
  return { type: "up" };
}

describe("the arithmetic of a move", () => {
  it("takes a door's place once it covers half of it, and the slack past that", () => {
    // Door 3 (top 418, foot 514); door 4's middle is at 572 and door 2's at 360.
    expect(PLACE_SLACK_PX).toBe(6);
    expect(landingIndex(ROWS, 3, 0)).toBe(3);
    expect(landingIndex(ROWS, 3, 58 + PLACE_SLACK_PX - 1)).toBe(3);
    expect(landingIndex(ROWS, 3, 58 + PLACE_SLACK_PX)).toBe(4);
    expect(landingIndex(ROWS, 3, -58 - PLACE_SLACK_PX + 1)).toBe(3);
    expect(landingIndex(ROWS, 3, -58 - PLACE_SLACK_PX)).toBe(2);
    expect(landingIndex(ROWS, 3, -1000)).toBe(0);
    expect(landingIndex(ROWS, 3, 99999)).toBe(11);
    // Over place 4, it gives the place back only the slack past the line.
    expect(landingIndex(ROWS, 3, 58 - PLACE_SLACK_PX + 1, 4)).toBe(4);
    expect(landingIndex(ROWS, 3, 58 - PLACE_SLACK_PX - 1, 4)).toBe(3);
  });

  it("shows every door, as it lands, exactly where the new order lays it out, so nothing moves when it is kept", () => {
    // Bands of one height, and of several: each door's place while the held
    // one lands (its own place and its transform) is its place in the new
    // order, laid out from the top with the same gap.
    const uneven: Rows = (() => {
      const heights = [96, 150, 96, 120, 96, 200, 96];
      const tops: number[] = [];
      let at = 40;
      for (const h of heights) {
        tops.push(at);
        at += h + 10;
      }
      return { tops, heights };
    })();
    for (const rows of [ROWS, uneven]) {
      const ids = rows.tops.map((_, i) => i);
      for (let from = 0; from < ids.length; from++) {
        for (let to = 0; to < ids.length; to++) {
          const order = moveDoor(ids.map(String), from, to).map(Number);
          let at = rows.tops[0];
          for (const door of order) {
            const shown = rows.tops[door] + (door === from ? landingOffset(rows, from, to) : shiftOf(rows, door, from, to));
            expect(shown, `door ${door}, ${from} to ${to}`).toBe(at);
            at += rows.heights[door] + 10;
          }
        }
      }
    }
  });

  it("brings the page along near an edge, faster the nearer, and leaves it still in the middle", () => {
    const top = 60;
    const bottom = 758;
    expect(edgeSpeed(400, top, bottom)).toBe(0);
    expect(edgeSpeed(top + EDGE_PX + 1, top, bottom)).toBe(0);
    expect(edgeSpeed(top + EDGE_PX - 1, top, bottom)).toBeLessThan(0);
    expect(edgeSpeed(top, top, bottom)).toBe(-EDGE_MAX_PX);
    expect(edgeSpeed(bottom - EDGE_PX + 1, top, bottom)).toBeGreaterThan(0);
    expect(edgeSpeed(bottom + 30, top, bottom)).toBe(EDGE_MAX_PX);
    expect(Math.abs(edgeSpeed(top + 10, top, bottom))).toBeGreaterThan(Math.abs(edgeSpeed(top + 50, top, bottom)));
  });
});
