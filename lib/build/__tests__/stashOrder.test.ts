// The trees the native export sets aside (scripts/native-build.mjs,
// STASH_PATHS) are put back by their place in the list: a build killed half
// way is recovered from .native-export-stash/<place>. So an entry is only ever
// appended. One inserted mid-list moves every entry after it, and a stash left
// by a killed build would be put back in the wrong places. Two such inserts
// (the error hook, admin A10, and the chant takedown route, admin A7) were
// moved to the end on Fable's release check 1, L1; this holds the order.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

/** The list as it stands: a new entry goes after the last of these. */
const ORDER = [
  '["app", "api"]',
  '["app", "(app)", "campaigns", "[id]"]',
  '["app", "(app)", "florilegium", "[id]"]',
  '["app", "(app)", "language-editor"]',
  '["app", "admin"]',
  '["app", "owner"]',
  '["app", "(app)", "shop", "seller"]',
  '["app", "(app)", "support", "contact"]',
  '["public", "admin-audio"]',
  '["app", "invest"]',
  '["app", "(app)", "u"]',
  '["app", "opengraph-image.png"]',
  '["app", "opengraph-image.alt.txt"]',
  '["app", "sitemap.ts"]',
  '["app", "robots.ts"]',
  '["app", "llms.txt"]',
  '["public", "kitchen-photos"]',
  '["public", "audio", "chants"]',
  '["public", "covers"]',
  '["public", "history", "media"]',
  '["public", "audio", "read"]',
  '["public", "shop", "media"]',
  '["public", "bibles"]',
  '["app", "(app)", "p"]',
  '["instrumentation.ts"]',
  '["app", "audio"]',
  '["public", "invest"]',
];

describe("the native export's stash list", () => {
  it("only grows at its end, so a killed build's stash goes back where it came from", () => {
    const src = fs.readFileSync("scripts/native-build.mjs", "utf8");
    const start = src.indexOf("const STASH_PATHS = [");
    const list = src
      .slice(start, src.indexOf("\n];", start))
      .split("\n")
      .filter((l) => /^ {2}\[/.test(l))
      .map((l) => l.trim().replace(/,$/, ""));
    expect(list.slice(0, ORDER.length)).toEqual(ORDER);
  });
});
