// The passages not in view, in a part's deck of the Fathers
// (components/theology/PassageDeck.tsx), wait smaller and dim, as the
// owner's design C draws them, and every word on them still reads (1.9).
// What a reader would notice if this broke: a Father's name and his book in
// grey too faint to read on the cards either side, as the whole card at half
// opacity left them (2.0 to 3.9:1, 154 lines on the Filioque's fourth part;
// checkMock on all five palettes, 2026-11-10). Now his face and the card's
// edge dim and his words go a step quieter, and checkMock finds none.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
const rule = (selector: string) => css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? "";

describe("the deck's cards not in view", () => {
  it("are smaller, but never dimmed as a whole, which dims their words too", () => {
    const side = rule(".theology-card:not([data-current])");
    expect(side).toContain("scale: 0.92;");
    expect(side).not.toMatch(/opacity/);
  });

  it("dim his face and the medallion, and set his words a step quieter", () => {
    expect(rule(".theology-card:not([data-current]) .theology-card-picture")).toContain("opacity: 0.45;");
    expect(rule(".theology-card:not([data-current]) .theology-ring")).toContain("opacity: 0.65;");
    expect(rule(".theology-card:not([data-current]) [data-card-words]")).toContain("color: color-mix(in srgb, var(--color-paper) 72%, transparent);");
  });

  it("change behind Purify's motion switch", () => {
    expect(css).toContain(':where([data-motion="reduce"]) .theology-card :is(.theology-card-picture, .theology-ring, [data-card-words]) {');
  });

  it("are the cards the deck marks, and its words the ones the rule quiets", () => {
    const deck = fs.readFileSync(path.join(process.cwd(), "components/theology/PassageDeck.tsx"), "utf8");
    expect(deck).toContain("data-current={i === at ? \"\" : undefined}");
    expect(deck).toContain('data-card-words=""');
  });
});
