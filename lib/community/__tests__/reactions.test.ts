import { describe, expect, it } from "vitest";

import {
  applyPress,
  countDelta,
  isReaction,
  nextReaction,
  reactionWrite,
  type Reaction,
  type ReactionState,
} from "../reactions";

/**
 * The requirement was "a user cannot like and dislike simultaneously".
 *
 * That has two halves and only one of them lives here. The database makes a
 * second row impossible (a partial unique index in
 * 20260826_community_reactions_and_verification.sql); this module decides what
 * a press MEANS. These tests pin the second half, and the exhaustive case
 * below is the one that matters: for every state and every press, the result
 * is a single reaction or none, never both.
 */

const STATES: ReactionState[] = [null, 1, -1];
const PRESSES: Reaction[] = [1, -1];

describe("nextReaction", () => {
  it("takes a reaction when you held none", () => {
    expect(nextReaction(null, 1)).toBe(1);
    expect(nextReaction(null, -1)).toBe(-1);
  });

  it("takes it back when you press the one you hold", () => {
    // A like is a toggle, not a ratchet. Without this a reader who changed
    // their mind would need a separate control to undo, and there isn't one.
    expect(nextReaction(1, 1)).toBeNull();
    expect(nextReaction(-1, -1)).toBeNull();
  });

  it("flips straight across without an un-press first", () => {
    expect(nextReaction(1, -1)).toBe(-1);
    expect(nextReaction(-1, 1)).toBe(1);
  });

  it("NEVER yields both, for any state and any press", () => {
    // The requirement, stated exhaustively rather than by example. The return
    // type makes holding two representationally impossible, and this proves no
    // transition tries to.
    for (const state of STATES) {
      for (const press of PRESSES) {
        const next = nextReaction(state, press);
        expect([null, 1, -1]).toContain(next);
      }
    }
  });
});

describe("reactionWrite", () => {
  it("asks for a removal when the press undoes what you hold", () => {
    expect(reactionWrite(1, 1)).toEqual({ action: "remove" });
    expect(reactionWrite(-1, -1)).toEqual({ action: "remove" });
  });

  it("asks for a set on a new reaction and on a flip", () => {
    expect(reactionWrite(null, 1)).toEqual({ action: "set", value: 1 });
    expect(reactionWrite(1, -1)).toEqual({ action: "set", value: -1 });
    expect(reactionWrite(-1, 1)).toEqual({ action: "set", value: 1 });
  });

  it("never asks to set a value that is not a reaction", () => {
    for (const state of STATES) {
      for (const press of PRESSES) {
        const w = reactionWrite(state, press);
        if (w.action === "set") expect(isReaction(w.value)).toBe(true);
      }
    }
  });
});

describe("countDelta", () => {
  it("moves one counter when taking or dropping a reaction", () => {
    expect(countDelta(null, 1)).toEqual({ like: 1, dislike: 0 });
    expect(countDelta(1, 1)).toEqual({ like: -1, dislike: 0 });
    expect(countDelta(null, -1)).toEqual({ like: 0, dislike: 1 });
    expect(countDelta(-1, -1)).toEqual({ like: 0, dislike: -1 });
  });

  it("moves BOTH counters on a flip", () => {
    // The common case, and the one a naive "increment by one" gets wrong.
    expect(countDelta(1, -1)).toEqual({ like: -1, dislike: 1 });
    expect(countDelta(-1, 1)).toEqual({ like: 1, dislike: -1 });
  });

  it("never moves a counter by more than one in either direction", () => {
    for (const state of STATES) {
      for (const press of PRESSES) {
        const d = countDelta(state, press);
        expect(Math.abs(d.like)).toBeLessThanOrEqual(1);
        expect(Math.abs(d.dislike)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("applyPress", () => {
  it("keeps the totals in step with the transition", () => {
    const start = { like: 4, dislike: 2 };
    expect(applyPress(start, null, 1)).toEqual({ like: 5, dislike: 2 });
    expect(applyPress(start, 1, -1)).toEqual({ like: 3, dislike: 3 });
    expect(applyPress(start, 1, 1)).toEqual({ like: 3, dislike: 2 });
  });

  it("floors at zero rather than showing a negative count", () => {
    // Reachable from stale client state: two tabs, or a reaction removed
    // elsewhere. A count of -1 is visibly broken in a way that being briefly
    // one low is not, and the server's number replaces it on the next read.
    expect(applyPress({ like: 0, dislike: 0 }, 1, 1)).toEqual({
      like: 0,
      dislike: 0,
    });
  });

  it("round-trips: pressing the same button twice returns the counts", () => {
    const start = { like: 7, dislike: 3 };
    for (const press of PRESSES) {
      const once = applyPress(start, null, press);
      const twice = applyPress(once, press, press);
      expect(twice).toEqual(start);
    }
  });

  it("flipping and flipping back returns the counts", () => {
    const start = { like: 7, dislike: 3 };
    const liked = applyPress(start, null, 1);
    const flipped = applyPress(liked, 1, -1);
    const backAgain = applyPress(flipped, -1, 1);
    expect(backAgain).toEqual(liked);
  });
});

describe("isReaction", () => {
  it("accepts only the two real values", () => {
    expect(isReaction(1)).toBe(true);
    expect(isReaction(-1)).toBe(true);
    for (const bad of [0, 2, -2, "1", null, undefined, {}, []]) {
      expect(isReaction(bad)).toBe(false);
    }
  });
});
