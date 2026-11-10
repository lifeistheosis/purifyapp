import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * "Explore the interactive timeline" under a saint's or a council's events in
 * Orthodox History is 44px tall to the touch, the floor checkMock holds every
 * target to. It was its line of words alone, 20px, flagged on every saint page
 * with History events (the November saints chat, 2026-11-10).
 */
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("the link to the timeline under a page's events", () => {
  it("is 44px tall, its words in the middle", () => {
    const src = read("components/history/ViewInHistory.tsx");
    const cls = /<Link\s+href="\/history"\s+className="([^"]*)"/.exec(src)?.[1] ?? "";
    expect(cls.split(/\s+/)).toEqual(expect.arrayContaining(["inline-flex", "min-h-11", "items-center"]));
    expect(cls).not.toMatch(/\binline-block\b/);
  });
});
