import { describe, expect, it } from "vitest";

import {
  applyComplete,
  applyOpen,
  applyVisit,
  emptyProgress,
  isDone,
  nextChapter,
  parseProgress,
  totals,
  walkStreak,
} from "../progress";

describe("a reader's walk", () => {
  it("reads anything malformed as a fresh walk", () => {
    for (const raw of [null, "", "nope", "[]", "42", '{"done":"x","opened":5}']) {
      expect(parseProgress(raw)).toEqual(emptyProgress());
    }
  });

  it("round-trips what it wrote", () => {
    let p = emptyProgress();
    p = applyOpen(p, "job-1-5", "2026-09-29");
    p = applyComplete(p, 1, "  I hold it loosely.  ", "2026-09-29", 1000);
    expect(parseProgress(JSON.stringify(p))).toEqual(p);
  });

  it("counts a card once, however often it is opened", () => {
    let p = applyOpen(emptyProgress(), "job-1-5", "2026-09-29");
    p = applyOpen(p, "job-1-5", "2026-09-30");
    expect(p.opened).toEqual(["job-1-5"]);
    expect(p.days).toEqual(["2026-09-29", "2026-09-30"]);
  });

  it("keeps the first finish time and the latest sentence", () => {
    let p = applyComplete(emptyProgress(), 2, "first", "2026-09-29", 1000);
    p = applyComplete(p, 2, "second", "2026-09-30", 2000);
    expect(p.done["2"]).toBe(1000);
    expect(p.ledger["2"].text).toBe("second");
    expect(isDone(p, 2)).toBe(true);
  });

  it("does not keep an empty sentence", () => {
    const p = applyComplete(emptyProgress(), 3, "   ", "2026-09-29", 1000);
    expect(p.ledger["3"]).toBeUndefined();
    expect(totals(p)).toEqual({ chapters: 1, cards: 0, reflections: 0 });
  });

  it("continues at the first chapter not yet finished", () => {
    let p = applyComplete(emptyProgress(), 1, "", "2026-09-29", 1);
    p = applyComplete(p, 3, "", "2026-09-29", 1);
    expect(nextChapter(p, 42)).toBe(2);
    let all = emptyProgress();
    for (let n = 1; n <= 3; n++) all = applyComplete(all, n, "", "2026-09-29", 1);
    expect(nextChapter(all, 3)).toBeNull();
  });

  it("counts a streak of walking days, forgiving today", () => {
    let p = emptyProgress();
    for (const d of ["2026-09-26", "2026-09-27", "2026-09-28"]) p = applyOpen(p, `c-${d}`, d);
    expect(walkStreak(p, "2026-09-28")).toBe(3);
    // Today not walked yet: still three.
    expect(walkStreak(p, "2026-09-29")).toBe(3);
    // A whole day missed: the run is over.
    expect(walkStreak(p, "2026-09-30")).toBe(0);
  });

  it("remembers the last chapter opened without rewriting when it has not moved", () => {
    const p = applyVisit(emptyProgress(), 4);
    expect(p.last).toBe(4);
    expect(applyVisit(p, 4)).toBe(p);
  });
});
