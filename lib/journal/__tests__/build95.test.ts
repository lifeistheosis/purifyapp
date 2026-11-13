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

/**
 * The journal's page, redrawn in the approved look (note 4, "needs to be
 * refined + smoother"): it opens as a chapter does, today's page stands on
 * the night, the question of an empty journal is a row to tap, and Write
 * stands on the house's fade, out of the keyboard's way.
 */
describe("the journal's page in the approved look", () => {
  const client = code(read("components/journal/JournalClient.tsx"));
  const today = code(read("components/journal/TodayPage.tsx"));
  const write = code(read("components/journal/WriteButton.tsx"));

  it("opens as a chapter opens: the mark, its name, one line in italics, the short rule", () => {
    expect(client).toMatch(/<header className="text-center">\s*<PurifyMark aria-hidden size=\{22\}/);
    expect(client).toMatch(/<h1 id="journal-title" className="page-open-title [^"]*font-heading/);
    expect(client).toMatch(/className="page-open-sub [^"]*italic[^"]*">\{t\("journal\.lede"\)\}/);
    expect(client).toContain('className="page-open-rule mx-auto mt-5 block h-px w-7 bg-paper/25"');
  });

  it("today's page stands on the night, as the one thing that leads", () => {
    expect(today).toMatch(/className="dark-island [^"]*rounded-\[22px\] border border-paper\/12 bg-night-deep/);
  });

  it("an empty journal's question is a row to tap, in the house's tray, with the pen", () => {
    const empty = client.slice(client.indexOf('data-journal-empty=""'), client.indexOf("<JournalFeed"));
    expect(empty).toMatch(/<div className="theology-tray /);
    expect(empty).toMatch(/className="theology-row tap-press flex min-h-\[64px\] w-full/);
    expect(empty).toContain("<Pen size={18} />");
  });

  it("Write stands on the fade the chapter's pill floats on, and stands down for the keyboard", () => {
    expect(write).toContain('<span aria-hidden className="pill-fade pointer-events-none absolute inset-x-0 -z-10" />');
    expect(write).toContain('"--pill-lift":');
    expect(write).toMatch(/if \(keyboard\) return null;/);
    // Still the journal's one way to write, and still not Plus's.
    expect(write.match(/data-journal-write=""/g)).toHaveLength(1);
    expect(write).not.toMatch(/PlusMark/);
    // The fade is always under it: no state of the journal leaves the button lying on words.
    expect(write).not.toMatch(/\bfade\b\s*\?/);
  });
});

/**
 * Note 6: "visuals aren't really that good. even the image system". A page's
 * picture is its cover (Plus, from the verified artwork the apps carry). It
 * was chosen at the foot of the notebook's panel, from 60px squares, and shown
 * as a flat strip cut through the middle of the icon, and nowhere else.
 */
describe("the page's picture", () => {
  const blocks = code(read("components/journal/PageBlocks.tsx"));
  const feed = code(read("components/journal/JournalFeed.tsx"));

  it("has a row of its own in More, with Plus's mark for a reader without Plus, and promises it to no one", () => {
    const more = blocks.slice(blocks.indexOf('data-page-more=""'), blocks.indexOf('role="toolbar"'));
    expect(more).toMatch(/<MoreChoice\s+cover\s+icon=\{<Picture size=\{18\} \/>\}\s+label=\{t\("journal\.page\.cover"\)\}\s+locked=\{locked\}/);
    // Without Plus the row opens the upgrade sheet, and never the pictures.
    expect(more).toMatch(/if \(locked\) \{\s*setPanel\(null\);\s*upgrade\.open\("journal"\);\s*\} else setPanel\("cover"\);/);
  });

  it("is chosen from one row of pictures large enough to tell apart, the chosen one edged", () => {
    const panel = blocks.slice(blocks.indexOf("function CoverPanel("), blocks.indexOf("function StyleRows("));
    expect(panel).toContain('role="radiogroup"');
    expect(panel).toMatch(/className="no-scrollbar -mx-3 mt-1 flex snap-x gap-2 overflow-x-auto/);
    expect(panel).toMatch(/h-\[112px\] w-\[88px\] shrink-0 snap-start/);
    expect(panel).toContain('current === c.id ? "border-paper" : "border-transparent"');
    // Each is named for a screen reader by what it shows, from the rights registry.
    expect(panel).toContain("aria-label={c.alt}");
    // And it is no longer at the foot of the notebook's panel.
    expect(blocks.slice(blocks.indexOf("function PropsPanel("), blocks.indexOf("function CoverPanel("))).not.toMatch(/<CoverPanel|COVERS\.map/);
  });

  it("stands at the page's head, rounded as the app's cards are, cut from where an icon's face is, and credited", () => {
    const head = blocks.slice(blocks.indexOf('data-page-cover=""'), blocks.indexOf('data-journal-title=""'));
    expect(head).toContain('className="block h-44 w-full rounded-[18px] object-cover object-[50%_22%]"');
    expect(head).toContain("{cover.credit}");
    expect(head).toContain("alt={cover.alt}");
  });

  it("shows on its page in the journal's list", () => {
    expect(feed).toContain("cover: coverById(page.cover)?.src");
    expect(feed).toMatch(/data-journal-entry-cover="" className="[^"]*size-14 shrink-0 rounded-\[12px\] object-cover/);
    // The row is still one button, the words first.
    expect(feed).toMatch(/data-journal-entry="" className="flex w-full items-start gap-3 py-4 pe-1 text-start/);
  });
});
