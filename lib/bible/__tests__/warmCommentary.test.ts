// A chapter's commentary is read ahead only once the chapter has settled,
// and never where it would spend data the reader has not offered
// (lib/bible/warmCommentary.ts).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { loadChapterCommentary } = vi.hoisted(() => ({ loadChapterCommentary: vi.fn<(book: string, chapter: number) => Promise<null>>(async () => null) }));
vi.mock("@/lib/bible/chapterData", () => ({ loadChapterCommentary }));

import { IDLE_LIMIT_MS, SETTLE_MS, warmCommentaryWhenIdle, wouldSpendData } from "@/lib/bible/warmCommentary";

beforeEach(() => {
  vi.useFakeTimers();
  loadChapterCommentary.mockClear();
  // No browser here: the timers are the test's, and there is no idle callback,
  // so the read follows the settle directly.
  vi.stubGlobal("window", { setTimeout, clearTimeout });
  vi.stubGlobal("navigator", {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("reading a chapter's commentary ahead", () => {
  it("does nothing while the chapter opens, then reads once", () => {
    warmCommentaryWhenIdle("john", 1, true);
    vi.advanceTimersByTime(SETTLE_MS - 1);
    expect(loadChapterCommentary).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1 + IDLE_LIMIT_MS);
    expect(loadChapterCommentary).toHaveBeenCalledExactlyOnceWith("john", 1);
  });

  it("is called off by a reader who turns the page first", () => {
    const off = warmCommentaryWhenIdle("john", 1, true);
    vi.advanceTimersByTime(SETTLE_MS - 1);
    off();
    vi.advanceTimersByTime(SETTLE_MS + IDLE_LIMIT_MS);
    expect(loadChapterCommentary).not.toHaveBeenCalled();
  });

  it("stays away in a browser that asked to save data or is on a mobile connection", () => {
    for (const connection of [{ saveData: true }, { type: "cellular" }, { effectiveType: "2g" }, { effectiveType: "slow-2g" }]) {
      vi.stubGlobal("navigator", { connection });
      warmCommentaryWhenIdle("john", 1, false);
      vi.advanceTimersByTime(SETTLE_MS + IDLE_LIMIT_MS);
      expect(loadChapterCommentary, JSON.stringify(connection)).not.toHaveBeenCalled();
      expect(wouldSpendData(false, connection)).toBe(true);
    }
  });

  it("reads in the apps whatever the connection, since the files are in the bundle", () => {
    expect(wouldSpendData(true, { saveData: true, type: "cellular" })).toBe(false);
    expect(wouldSpendData(false, undefined)).toBe(false);
    expect(wouldSpendData(false, { type: "wifi", effectiveType: "4g" })).toBe(false);
  });
});
