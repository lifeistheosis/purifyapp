import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The EIKON Box's terms under the Pro card on /premium (where /plan sends a
 * reader without a plan) read at 4.5:1 on every palette. Written at 40
 * percent of the ink, under every palette's lift, they measured 2.31:1 on
 * Light and 3.82:1 on Dark (the Themes chat, 2026-11-10); at 45, the faintest
 * share the palettes' own rules lift to 4.5:1 (lib/ui/__tests__/
 * faintText.test.ts holds that arithmetic), they stay the page's small print.
 */
describe("the Pro card's note", () => {
  it("is written at a share the palettes lift", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/(app)/premium/page.tsx"), "utf8");
    const cls = /<p className="([^"]*)">\{plan\.proNote\}<\/p>/.exec(page)?.[1] ?? "";
    expect(cls, "the note's paragraph").not.toBe("");
    const share = Number(/(?:^|\s)text-paper\/(\d+)(?:\s|$)/.exec(cls)?.[1]);
    expect(share).toBeGreaterThanOrEqual(45);
  });
});

/**
 * The Pro card's ribbon ("Most complete") stands in the card's far corner in
 * every language: placed from its end, so Arabic mirrors it (checkMock's
 * mirror check found it placed from the right, 2026-11-10).
 */
describe("the Pro card's ribbon", () => {
  it("is placed from the card's end, not its right", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/(app)/premium/page.tsx"), "utf8");
    const ribbon = /\{ribbon && <span className=\{cn\(PREMIUM_CHIP, "([^"]*)"\)\}>/.exec(page)?.[1] ?? "";
    expect(ribbon.split(/\s+/)).toContain("end-5");
    expect(ribbon).not.toMatch(/(?:^|\s)(?:left|right)-\d/);
  });
});
