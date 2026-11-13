import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useChurchDayAtOnce } from "@/lib/calendar/useChurchDay";
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
