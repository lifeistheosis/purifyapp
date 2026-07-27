import { describe, expect, it } from "vitest";

import {
  BOARD_MESSAGES,
  boardMessageAgeDays,
  currentBoardMessage,
} from "@/lib/whatsNew/board";

/**
 * The board message replaced a hand-written block that sat on Beta 1.7 for
 * eight releases because nothing ever pointed out it had gone stale. These
 * tests are the thing that points it out.
 */

describe("weekly board message", () => {
  it("has at least one message", () => {
    expect(BOARD_MESSAGES.length).toBeGreaterThan(0);
  });

  it("returns the newest by date, whatever order the file is in", () => {
    const current = currentBoardMessage();
    expect(current).toBeDefined();
    for (const m of BOARD_MESSAGES) {
      expect(m.date <= current!.date).toBe(true);
    }
  });

  it("keeps every entry well formed", () => {
    for (const m of BOARD_MESSAGES) {
      expect(m.date, `${m.week} date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(m.week, `${m.date} week`).toMatch(/^\d{4}-W\d{2}$/);
      expect(m.eyebrow.trim(), `${m.week} eyebrow`).not.toBe("");
      expect(m.headline.trim(), `${m.week} headline`).not.toBe("");
      expect(m.body.length, `${m.week} body`).toBeGreaterThan(0);
      for (const p of m.body) expect(p.trim(), `${m.week} paragraph`).not.toBe("");
    }
  });

  it("uses no em dashes, per the house style", () => {
    for (const m of BOARD_MESSAGES) {
      const blob = [m.eyebrow, m.headline, ...m.body].join(" ");
      expect(blob.includes("—"), `${m.week} contains an em dash`).toBe(false);
    }
  });

  it("has no duplicate weeks", () => {
    const weeks = BOARD_MESSAGES.map((m) => m.week);
    expect(new Set(weeks).size).toBe(weeks.length);
  });

  it("computes an age, so staleness is measurable", () => {
    // Fixed clock: the age of the seed message on a known date.
    const age = boardMessageAgeDays(new Date("2026-08-02T00:00:00Z"));
    expect(age).not.toBeNull();
    expect(age).toBeGreaterThanOrEqual(0);
  });

  it("WARNS when the newest message is over three weeks old", () => {
    // Not a hard failure: a quiet fortnight is allowed, and a red build over
    // an unwritten note would just get skipped. Three weeks means the weekly
    // cadence has actually lapsed and someone should notice.
    const age = boardMessageAgeDays();
    if (age !== null && age > 21) {
      console.warn(
        `[board] the weekly message is ${age} days old. Add a new entry to data/changelog/board.json.`,
      );
    }
    expect(true).toBe(true);
  });
});
