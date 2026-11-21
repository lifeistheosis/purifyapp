import { describe, expect, it } from "vitest";

import { FEED_MEMO_MAX, FEED_MEMO_MS, dropHeldFeeds, feedMemoKey, heldFeed, holdFeed } from "../feedMemo";

/**
 * The public feed is held on the server for a moment, so readers who poll are
 * one read of the database between them (2026-11-21, the Supabase project past
 * its free egress). One reader's own view is never held.
 */

const PUBLIC = { scopedGroup: null, following: false, onePost: null, blocked: 0, chapter: null, category: null };
const T0 = 1_795_000_000_000;

describe("which answers may be held", () => {
  it("holds the public feed, a chapter's posts and Ask a Priest, each under its own name", () => {
    const feed = feedMemoKey(PUBLIC);
    const chapter = feedMemoKey({ ...PUBLIC, chapter: "john/3" });
    const questions = feedMemoKey({ ...PUBLIC, category: "question" });
    expect(feed).toBeTruthy();
    expect(new Set([feed, chapter, questions]).size).toBe(3);
    expect(feedMemoKey({ ...PUBLIC, chapter: "john/4" })).not.toBe(chapter);
  });

  it("never holds one reader's own view", () => {
    expect(feedMemoKey({ ...PUBLIC, scopedGroup: "5b0c9f0e-1111-4222-8333-444444444444" })).toBeNull();
    expect(feedMemoKey({ ...PUBLIC, following: true })).toBeNull();
    expect(feedMemoKey({ ...PUBLIC, onePost: "5b0c9f0e-1111-4222-8333-444444444444" })).toBeNull();
    // A reader who has blocked or muted anyone is shown a feed of their own.
    expect(feedMemoKey({ ...PUBLIC, blocked: 1 })).toBeNull();
  });
});

describe("holding an answer", () => {
  it("hands the same answer out until it is stale, then nothing", () => {
    const held = new Map();
    const posts = [{ id: "a" }, { id: "b" }];
    holdFeed("feed||", posts, T0, held);
    expect(heldFeed("feed||", T0 + 1, held)).toBe(posts);
    expect(heldFeed("feed||", T0 + FEED_MEMO_MS - 1, held)).toBe(posts);
    expect(heldFeed("feed||", T0 + FEED_MEMO_MS, held)).toBeNull();
    expect(held.size).toBe(0);
  });

  it("answers nothing for a name it does not hold", () => {
    const held = new Map();
    holdFeed("feed||", [], T0, held);
    expect(heldFeed("feed|john/3|", T0 + 1, held)).toBeNull();
  });

  it("forgets everything when something is posted", () => {
    const held = new Map();
    holdFeed("feed||", [{ id: "a" }], T0, held);
    holdFeed("feed|john/3|", [{ id: "b" }], T0, held);
    dropHeldFeeds(held);
    expect(heldFeed("feed||", T0 + 1, held)).toBeNull();
    expect(heldFeed("feed|john/3|", T0 + 1, held)).toBeNull();
  });

  it("never holds more answers than its cap", () => {
    const held = new Map();
    for (let n = 0; n < FEED_MEMO_MAX + 40; n += 1) holdFeed(`feed|book/${n}|`, [], T0 + n, held);
    expect(held.size).toBeLessThanOrEqual(FEED_MEMO_MAX);
    expect(heldFeed(`feed|book/${FEED_MEMO_MAX + 39}|`, T0 + FEED_MEMO_MAX + 40, held)).toEqual([]);
  });

  it("is short enough that a browser's 15 seconds on top still reads as now", () => {
    expect(FEED_MEMO_MS + 15_000).toBeLessThanOrEqual(60_000);
  });
});
