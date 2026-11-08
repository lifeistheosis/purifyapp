// Writing a journal page (1.9, docs/1.9-build/JOURNAL.md): the sheet that
// wrote words now writes a page, a title, the words, verse cards, quotes of
// one's own and highlights, with its tools at the sheet's foot. A verse's
// note stays words alone, as it is kept on its verse. The format itself is
// lib/journal/__tests__/page.test.ts's; this holds the editor to the house.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const composer = read("components/journal/JournalComposer.tsx");
const blocks = read("components/journal/PageBlocks.tsx");
const hook = read("components/journal/usePage.ts");
const css = read("app/globals.css");

describe("an entry is written as a page; a verse's note as words", () => {
  it("the composer draws the page's blocks for an entry, and one field for a note", () => {
    expect(composer).toContain("usePage(open, draft.body,");
    expect(composer).toMatch(/\{isNote \? \([\s\S]*?<textarea[\s\S]*?\) : \([\s\S]*?<PageBlocks editor=\{editor\}/);
    // The tools stand still at the sheet's foot, under the part that scrolls.
    expect(composer).toContain("foot={isNote ? undefined : <PageToolbar editor={editor} />}");
    // Done is for a page with something in it: a title alone, or a card alone, counts.
    expect(composer).toContain("pageIsEmpty(editor.page)");
  });

  it("the page is read from the body as the sheet opens, and written back on every change, within the server's limit", () => {
    expect(hook).toMatch(/if \(open !== wasOpen\) \{[\s\S]*?if \(open\) setPage\(fresh\(body\)\)/);
    expect(hook).toContain("if (text.length > MAX_BODY) return false;");
    expect(hook).toContain("onBody(text)");
  });
});

describe("the page's parts, from the house's own", () => {
  it("a verse card shows the app's own words and keeps none; with no signal and none kept, it opens the passage", () => {
    expect(blocks).toContain("useVerseRangeWords(block.book, block.chapter, block.from, block.to, true)");
    const card = blocks.slice(blocks.indexOf("function VerseCard"), blocks.indexOf("function LibraryCard"));
    expect(card).not.toMatch(/<textarea|<input/);
    // Never a row of bare verse numbers: the saved verse's way, "Open to read".
    expect(card).toMatch(/states\.every\(\(s\) => s\.words\.status === "missing"\)[\s\S]*?t\("saved\.openToRead"\)/);
    expect(card).toContain("words.text ? (");
  });

  it("a verse quoted from the Bible keeps its words on the device first", () => {
    const row = read("components/bible/VerseRow.tsx");
    const study = row.slice(row.indexOf('key: "journal"'), row.indexOf('key: "journal"') + 500);
    expect(study).toContain("keepText(verseKey(book, chapter, verse.n), verse.text);");
  });

  it("a quote of one's own has the writer's own name for its giver, and never the library's mark", () => {
    const quote = blocks.slice(blocks.indexOf("function QuoteCard"), blocks.indexOf("function RemoveButton"));
    expect(quote).toContain('t("journal.page.quoteBy")');
    expect(quote).not.toMatch(/library/i);
  });

  it("a highlight is the Bible's wash, laid line by line behind the words, never a box", () => {
    expect(blocks).toContain("box-decoration-clone rounded-[4px] bg-[var(--hl-verse)]");
    expect(blocks).toContain("data-hl-color={block.color} style={highlightVars(block.color)}");
    // The colours are chosen with the Bible's own picker.
    expect(blocks).toContain("<HighlightPicker");
  });

  it("a verse is found with the one search field and the Bible's own search", () => {
    expect(blocks).toContain("<SearchField");
    expect(blocks).toContain("searchBible(q, 6, {}, books)");
  });

  it("every control 44px or more, icons from the house's set, nothing physical", () => {
    expect(blocks).toMatch(/inline-flex h-11 shrink-0 items-center gap-2 rounded-pill border/);
    expect(blocks).toMatch(/absolute end-0\.5 top-0\.5 inline-flex h-11 w-11/);
    expect(blocks).toContain('tall ? "min-h-[30vh]" : "min-h-11"');
    for (const icon of ["Book", "ChatBubble", "Close", "Sparkle"]) expect(blocks).toContain(`from "@/components/ui/icons/${icon}"`);
    expect(blocks).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-\d|\btext-(?:left|right)\b/);
  });

  it("the title keeps its size on a phone, and the page's fields draw no square frame", () => {
    expect(css).toContain('[data-journal-composer] input[data-journal-title]:not([type="checkbox"]):not([type="radio"]) {\n font-size: 24px;');
    expect(css).toContain("[data-journal-composer] :is(textarea, input):focus-visible {\n outline: none;");
  });
});
