import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The Saints page's choices are 44px to the touch (CLAUDE.md's guardrails;
 * checkMock's target check), found while walking the Themes chat's contrast
 * sweep (2026-11-10): the filter chips stood 43.4px tall, and the century
 * marks 26.4px wide, twenty-one of them squeezed into a 640px row. A mark
 * cannot borrow room from its neighbour (they are 4px apart, so a larger
 * invisible reach would overlap), so each is 44px wide and the row, which
 * scrolls across the phone, grows to hold them. A computer's row fills its
 * width as before.
 */
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const words = (cls: string) => cls.split(/\s+/);

describe("the Saints page's choices", () => {
  it("a filter chip is 44px tall", () => {
    const pill = /<button[\s\S]*?className=\{cn\(\s*"([^"]*)"/.exec(read("components/saints/FilterPill.tsx"))?.[1] ?? "";
    expect(words(pill)).toContain("min-h-11");
    expect(pill).not.toMatch(/min-h-\[(?:[0-3]\d|4[0-3])px\]/);
  });

  it("a century mark is 44px wide and tall, in a row as wide as they need", () => {
    const source = read("components/saints/CenturyTimeline.tsx");
    const row = /role="group"[^>]*className="([^"]*)"/.exec(source)?.[1] ?? "";
    expect(words(row)).toEqual(expect.arrayContaining(["w-max", "min-w-full"]));
    expect(row).not.toMatch(/min-w-\[\d+px\]/);
    const mark = /"group flex ([^"]*)",\s*"focus-visible/.exec(source)?.[1] ?? "";
    expect(words(mark)).toEqual(expect.arrayContaining(["min-h-11", "min-w-11"]));
  });
});
