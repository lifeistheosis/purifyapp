// Build 90 note 10: the Fathers' paragraphs answer a finger as a verse does.
// His word was about the Bible ("when you double tap, it automatically
// highlights the last color you picked"); the colour picked last is one for
// both readers, so a paragraph of the Fathers takes the same double tap, the
// same soft tap in the hand and the same Undo, and its hold still opens its
// tools.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("a paragraph of the Fathers", () => {
  const row = read("components/saints/ParagraphRow.tsx");

  it("decides a tap and a double tap by the verse's own rules", () => {
    expect(row).toContain('import { isSecondTap, isTap, type TapAt } from "@/lib/bible/verseGesture";');
    expect(row).toMatch(/onTouchEnd=\{onTouchEnd\}/);
    const end = row.slice(row.indexOf("function onTouchEnd("), row.indexOf("function onTouchStart("));
    expect(end).toMatch(/isTap\(\{\s*quick,/);
    expect(end).toMatch(/if \(isSecondTap\(lastTapRef\.current, here\)\) \{[\s\S]*?quickHighlight\(\);\s*return;/);
    // A lone tap does nothing.
    expect(end).not.toContain("setShowTools(true)");
  });

  it("highlights in the colour picked last, or takes it off, felt and offered back", () => {
    const quick = row.slice(row.indexOf("function quickHighlight("), row.indexOf("function onTouchEnd("));
    expect(quick).toContain("const id = lastHighlightColor();");
    expect(quick).toContain("rememberHighlightColor(id);");
    expect(quick).toContain("if (removing) ann.toggleHighlight();");
    expect(quick).toContain("softTick();");
    expect(quick).toMatch(/restore: \(\) => writeParagraphAnnotation\(saintSlug, workSlug, sectionN, paragraphIdx, before\)/);
  });

  it("still opens its tools on a hold", () => {
    const start = row.slice(row.indexOf("function onTouchStart("), row.indexOf("function onTouchMove("));
    expect(start).toMatch(/setShowTools\(true\);/);
  });

  it("is offered back by the section's Undo", () => {
    const reader = read("components/saints/WritingReader.tsx");
    expect(reader).toContain("const quick = useUndo();");
    expect(reader).toContain("onQuickHighlight={quick.offer}");
    expect(reader).toContain("<UndoBar entry={quick.entry} onUndo={quick.undo} />");
  });
});
