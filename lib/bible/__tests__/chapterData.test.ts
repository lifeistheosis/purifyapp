import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  forgetChapterData,
  loadChapterCommentary,
  loadChapterCrossRefs,
  loadInterlinear,
  loadStrongs,
} from "../chapterData";

/**
 * The reader's side of a chapter's files: asked for once, kept for the last
 * few chapters, and never remembered as missing.
 */

const asked: string[] = [];
let answer: (url: string) => { ok: boolean; body: unknown } | "offline";

beforeEach(() => {
  asked.length = 0;
  forgetChapterData();
  answer = (url) => ({ ok: true, body: { url } });
  vi.stubGlobal("fetch", async (url: string) => {
    asked.push(url);
    const a = answer(url);
    if (a === "offline") throw new TypeError("Failed to fetch");
    return { ok: a.ok, json: async () => a.body };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a chapter's files", () => {
  it("are asked for at their own addresses, relative to wherever the page is", async () => {
    await loadInterlinear("john", 1);
    await loadChapterCrossRefs("john", 1);
    await loadChapterCommentary("john", 1);
    await loadStrongs();
    expect(asked).toEqual([
      "/bible-data/interlinear/john/1.json",
      "/bible-data/crossrefs/john/1.json",
      "/bible-data/commentary/john/1.json",
      "/bible-data/strongs.json",
    ]);
  });

  it("are fetched once, however many verses ask", async () => {
    const [a, b] = await Promise.all([loadInterlinear("john", 1), loadInterlinear("john", 1)]);
    await loadInterlinear("john", 1);
    expect(asked).toHaveLength(1);
    expect(a).toBe(b);
  });

  it("answer null when the file is missing or the phone is offline, and ask again the next time", async () => {
    answer = () => ({ ok: false, body: null });
    expect(await loadChapterCommentary("job", 3)).toBeNull();
    answer = () => "offline";
    expect(await loadChapterCommentary("job", 3)).toBeNull();
    answer = (url) => ({ ok: true, body: { url } });
    expect(await loadChapterCommentary("job", 3)).toEqual({ url: "/bible-data/commentary/job/3.json" });
    expect(asked).toHaveLength(3);
  });

  it("are kept for the last few chapters only, and the lexicon for the whole visit", async () => {
    await loadStrongs();
    for (let c = 1; c <= 12; c++) await loadInterlinear("john", c);
    asked.length = 0;
    // The newest are still in hand.
    await loadInterlinear("john", 12);
    await loadInterlinear("john", 6);
    expect(asked).toEqual([]);
    // The oldest were let go, and are read again when a reader goes back.
    await loadInterlinear("john", 1);
    expect(asked).toEqual(["/bible-data/interlinear/john/1.json"]);
    // The lexicon is never let go.
    await loadStrongs();
    expect(asked).toHaveLength(1);
  });
});
