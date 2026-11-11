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
    expect(composer).toContain("foot={isNote ? undefined : <PageToolbar editor={editor} notebooks={notebooks} />}");
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
    // The tools: four tiles of a quarter row each, 56px tall, never a row that scrolls sideways.
    expect(blocks).toContain('className="grid grid-cols-4 gap-1 px-2 py-1.5"');
    expect(blocks).toMatch(/tap-press flex h-14 min-w-0 flex-col items-center/);
    expect(blocks).toMatch(/absolute end-0\.5 top-0\.5 inline-flex h-11 w-11/);
    expect(blocks).toContain('tall ? "min-h-[30vh]" : "min-h-11"');
    for (const icon of ["Book", "ChatBubble", "Close", "Highlighter"]) expect(blocks).toContain(`from "@/components/ui/icons/${icon}"`);
    expect(blocks).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-\d|\btext-(?:left|right)\b/);
  });

  it("the title keeps its size on a phone, and the page's fields draw no square frame", () => {
    expect(css).toContain('[data-journal-composer] input[data-journal-title]:not([type="checkbox"]):not([type="radio"]) {\n font-size: 24px;');
    expect(css).toContain("[data-journal-composer] :is(textarea, input):focus-visible,\n[data-page-props-panel] input:focus-visible {\n outline: none;");
  });
});

describe("Plus's blocks in the editor (step 2)", () => {
  it("are in the More panel, shown with the Plus mark without Plus, and the sheet named for the journal", () => {
    expect(blocks).toMatch(/const locked = usePlusFeatures\(\) === false;/);
    expect(blocks).toMatch(/if \(locked\) upgrade\.open\("journal"\);\s*else editor\.insert\(block\);/);
    const choice = blocks.slice(blocks.indexOf("function MoreChoice"), blocks.indexOf("function Tool("));
    expect(choice).toContain("{locked ? <PlusMark");
    expect(choice).toContain("min-h-12");
    for (const k of ["journal.page.heading", "journal.page.checklist", "journal.page.divider", "journal.page.callout"]) expect(blocks).toContain(`t("${k}")`);
  });

  it("a checklist's boxes are checkboxes 44px across; a callout is a soft box, never a side stripe", () => {
    const check = blocks.slice(blocks.indexOf("function CheckBlock"), blocks.indexOf("function DividerBlock"));
    expect(check).toContain('role="checkbox"');
    expect(check).toContain("aria-checked={item.done}");
    expect(check).toMatch(/grid h-11 w-11 shrink-0 place-items-center/);
    const callout = blocks.slice(blocks.indexOf("function CalloutBlock"), blocks.indexOf("function RemoveButton"));
    expect(callout).toContain("rounded-2xl bg-paper/[0.07]");
    expect(callout).not.toMatch(/border-s-|border-l-|border-r-|border-e-/);
  });

  it("a heading keeps its size on a phone", () => {
    expect(css).toContain('[data-journal-composer] input[data-page-heading]:not([type="checkbox"]):not([type="radio"]) {\n font-size: 20px;');
  });
});

describe("notebooks and tags (Plus, step 2b)", () => {
  const client = read("components/journal/JournalClient.tsx");
  const feed = read("components/journal/JournalFeed.tsx");

  it("one line under the title once the page has them, the Plus mark and the upgrade sheet without Plus", () => {
    // The line stands only on a page that has a notebook or tags; the way to
    // give it one is in More (writingSheet.test.ts, "no door to Plus under
    // Title": build 93 note 8).
    const line = blocks.slice(blocks.indexOf('data-page-props=""'), blocks.indexOf('data-page-props=""') + 900);
    expect(line).toMatch(/if \(locked\) upgrade\.open\("journal"\);\s*else editor\.setPanel/);
    expect(line).toContain("{locked ? <PlusMark");
    expect(line).toContain("min-h-11");
    expect(blocks).toContain('label={editor.page.notebook || t("journal.page.addToNotebook")}');
  });

  it("a notebook is the pages that name it: gathered from the pages, offered again, and a chip in the list", () => {
    expect(client).toMatch(/const name = parsePage\(r\.body\)\.notebook;/);
    expect(client).toContain("notebooks={notebooks}");
    expect(feed).toContain("notebooks.map((n) => (");
    expect(feed).toContain("pages.get(i.key)?.notebook === notebook");
    const panel = blocks.slice(blocks.indexOf("function PropsPanel"), blocks.indexOf("function MoreChoice"));
    expect(panel).toContain("editor.setNotebook(n)");
    expect(panel).toContain("cleanTags([...tags, tag])");
    expect(panel).toContain('t("journal.page.removeTag", { tag: x })');
  });
});

describe("a page's style (Plus, step 2c)", () => {
  it("only the house's own: Lora or DM Sans, the start or the centre, never left or right, no colour of its own", () => {
    expect(blocks).toContain('const font = page.style?.font === "sans" ? "font-sans" : "font-serif";');
    expect(blocks).toContain('const align = page.style?.align === "center" ? "text-center" : "text-start";');
    const rows = blocks.slice(blocks.indexOf("function StyleRows"), blocks.indexOf("function MoreChoice"));
    expect(rows).not.toMatch(/text-(?:left|right)\b|\[#|rgb\(|text-(?:red|blue|green|yellow|amber|gold)/);
    // The words the app already has first: Font, Serif, Sans, Alignment, Centre.
    for (const k of ["bible.fontLabel", "bible.fontSerif", "settings.fontSans", "picture.align", "picture.centre"]) expect(rows).toContain(`t("${k}")`);
    expect(rows).toMatch(/role="radiogroup"/);
  });

  it("the writer's words take the style; the wash behind them follows it, line for line", () => {
    expect(blocks).toContain("look={cn(font, align)}");
    expect(blocks).toContain('const words = cn("block w-full whitespace-pre-wrap break-words text-body leading-[1.7]", look);');
  });
});

describe("a checklist keeps up with a fast typist", () => {
  it("a new line is drawn and takes the cursor in the same keystroke", () => {
    const check = blocks.slice(blocks.indexOf("function CheckBlock"), blocks.indexOf("function DividerBlock"));
    expect(check).toContain("flushSync(() => onItems(next));");
    expect(check).not.toContain("requestAnimationFrame");
  });
});

describe("each Plus block's icon says what it is", () => {
  it("Heading wears the house's heading glyph, never the musical note", () => {
    expect(blocks).toContain('<MoreChoice icon={<Heading size={18} />} label={t("journal.page.heading")}');
    expect(blocks).not.toContain("icons/Note");
  });
});

describe("the journal on a computer (step 2e)", () => {
  const client = read("components/journal/JournalClient.tsx");
  const feed = read("components/journal/JournalFeed.tsx");

  it("with notebooks: the notebooks at the side and the page in its column; a tablet in the apps keeps one column", () => {
    expect(client).toContain('md:grid md:max-w-[968px] md:grid-cols-[200px_minmax(0,1fr)] md:gap-12 native-md-block');
    const rail = client.slice(client.indexOf("function NotebookRail"));
    expect(rail).toContain('className="hidden md:block native-md-hidden"');
    expect(rail).toContain("aria-pressed={chosen === n}");
    expect(rail).toMatch(/min-h-11 w-full/);
  });

  it("one choice of notebook for the side and the chips, the chips stepping aside where the side shows", () => {
    expect(client).toContain("notebook={book}");
    expect(client).toContain("onNotebook={setBook}");
    expect(feed).toContain('railShown ? "contents md:hidden native-md-contents" : "contents"');
    expect(css).toContain("html.is-native .native-md-contents { display: contents; }");
  });
});

describe("a reopened page knows where its caret is", () => {
  it("the caret put at the end on opening is told to the editor, so a card goes after the words", () => {
    expect(composer).toContain("if (block !== undefined) setCursor({ index: Number(block), start: el.value.length, end: el.value.length });");
  });
});
