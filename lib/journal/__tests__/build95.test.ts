import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useChurchDayAtOnce } from "@/lib/calendar/useChurchDay";
import { isWriting } from "@/lib/journal/writing";
import { scrollForWritingLine } from "@/lib/journal/writingLine";

/**
 * The journal's faults of build 95 (note 4, the owner on 2026-11-13: "notebook
 * is not really optimized + some visual and ux bugs"), found on a walk as a
 * new reader at 390 with a finger, each measured before it was mended:
 *
 *   the page drops as it      Today's page stood as an empty 200px for a
 *   arrives                   frame and then as itself, 268px: the filters,
 *                             the search and every entry dropped 68px.
 *   the keyboard hides the    On a page with nothing written, the keyboard
 *   kinds                     coming up scrolled the sheet 74px to show the
 *                             foot of an empty field: Reflection, Prayer and
 *                             Question went under the sheet's head.
 *   the wash is not under     On a phone the words were written at 16px and
 *   its words                 their wash laid at 17px, and the wash was
 *                             padded on each line besides: it broke its
 *                             lines in other places (59px of wash under
 *                             30px of words) and fell 1.7px further under
 *                             its words with every line.
 *
 * The walk that sees each on the export is scripts/mock-journal.mjs
 * (WALK=1 FLOWS="build 95").
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const code = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

describe("the journal's page for the day arrives whole", () => {
  const today = code(read("components/journal/TodayPage.tsx"));

  it("is drawn from the day known in the first frame", () => {
    expect(today).toContain("useChurchDayAtOnce()");
    expect(today).not.toMatch(/useChurchDay\(\)/);
  });

  it("holds no stand-in of another height for the frame before", () => {
    expect(today).not.toMatch(/min-h-\[200px\]/);
    expect(today).toMatch(/if \(!day\) return null;/);
  });

  it("reads the day's highlights with the day, not a frame after it", () => {
    expect(today).not.toMatch(/useEffect/);
    expect(today).not.toMatch(/setHighlights/);
  });

  it("bakes no date into the export: on the server there is no day", () => {
    function Day() {
      const day = useChurchDayAtOnce();
      return createElement("span", null, day ? "a day" : "none");
    }
    expect(renderToStaticMarkup(createElement(Day))).toBe("<span>none</span>");
  });
});

describe("the keyboard comes up and the page stays", () => {
  // The walk's own numbers: a 390 by 844 phone, a keyboard of 320px. The
  // sheet's scrolling part ends at 450; the page's one field begins at 250
  // and was made 253px tall when the sheet opened; nothing is written, so
  // its words are one line.
  const empty = { fieldTop: 250, fieldBottom: 503, wordsHeight: 31, scrollerBottom: 450 };

  it("does not scroll a page with nothing written", () => {
    expect(scrollForWritingLine(empty)).toBe(0);
  });

  it("scrolls by what the last line is under the foot, and the room under it", () => {
    // Ten lines written: the words end at 250 + 280 = 530, the field with them.
    expect(scrollForWritingLine({ fieldTop: 250, fieldBottom: 530, wordsHeight: 280, scrollerBottom: 450 })).toBe(104);
    expect(scrollForWritingLine({ fieldTop: 250, fieldBottom: 530, wordsHeight: 280, scrollerBottom: 450, room: 0 })).toBe(80);
  });

  it("never reads past the field's own foot", () => {
    expect(scrollForWritingLine({ fieldTop: 100, fieldBottom: 144, wordsHeight: 900, scrollerBottom: 450 })).toBe(0);
  });

  it("is what the writing sheet keeps the line in view by", () => {
    const composer = code(read("components/journal/JournalComposer.tsx"));
    expect(composer).toContain("scrollForWritingLine(");
    // The field's foot against the sheet's, which is what scrolled an empty page.
    expect(composer).not.toMatch(/el\.getBoundingClientRect\(\)\.bottom - scroller\.getBoundingClientRect\(\)\.bottom/);
  });

  it("looks after the line the cursor is on, wherever in the words it is, and in a line's own field", () => {
    const composer = code(read("components/journal/JournalComposer.tsx"));
    // Until build 95 only a cursor at the very end of a field was kept in view.
    expect(composer).not.toMatch(/atEnd/);
    expect(composer).toContain("wordsHeightOf(el, el.selectionEnd)");
    expect(composer).toMatch(/el instanceof HTMLTextAreaElement \|\| el instanceof HTMLInputElement/);
    // A line tapped in the middle of a long page: its words up to the cursor end 420px down the field,
    // the keyboard leaves the sheet's foot at 450, and the field began at 180.
    expect(scrollForWritingLine({ fieldTop: 180, fieldBottom: 980, wordsHeight: 420, scrollerBottom: 450 })).toBe(174);
    // One already in sight is left where it is.
    expect(scrollForWritingLine({ fieldTop: 180, fieldBottom: 980, wordsHeight: 200, scrollerBottom: 450 })).toBe(0);
  });

  it("a finder that shuts gives the cursor back to the words, so the keyboard does not fall", () => {
    const hook = code(read("components/journal/usePage.ts"));
    expect(hook).toMatch(/const shutPanel = \(\) => \{\s*if \(panel === "verse" && cursor && isWriting\(\)\) \{/);
    expect(hook).toMatch(/const after = page\.blocks\.findIndex\(\(b, i\) => i > index && b\.type === "text"\);\s*if \(after >= 0 && isWriting\(\)\) \{/);
    const blocks = code(read("components/journal/PageBlocks.tsx"));
    expect(blocks).toContain('onClick={() => (panel === "verse" ? editor.shutPanel() : setPanel("verse"))}');
  });
});

describe("a highlight's wash lies under its words", () => {
  const blocks = code(read("components/journal/PageBlocks.tsx"));
  const wash = /<span data-page-wash="" className="([^"]+)"/.exec(blocks)?.[1] ?? "";

  it("is found", () => {
    expect(wash).toContain("bg-[var(--hl-verse)]");
  });

  it("takes no room on the line: no padding and no margin at its ends", () => {
    // Anything here breaks the wash's lines sooner than the field's.
    expect(wash.split(/\s+/).filter((c) => /^-?(p[xse]?|m[xse]?|border(-[xse])?)-/.test(c) && !/^py-/.test(c))).toEqual([]);
  });

  it("still reaches past the words at each end, as a shadow", () => {
    expect(wash).toMatch(/shadow-\[3px_0_0_var\(--hl-verse\),-3px_0_0_var\(--hl-verse\)\]/);
    expect(wash).toContain("box-decoration-clone");
  });

  it("is laid at the size the words are written at, on a phone too", () => {
    const css = read("app/globals.css");
    // The phone's pin to 16px, and after it the sheet's own words back at the reading size.
    const pin = css.indexOf("textarea,\n select {\n font-size: 16px;");
    const own = css.indexOf('[data-journal-composer] :is(textarea, input:not([type="checkbox"]):not([type="radio"])).text-body {\n font-size: var(--text-body);');
    expect(pin).toBeGreaterThan(-1);
    expect(own).toBeGreaterThan(pin);
    // Every field the wash can lie behind, and its fellows on the page, ask for that size.
    for (const field of blocks.match(/<(?:textarea|input) dir="auto"[\s\S]*?\/>/g) ?? []) {
      if (/font-serif|words,/.test(field) && !/text-\[\d+px\]/.test(field)) expect(field).toMatch(/text-body|words,/);
    }
    expect(blocks).toMatch(/const words = cn\("[^"]*\btext-body\b/);
  });
});

/**
 * Note 6, the owner's own words for the journal's bugs (2026-11-13): "whenever
 * you click on a different section in the journal UI the typing pad pops up
 * automatically and it's buggy when it pops up". The sections are the sheet's
 * own: Write and an entry opened (the sheet gave the cursor to the words a
 * third of a second on), Verse (its finder took it), Quote and More's blocks
 * (the new card took it). The keyboard comes only from a tap where they write.
 */
describe("the keyboard comes only from the reader's tap where they write", () => {
  const field = (tagName: string, inside: string | null, type?: string) => ({
    activeElement: { tagName, type, closest: (selector: string) => (inside && selector.includes(inside) ? {} : null) },
  });

  it("a reader with no cursor is not writing", () => {
    expect(isWriting({ activeElement: null })).toBe(false);
    // The page itself, as when the sheet has just opened, or a tool tapped with the keyboard down.
    expect(isWriting(field("BODY", null))).toBe(false);
    expect(isWriting(field("BUTTON", "[data-journal-composer]"))).toBe(false);
    // A checklist's box is in the sheet and is no place to write.
    expect(isWriting(field("INPUT", "[data-journal-composer]", "checkbox"))).toBe(false);
    // A field of another part of the app is not the journal's.
    expect(isWriting(field("INPUT", null, "search"))).toBe(false);
  });

  it("a reader with the cursor in the page, or in a tool's own field, is", () => {
    expect(isWriting(field("TEXTAREA", "[data-journal-composer]"))).toBe(true);
    expect(isWriting(field("INPUT", "[data-journal-composer]", "text"))).toBe(true);
    // Verse's finder and the notebook's field stand in the tools at the sheet's foot.
    expect(isWriting(field("INPUT", "[data-page-toolbar]", "search"))).toBe(true);
  });

  it("the sheet gives the cursor to no field as it opens", () => {
    const composer = code(read("components/journal/JournalComposer.tsx"));
    expect(composer).not.toMatch(/\.focus\(/);
    expect(composer).not.toMatch(/window\.setTimeout\(/);
  });

  it("a card laid, a card taken away and a card gone back to move a cursor only for a reader who has one", () => {
    const hook = code(read("components/journal/usePage.ts"));
    // The one place a field is given the cursor, and it asks first.
    expect(hook.match(/\.focus\(/g)).toHaveLength(1);
    expect(hook).toMatch(/if \(ask\.cursor !== false\) \{\s*field\.focus\(\{ preventScroll: true \}\);/);
    expect(hook).toContain("focusAsk.current = { ...focus, cursor: isWriting() };");
    expect(hook).toContain('focusAsk.current = { index, at: "end", field, cursor: isWriting() };');
    // With no cursor given, the new block is still brought into view.
    expect(hook).toMatch(/\}\s*field\.scrollIntoView\(\{ block: "nearest" \}\);/);
    // And a page opens with no cursor left over from the page before it.
    expect(hook).toMatch(/if \(open\) setCursorState\(null\);/);
  });

  it("Verse's finder takes the cursor only from a reader who is writing", () => {
    const blocks = code(read("components/journal/PageBlocks.tsx"));
    const finder = blocks.slice(blocks.indexOf("function VerseFinder"));
    expect(finder).toMatch(/if \(isWriting\(\)\) input\.current\?\.focus\(\{ preventScroll: true \}\);/);
    expect(finder.match(/\.focus\(/g)).toHaveLength(1);
  });
});
