import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Build 97 note 9, the owner with the verse picture's sheet on Words and on
 * Size: "notice how the words section move the UI up fix that". The tab's
 * panel had a floor of 136px and Words is taller, so on Words the sheet, its
 * title and the picture stood higher (6.3px at 390 by 844: the edge at 127
 * on Words, 133.3 on Look and Size). Now the three tabs share the panel's
 * one cell, so it is as tall as the tallest in every language and at any
 * text size. scripts/picture-tabs-walk.mjs measures it in all 21 languages,
 * at the phone's own text size and at its largest.
 *
 * What would go wrong if this broke: the sheet's top edge, its title and the
 * picture jump each time the reader changes tab; or a tab not shown can be
 * tapped, focused or read aloud through the one shown.
 */

const src = fs.readFileSync(path.join(process.cwd(), "components/share/PictureSheet.tsx"), "utf8");
const at = src.indexOf('role="tabpanel"');
const panel = src.slice(src.lastIndexOf("<div", at), src.indexOf("{/* The reader's own photo", at));
const layer = src.slice(src.indexOf("function TabLayer("), src.indexOf("const TABS"));

describe("the verse picture's tabs share one cell", () => {
  it("the panel is a grid holding a layer for each of the three tabs", () => {
    expect(panel).toMatch(/role="tabpanel"[^>]*className="[^"]*\bgrid\b/);
    for (const tab of ["look", "words", "size"]) expect(panel).toContain(`<TabLayer on={tab === "${tab}"}>`);
  });

  it("no tab's controls are mounted only while it is shown", () => {
    expect(panel).not.toMatch(/tab === "(look|words|size)" (\?|&&)/);
  });

  it("the layers stack in the cell, and one not shown keeps its room unseen and out of reach", () => {
    expect(layer).toMatch(/col-start-1 row-start-1/);
    expect(layer).toMatch(/on \? undefined : "invisible"/);
    expect(layer).toMatch(/aria-hidden=\{on \? undefined : true\}/);
    expect(layer).toMatch(/inert=\{!on\}/);
  });
});
