// Community's two halves and the feed's filters (1.8, the owner's pick of
// r3-02, "B with A's top"; his build 80 note 18): one switch, Pray together
// and Talk together, in place of a bar of seven pills; Talk together shows
// three words and keeps the rest behind the sliders; the prayer wall moved to
// Pray together.
//
// What a reader would notice if this broke: a notification's post opening on
// the prayer wall, a #pray link landing in the conversation, the prayer wall
// back among the feed's words, or a word on the line printed as its key.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  COMMUNITY_HALVES,
  FEED_FILTER_KEYS,
  PRAY_HASH,
  feedSliders,
  feedTabs,
  halfFromHash,
  hashForHalf,
  type FeedFilter,
} from "../halves";

const en = JSON.parse(readFileSync(join(__dirname, "..", "..", "i18n", "messages", "en.json"), "utf8")) as Record<string, string>;

describe("Community's two halves", () => {
  it("draws Pray together first, then Talk together", () => {
    expect(COMMUNITY_HALVES).toEqual(["pray", "talk"]);
  });

  it("opens on Talk together, and #pray opens Pray together", () => {
    expect(halfFromHash("")).toBe("talk");
    expect(halfFromHash(PRAY_HASH)).toBe("pray");
    expect(PRAY_HASH).toBe("#pray");
  });

  it("keeps a post, a group's thread, a profile and the old #conversations in Talk together", () => {
    for (const hash of ["#post-1b4e28ba-2fa1-11d2-883f-0016d3cca427", "#group-1b4e28ba-2fa1-11d2-883f-0016d3cca427", "#@maria.p", "#conversations", "#prayer"]) {
      expect(halfFromHash(hash), hash).toBe("talk");
    }
  });

  it("writes #pray for Pray together and nothing for Talk together, so the plain address stays plain", () => {
    expect(hashForHalf("pray")).toBe("#pray");
    expect(hashForHalf("talk")).toBe("");
    for (const half of COMMUNITY_HALVES) expect(halfFromHash(hashForHalf(half))).toBe(half);
  });
});

describe("Talk together's filters", () => {
  it("shows three words across the feed: All, Ask a Priest, Discussion", () => {
    expect(feedTabs(false)).toEqual(["all", "questions", "discussion"]);
  });

  it("leaves Ask a Priest out of a group's thread, where questions do not go", () => {
    expect(feedTabs(true)).toEqual(["all", "discussion"]);
  });

  it("keeps Following, Scripture and the Fathers behind the sliders", () => {
    expect(feedSliders({ signedIn: true, inGroup: false })).toEqual(["following", "scripture", "father"]);
    // Following needs an account, and a group's thread is not the public feed.
    expect(feedSliders({ signedIn: false, inGroup: false })).toEqual(["scripture", "father"]);
    expect(feedSliders({ signedIn: true, inGroup: true })).toEqual(["scripture", "father"]);
  });

  it("has no prayer wall among them: it moved to Pray together", () => {
    const every = new Set<string>([
      ...feedTabs(false),
      ...feedTabs(true),
      ...feedSliders({ signedIn: true, inGroup: false }),
      ...Object.keys(FEED_FILTER_KEYS),
    ]);
    expect(every.has("prayer")).toBe(false);
    expect(Object.values(FEED_FILTER_KEYS)).not.toContain("community.filterPrayer");
  });

  it("puts no filter both on the line and behind the sliders", () => {
    const line = new Set<FeedFilter>(feedTabs(false));
    for (const id of feedSliders({ signedIn: true, inGroup: false })) expect(line.has(id), id).toBe(false);
  });

  it("names every filter with a word the catalog already has", () => {
    for (const [id, key] of Object.entries(FEED_FILTER_KEYS)) {
      expect(en[key], `${id}: ${key}`).toBeTruthy();
    }
  });
});
