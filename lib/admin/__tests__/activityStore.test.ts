import { describe, expect, it } from "vitest";

import type { ActivityEvent } from "../activity";
import {
  MAX_AGE_MS,
  MAX_KEPT,
  agoLabel,
  merge,
  prune,
  unseenCount,
  type ActivityRecord,
} from "../activityStore";

const ev = (id: string): ActivityEvent => ({
  id,
  kind: "visitor",
  text: "Someone just started reading",
  badge: "🌐",
});

const rec = (id: string, receivedAt: number, seen = false): ActivityRecord => ({
  ...ev(id),
  receivedAt,
  seen,
});

const NOW = 1_800_000_000_000;

describe("prune", () => {
  it("orders newest first regardless of input order", () => {
    const out = prune(
      [rec("a", NOW - 3000), rec("c", NOW - 1000), rec("b", NOW - 2000)],
      NOW,
    );
    expect(out.map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  it("caps the history at MAX_KEPT", () => {
    const many = Array.from({ length: MAX_KEPT + 25 }, (_, i) =>
      rec(`e${i}`, NOW - i * 1000),
    );
    expect(prune(many, NOW)).toHaveLength(MAX_KEPT);
  });

  it("keeps the NEWEST when it caps, not the first it happened to see", () => {
    const many = Array.from({ length: MAX_KEPT + 5 }, (_, i) =>
      rec(`e${i}`, NOW - i * 1000),
    );
    // e0 is the most recent, so it survives; the oldest five are dropped.
    const out = prune(many, NOW);
    expect(out[0].id).toBe("e0");
    expect(out.map((r) => r.id)).not.toContain(`e${MAX_KEPT + 4}`);
  });

  it("drops anything past the age limit", () => {
    const out = prune(
      [rec("fresh", NOW - 1000), rec("stale", NOW - MAX_AGE_MS - 1)],
      NOW,
    );
    expect(out.map((r) => r.id)).toEqual(["fresh"]);
  });

  it("keeps an entry sitting exactly on the age limit", () => {
    // Boundary stated explicitly: MAX_AGE_MS is inclusive, so a cron running
    // on a round interval cannot drop an event for being a millisecond late.
    const out = prune([rec("edge", NOW - MAX_AGE_MS)], NOW);
    expect(out).toHaveLength(1);
  });
});

describe("merge", () => {
  it("returns the same array identity when nothing is fresh", () => {
    // Identity matters: useSyncExternalStore compares snapshots by reference
    // and a new array every poll would re-render the panel forever.
    const existing = [rec("a", NOW)];
    expect(merge(existing, [], NOW)).toBe(existing);
  });

  it("returns the same array identity when every fresh event is a duplicate", () => {
    const existing = [rec("a", NOW)];
    expect(merge(existing, [ev("a")], NOW)).toBe(existing);
  });

  it("puts new events at the head", () => {
    const out = merge([rec("old", NOW - 5000)], [ev("new")], NOW);
    expect(out.map((r) => r.id)).toEqual(["new", "old"]);
  });

  it("marks new events unseen and stamps when they arrived", () => {
    const [first] = merge([], [ev("x")], NOW);
    expect(first.seen).toBe(false);
    expect(first.receivedAt).toBe(NOW);
  });

  it("does not double an event when the same effect runs twice", () => {
    // StrictMode runs effects twice in development. Without the id guard this
    // is the case that puts every arrival in the log two times.
    const once = merge([], [ev("x")], NOW);
    const twice = merge(once, [ev("x")], NOW);
    expect(twice).toHaveLength(1);
  });
});

describe("unseenCount", () => {
  it("counts only what has not been opened", () => {
    expect(
      unseenCount([rec("a", NOW), rec("b", NOW, true), rec("c", NOW)]),
    ).toBe(2);
  });

  it("is zero on an empty history", () => {
    expect(unseenCount([])).toBe(0);
  });
});

describe("agoLabel", () => {
  it("says now under a minute", () => {
    expect(agoLabel(NOW - 59_000, NOW)).toBe("now");
  });

  it("rounds down to whole minutes, hours and days", () => {
    expect(agoLabel(NOW - 60_000, NOW)).toBe("1m");
    expect(agoLabel(NOW - 59 * 60_000, NOW)).toBe("59m");
    expect(agoLabel(NOW - 60 * 60_000, NOW)).toBe("1h");
    expect(agoLabel(NOW - 25 * 60 * 60_000, NOW)).toBe("1d");
  });

  it("never reads as being in the future when clocks disagree", () => {
    // receivedAt is stamped from the client's own clock, but a record restored
    // from localStorage can predate a system clock change. A negative age
    // rendering as "-3m" would look like a bug in the panel.
    expect(agoLabel(NOW + 10_000, NOW)).toBe("now");
  });
});
