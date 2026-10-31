// The search's recent words (lib/search/recent.ts): the last five searches a
// reader made, newest first, kept on this phone only (1.8, the owner's pick
// of r3-12, confirmed 2026-10-30: "recent searches keep the words typed").
//
// What a reader would notice if this broke: the same words listed twice, an
// old search never giving way, or a search that does not open at all because
// storage held something it did not expect.

import { describe, expect, it } from "vitest";

import { RECENT_KEY, RECENT_MAX, clearWords, parseWords, readWords, rememberWords, tidy, withWords } from "../recent";

describe("the recent words", () => {
  it("keep the newest first, once whatever the case, and five at most", () => {
    let list = withWords([], "nicaea");
    list = withWords(list, "jesus prayer");
    list = withWords(list, "Nicaea");
    expect(list).toEqual(["Nicaea", "jesus prayer"]);
    for (const w of ["a1", "b2", "c3", "d4", "e5"]) list = withWords(list, w);
    expect(RECENT_MAX).toBe(5);
    expect(list).toEqual(["e5", "d4", "c3", "b2", "a1"]);
  });

  it("keep the words as typed, spaces tidied, and nothing for nothing", () => {
    expect(tidy("  prayer   rope ")).toBe("prayer rope");
    expect(withWords(["basil"], "   ")).toEqual(["basil"]);
    expect(tidy("x".repeat(200))).toHaveLength(80);
  });

  it("read back only words, once each", () => {
    expect(parseWords(null)).toEqual([]);
    expect(parseWords("not json")).toEqual([]);
    expect(parseWords(JSON.stringify({ words: "a" }))).toEqual([]);
    expect(parseWords(JSON.stringify(["pascha", 3, null, " basil ", "Pascha", ""]))).toEqual(["pascha", "basil"]);
    expect(parseWords(JSON.stringify(Array.from({ length: 9 }, (_, i) => `w${i}`)))).toHaveLength(RECENT_MAX);
  });

  it("are kept under their own name, apart from 1.7's list of results opened", () => {
    expect(RECENT_KEY).toBe("purify:search:words");
  });

  it("never throw where there is no storage at all", () => {
    // vitest runs in node: there is no window here, as in a page's first render.
    expect(readWords()).toEqual([]);
    expect(() => clearWords()).not.toThrow();
    expect(rememberWords("nicaea")).toEqual(["nicaea"]);
  });
});
