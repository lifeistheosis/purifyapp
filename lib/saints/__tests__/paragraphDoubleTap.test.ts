// Build 90 note 10: the Fathers' paragraphs answer a finger as a verse does.
// His word was about the Bible ("when you double tap, it automatically
// highlights the last color you picked"); the colour picked last is one for
// both readers, so a paragraph of the Fathers takes the same double tap, the
// same soft tap in the hand and the same Undo. Its hold selects the word
// under the finger since build 93 note 13 ("highlight whichever section or
// whichever word you want ... so it doesn't just highlight the whole
// paragraph"): the tools are the selection's, the whole paragraph one tap away.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("a paragraph of the Fathers", () => {
  const row = read("components/saints/ParagraphRow.tsx");

  it("decides a tap and a double tap by the verse's own rules", () => {
    expect(row).toContain('import { isSecondTap, isTap, isTouchContextMenu, type TapAt } from "@/lib/bible/verseGesture";');
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

  it("gives its hold to the selection, which marks any of its words", () => {
    // The row says where its marks are kept and draws them; it opens no sheet of its own on a hold.
    expect(row).toContain('data-mk={placeAttr({ kind: "saint", saintSlug, workSlug, sectionN, paragraphIdx })}');
    expect(row).toContain("<MarkedText text={text} marks={ann.marks} skip={saintSlug} />");
    expect(row).not.toContain("MobileVerseToolbar");
    // No box round the paragraph a finger is on (the house's quiet way).
    expect(row).not.toMatch(/shadow-\[inset_0_0_0_1px/);
    const reader = read("components/saints/WritingReader.tsx");
    expect(reader).toContain("<SelectionToolsLazy />");
    const tools = read("components/reading/SelectionTools.tsx");
    // A hold on a word selects it; the whole paragraph is one tap from there.
    expect(tools).toMatch(/const word = wordAt\(measured, x, y\);/);
    expect(tools).toContain('t("saints.words.paragraph")');
    expect(tools).toContain("widen(wholeSpan(sel.text))");
    // The selected words wear the ghost a held verse wears.
    expect(tools).toContain('className="verse-ghost absolute rounded-[5px]"');
  });

  it("is offered back by the section's Undo", () => {
    const reader = read("components/saints/WritingReader.tsx");
    expect(reader).toContain("const quick = useUndo();");
    expect(reader).toContain("onQuickHighlight={quick.offer}");
    expect(reader).toContain("<UndoBar entry={quick.entry} onUndo={quick.undo} />");
  });
});
