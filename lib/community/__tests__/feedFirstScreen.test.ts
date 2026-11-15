// The community feed stands still as it opens (1.9, Updates 77; the pre-build
// gate's rule 1, nothing jumps). Every post was content-visibility: auto with
// a 320px placeholder, and a post that may wait is laid out first at the
// placeholder and only after at its own height: on the Chat door's open the
// second post stood 81px low and then rose (Gate 3b, 2026-11-15, 3 of 3). And
// the skeleton of the tabs was 44px where the tabs are 45px, so the sign-in
// under them stepped down a pixel as the posts arrived.
//
// What a reader would notice if this broke: the posts rising into place a
// moment after the feed opens, or the sign-in moving a pixel as they come.
//
// This reads the source; vitest runs in node with no DOM (vitest.config.ts).

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the old rule is not read as the rule. */
const code = (p: string) =>
  read(p)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const client = code("components/community/CommunityClient.tsx");
const tabs = code("components/community/FeedTabs.tsx");

/** Every `<PostCard ... />` in the feed's file, as written. */
const cards = [...client.matchAll(/<PostCard\b[\s\S]*?\/>/g)].map((m) => m[0]);
const feedCard = cards.find((c) => c.includes("post={p}"));
const linkedCard = cards.find((c) => c.includes("post={linked}"));

/** How many posts at the head of the feed are drawn whole. */
const firstScreen = Number(client.match(/const FIRST_SCREEN_POSTS = (\d+);/)?.[1]);

/**
 * Whether the feed draws its post at index `i` whole, with a notification
 * pointing at the post `focusId` (or none), by the feed's own expression.
 */
function drawnWhole(i: number, focusId: string | null): boolean {
  const expr = feedCard?.match(/\bwhole=\{([^}]*)\}/)?.[1];
  expect(expr, "the feed's PostCard says whether it is drawn whole").toBeTruthy();
  const rule = new Function("i", "FIRST_SCREEN_POSTS", "focus", "p", `return Boolean(${expr});`);
  return rule(i, firstScreen, focusId ? { postId: focusId } : null, { id: `post-${i}` }) as boolean;
}

describe("the community feed, as it opens", () => {
  it("draws the posts of the first screen whole, and lets the rest wait", () => {
    // Eight at the least: a phone's first screen holds two or three posts,
    // and a tall window with short posts more. Not the whole feed of fifty,
    // or nothing is saved.
    expect(firstScreen).toBeGreaterThanOrEqual(8);
    expect(firstScreen).toBeLessThanOrEqual(12);
    const feed = Array.from({ length: 50 }, (_, i) => i);
    expect(feed.filter((i) => drawnWhole(i, null))).toEqual(feed.slice(0, firstScreen));
  });

  it("draws whole the post a notification takes the reader to, wherever it stands", () => {
    expect(drawnWhole(30, "post-30")).toBe(true);
    expect(drawnWhole(31, "post-30")).toBe(false);
    // The post over the feed that a notification brought back is at the top.
    expect(linkedCard).toMatch(/\bwhole\b(?!=)/);
  });

  it("gives content-visibility only to a post that may wait", () => {
    // The placeholder and the waiting go together, behind `!whole`, and
    // nowhere else on a post.
    const waits =
      '!whole && "[contain-intrinsic-size:auto_320px] supports-[overflow-anchor:auto]:[content-visibility:auto]"';
    expect(client).toContain(waits);
    expect(client.split("content-visibility:auto").length - 1).toBe(1);
    expect(client.split("contain-intrinsic-size").length - 1).toBe(1);
  });

  it("holds the tabs' place at the tabs' own height while the feed is read", () => {
    // FeedTabs: a tab is min-h-11 (2.75rem) in a row with a 1px line under
    // it. The skeleton row is that tall, line included.
    expect(tabs).toMatch(/"flex items-end gap-3 border-b border-paper\/\[0\.08\]"/);
    expect(tabs).toMatch(/community-tab hit-44 relative min-h-11 /);
    expect(client).toMatch(
      /result === undefined \? \(\s*<div aria-hidden className="flex h-\[calc\(2\.75rem\+1px\)\] items-end gap-6 border-b border-paper\/\[0\.08\] pb-3">/,
    );
  });
});
