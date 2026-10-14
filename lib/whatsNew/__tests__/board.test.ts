import { describe, expect, it } from "vitest";

import {
  BOARD_MESSAGES,
  boardMessageAgeDays,
  currentBoardMessage,
} from "@/lib/whatsNew/board";
import { ENTRIES } from "@/lib/whatsNew/entries";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";
import { boardFreshness, STALE_DAYS } from "@/scripts/lib/release-board.mjs";

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
    // The clock is derived from the newest message, not hardcoded. It used to
    // be a fixed 2026-08-02, chosen when the seed message was the only entry,
    // and it went negative the first time a message newer than that date was
    // added. Deriving it tests the arithmetic instead of the contents, so
    // writing a weekly note can never fail this.
    const newest = new Date(`${BOARD_MESSAGES[0].date}T00:00:00Z`);
    expect(boardMessageAgeDays(newest)).toBe(0);
    expect(
      boardMessageAgeDays(new Date(newest.getTime() + 10 * 86_400_000)),
    ).toBe(10);
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

  it(`is no more than ${STALE_DAYS} days older than the note of the release it ships with`, () => {
    // Unlike the warning above, this one fails. A store build carries this
    // file for as long as it is installed, and shows it whenever the table
    // cannot be reached, so a stale message here is a stale message in every
    // copy of the release. 1.6 came within a step of shipping one from
    // 2026-09-08. Measured against the note's date, not today's, so it holds
    // a release to its own day and never fails just because time passed.
    // `node scripts/release.mjs check` asks the same, with the same rule.
    const note = ENTRIES.find((e) => e.version === CURRENT_VERSION);
    expect(note, `no ${CURRENT_VERSION} note in data/changelog/entries.json`).toBeDefined();
    const { stale, newest, days } = boardFreshness(BOARD_MESSAGES, note!.date);
    expect(
      stale,
      `the newest board message, ${newest?.week} (${newest?.date}), is ${days} days older than the ${CURRENT_VERSION} note. ` +
        "Run node scripts/release.mjs board, or pull a newer one: node scripts/patch-notes.mjs pull --apply",
    ).toBe(false);
  });
});
