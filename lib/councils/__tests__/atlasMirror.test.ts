import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The atlas in Arabic (found 2026-11-11 by checkMock on the whole atlas, while
 * checking the wheel's light on the export for the arbiter's 18:48 UTC ask).
 * Its play mark was nudged a pixel right (`translate: 1px 0`), which stays
 * right in Arabic, so it stood 2px off its mirror. And the year's digits stood
 * 22px from the screen's edge in English and 25.8px in Arabic: the box they
 * are drawn in took the width of the era's name under them, and a year's
 * digits, which read left to right in every language, begin at its left.
 *
 * Now the play mark is drawn centred (components/ui/icons/Play.tsx,
 * `centered`), as the reader's dock and the mini player draw theirs; the
 * digits' box is as wide as its digits, so it stands at the start either way
 * round; and each digit's column says by name that it keeps its order in
 * Arabic, which checkMock cannot know.
 *
 * What it cannot see: the screen. checkMock measures it both ways round on
 * the export.
 *
 * What would go wrong if this broke: in Arabic the year stands a few pixels in
 * from the edge its era's name stands on, and checkMock fails the atlas.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const ATLAS = read("components/councils/MapAtlas.tsx");
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
/** One rule of the stylesheet, by its selector at the start of a line. */
const rule = (sel: string) => CSS.match(new RegExp(`\\n${sel.replace(/[.[\]"=]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? null;

describe("the atlas in Arabic", () => {
  it("draws its play mark centred, with no nudge that Arabic would read as a side", () => {
    expect(ATLAS).toContain("<Play size={18} data-icon=\"play\" centered />");
    expect(rule('.atlas-play [data-icon="play"]')).toBeNull();
    expect(CSS).not.toMatch(/\.atlas-play[^{]*\{[^}]*translate/);
  });

  it("keeps the year's box as wide as its digits, so they stand at the start either way round", () => {
    const odo = rule(".atlas-odo");
    expect(odo).toContain("width: max-content;");
    expect(odo).toContain("direction: ltr;");
  });

  it("names, on each digit's column, that a year's digits keep their order in Arabic", () => {
    expect(ATLAS).toContain(
      '<span key={k} className="atlas-odo-col" data-mock-allow="mirror" data-mock-why="a year\'s digits keep their order in Arabic">',
    );
  });
});
