import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Build 97 note 9's rule, held for the Greek word study: "notice how the
 * words section move the UI up fix that" was said of the verse picture's
 * sheet, and the rule his words set (the edge, the title and the controls
 * stand still when the tab changes) holds for every sheet with tabs. The old
 * study emptied its list as the testament changed and drew the other one's
 * verses only when they came back from purifyapp.net: the sheet went short,
 * its edge, title and tabs fell, and then they rose again (Updates 57
 * measured it at 390 by 844, in English and Arabic, at 1x and 1.3x:
 * scripts/word-study-tabs-walk.mjs). Now both testaments are asked for as
 * the study opens and their lists share one cell, so the panel is as tall as
 * the taller, as the picture sheet's three tabs are (pictureTabsStill).
 *
 * What would go wrong if this broke: the sheet jumps down and back up each
 * time the reader changes testament, and one that opened at its lower rest
 * ends higher than it stood; or the list not shown can be tapped, focused or
 * read aloud through the one shown.
 */

const src = fs.readFileSync(path.join(process.cwd(), "components/bible/WordStudySheet.tsx"), "utf8");
const body = src.slice(src.indexOf("export function WordStudyBody("));
const choose = body.slice(body.indexOf("const choose = "), body.indexOf("const more = "));
const cell = body.slice(body.indexOf('className="grid"'), body.indexOf('t("bible.wordStudyCredit")'));

describe("the word study's two testaments share one cell", () => {
  it("each testament's list is a tab panel in one grid cell", () => {
    expect(cell).toMatch(/role="tabpanel"/);
    expect(cell).toMatch(/col-start-1 row-start-1/);
    expect(cell).toMatch(/\(\["ot", "nt"\] as const\)\.map/);
  });

  it("the list not shown keeps its room, unseen and out of reach", () => {
    expect(cell).toMatch(/on \? undefined : "invisible"/);
    expect(cell).toMatch(/aria-hidden=\{on \? undefined : true\}/);
    expect(cell).toMatch(/inert=\{!on\}/);
  });

  it("changing the testament never empties a list", () => {
    expect(choose).toMatch(/setTab\(key\)/);
    expect(choose).not.toMatch(/setItems\(\[\]\)|items: \[\]/);
  });

  it("both testaments are asked for as the study opens, the open one first", () => {
    expect(body).toMatch(/for \(const key of \[startIn, startIn === "ot" \? "nt" : "ot"\] as const\)/);
  });
});
