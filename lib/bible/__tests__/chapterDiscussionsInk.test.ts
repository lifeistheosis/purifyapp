import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The chapter's discussions are read on paper (2026-11-13; found by Updates
 * 16, routed by the arbiter). A post's card stood on `bg-black/15`, the one
 * dark well Light does not turn into its warm shade (app/globals.css, "Wells":
 * only /20 and /30), so on paper it was grey under the ink: a reader's name
 * and the post's age read 4.24:1 on Light, and the face's letter 3.86 to 4.01
 * on Light and the light looks. On paper the card keeps its border and no
 * well, and every palette, look and earned palette passes (checkMock on the
 * walks' stand-in post, 390, 800 and 1032, English and Arabic). The dark
 * palettes keep their well.
 *
 * What it cannot see: the pixels; checkMock measures them on the export.
 *
 * What a reader would notice if this broke: on Light, the name and age over a
 * chapter's discussions too faint to read.
 */
describe("the chapter's discussions on paper", () => {
  it("a post's card has no well on paper, and keeps its well on the dark palettes", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "components/bible/ChapterDiscussions.tsx"), "utf8");
    expect(src).toContain(
      'className="flex items-start gap-3 rounded-xl border border-paper/10 bg-black/15 p-3 transition-colors hover:border-paper/25 [html[data-reading-mode=parchment]_&]:bg-transparent"',
    );
  });
});
