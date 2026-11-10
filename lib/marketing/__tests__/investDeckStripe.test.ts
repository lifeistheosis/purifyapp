import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The investor deck (purifyapp.net/invest, app/invest/deck.html) carries no
 * side stripe (his yes to 138, 2026-11-10): the gold line down the left of
 * "You're repaid first" was the one the app lost in build 89 notes 1 and 5,
 * and investors read it as AI-made too. The app's own test
 * (lib/ui/__tests__/noSideStripes.test.ts) reads .css and .tsx files, not
 * this page, so the page is held here.
 *
 * What would go wrong if this broke: a bar down one side of a line of the
 * deck, the look the house has ruled out.
 */

const deck = fs.readFileSync(path.join(process.cwd(), "app/invest/deck.html"), "utf8");
// Every <style> block on the page (the first is a short one for the safe areas).
const style = [...deck.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");

describe("the investor deck", () => {
  it("draws no border down one side of anything", () => {
    expect(style.length).toBeGreaterThan(1000);
    const sides = [...style.matchAll(/border-(?:left|right|inline-start|inline-end)(?:-width)?\s*:\s*([^;}]+)/g)]
      .map((m) => m[0].trim())
      .filter((d) => !/:\s*(?:0|none)\b/.test(d));
    expect(sides).toEqual([]);
  });

  it("sets its terms line on its own type", () => {
    const rule = style.match(/\.ask-share \{([^}]*)\}/)?.[1] ?? "";
    expect(rule).toContain("color: var(--muted)");
    expect(rule).not.toMatch(/border|padding-left/);
  });
});
