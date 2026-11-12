import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every row of History's timeline is drawn at its own height (the gate's
 * final run of 2026-11-12; the arbiter's word of 02:08 UTC).
 *
 * The rows were windowed (`content-visibility: auto`): a row off the screen
 * was not drawn and stood in at one height for its width, the mean of the
 * rows (1.9, H_ROOM). But a row's height is one of four (at 390 wide, a row
 * of words 123 or 149px, a row under its era's large picture 335 or 361px),
 * so no one height stood in for them. When a reader was taken to a row, the
 * rows round it drew at their own heights and moved it: the tap walk brought
 * "The Estrangement of the Non-Chalcedonian Churches" to the middle and
 * watched it come to rest 333px lower, under the tab bar, on three tries of
 * three. Forty rows drawn whole measured no slower to open, and the iPhone,
 * where the window was never on (it waited on scroll anchoring, which Safari
 * lacks), always drew them so.
 *
 * What it cannot see: the screen. The export check brings that row to the
 * middle the walk's way and watches that it does not move.
 *
 * What a reader would notice if this broke: a row they were taken to, or
 * scrolled to, slides away under the tab bar as the rows round it draw.
 */

const ROOT = process.cwd();
const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8").replace(/\r\n/g, "\n");
/** The stylesheet without its comments, so a note that names a rule is no rule. */
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
/** Every rule whose selector names the timeline's rows, with its declarations. */
const rowRules = () => [...code.matchAll(/([^{}]*\.history-cv\b[^{}]*)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2] }));

describe("History's timeline rows", () => {
  it("are drawn whole: nothing windows them or gives them a height to stand in at", () => {
    const rules = rowRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.filter((r) => /content-visibility|contain-intrinsic/.test(r.body)).map((r) => r.selector)).toEqual([]);
  });

  it("still land under the pinned era name when a reader is taken to one", () => {
    expect(rowRules().some((r) => r.selector === ".history-cv" && r.body.includes("scroll-margin-top: calc(var(--history-sticky-top) + 3.25rem);"))).toBe(true);
  });

  it("keep a picture's frame when the picture cannot be had, its own preview blurred in it", () => {
    // With no signal the apps cannot fetch a history picture, and a thumb that
    // took its frame away shrank its row: the row the walk had brought to the
    // middle rose 237px as the rows above it lost theirs (the export, 2026-11-12).
    const thumb = fs.readFileSync(path.join(ROOT, "components/history/EventThumb.tsx"), "utf8");
    expect(thumb).toContain("if (!picture || (gone && !picture.preview)) return null;");
    expect(thumb).toMatch(/\{gone \? \(\s*<span\s+data-thumb-preview=""[\s\S]{0,200}?backgroundImage: `url\("\$\{picture\.preview\}"\)`/);
  });

  it("reads a windowed row where one is written: the reading is not broken", () => {
    const sample = "\n.history-cv {\n contain-intrinsic-size: auto 270px;\n}\n@supports (overflow-anchor: auto) {\n .history-cv {\n  content-visibility: auto;\n }\n}\n";
    const found = [...sample.matchAll(/([^{}]*\.history-cv\b[^{}]*)\{([^{}]*)\}/g)].filter((m) => /content-visibility|contain-intrinsic/.test(m[2]));
    expect(found).toHaveLength(2);
  });
});
