import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Each block of a journal page has a form of its own (build 93 note 8, the
 * owner on 2026-11-11, of Verse, Quote, Highlight and More: "I want all of it
 * refined, and I want all of them to actually be unique in their context and
 * their use").
 *
 * Before: a verse, a quote of one's own and a quote from the library were
 * three boxes alike. The verse's place was a small line at its foot; the
 * library quote's way back was a separate "Open" at its side.
 *
 * Build 93 took all three out of their boxes, and build 95 (note 6, the
 * owner on 2026-11-13: "visuals aren't really that good. even the image
 * system and the quoting system") found the result too faint: three small
 * grey lines of 13px, told apart by a 15px glyph. What stands now is one rule
 * a reader can see: what is brought onto the page from the app's library is
 * raised (the house's tray) and opens where it is from; what the writer types
 * is the page itself. The raised two are not alike: each has its own form.
 * None stands beside a rule.
 *
 *   Scripture          a raised card: the Book and its place as a heading,
 *                      in the reading face, that opens the passage at the
 *                      verse; then the words
 *   a Father's words   a raised card: the words, then at their foot the
 *                      Quill and the source as the way back, as an epigraph
 *                      names its author
 *   a quote of one's   on the page itself: the words in italic, then the
 *   own                speech mark and who said it, typed by the writer; no
 *                      link, never the Quill
 *
 * How they are drawn in a built app is scripts/mock-journal.mjs.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const blocks = read("components/journal/PageBlocks.tsx");
const code = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
const part = (from: string, to: string) => code(blocks.slice(blocks.indexOf(from), blocks.indexOf(to)));

const verse = part("function VerseCard(", "function VerseCardWords(");
const verseWords = part("function VerseCardWords(", "function LibraryCard(");
const father = part("function LibraryCard(", "function QuoteCard(");
const own = part("function QuoteCard(", "function HeadingBlock(");

describe("what is brought in is raised, what is typed is the page, and none stands beside a rule", () => {
  const figureOf = (src: string) => src.slice(src.indexOf("<figure"), src.indexOf(">", src.indexOf("className=", src.indexOf("<figure"))) + 200);

  it("Scripture and a Father's words stand on the house's tray; a quote of one's own on the page itself", () => {
    expect(figureOf(verse)).toContain("theology-tray relative rounded-[18px]");
    expect(figureOf(father)).toContain("theology-tray relative rounded-[18px]");
    expect(own.slice(own.indexOf("<figure"), own.indexOf("<label"))).not.toMatch(/theology-tray|\bbg-|\bborder\b/);
  });

  it("no rule down a side of any of them", () => {
    for (const src of [verse, verseWords, father, own]) expect(src).not.toMatch(/border-(s|e|l|r)\b|border-(s|e|l|r)-/);
  });

  it("the words of all three are in the size the app reads at", () => {
    expect(verseWords).toContain('"font-serif text-body leading-[1.7] text-paper/90"');
    expect(father).toContain('"whitespace-pre-line pe-8 font-serif text-body leading-[1.7] text-paper/90"');
    expect(own).toMatch(/font-serif text-body italic leading-\[1\.7\] text-paper /);
  });

  it("the writer's own words stand at the margin, and a quote of one's own is set in from them", () => {
    expect(blocks).toContain('const BLOCK_INSET = "ps-[23px]";');
    expect(own.match(/BLOCK_INSET/g)).toHaveLength(1);
    const words = part("function TextBlock(", "const BLOCK_INSET");
    expect(words).not.toContain("BLOCK_INSET");
    // Inside its card Scripture begins at the card's own edge, with its heading.
    expect(verseWords).not.toContain("BLOCK_INSET");
  });
});

describe("each wears the mark of what it is: its tool's own glyph (build 93 note 8)", () => {
  const toolbar = code(blocks.slice(blocks.indexOf('role="toolbar"'), blocks.indexOf("<HighlightNamesSheet")));

  it("Scripture wears the Book, as the Verse tool does", () => {
    expect(toolbar).toMatch(/<Tool icon=\{<Book size=\{18\} \/>\} label=\{t\("journal\.page\.addVerse"\)\}/);
    expect(verse).toContain('<Book size={16} aria-hidden className="shrink-0 text-paper/70" />');
    expect(verse).not.toMatch(/<Quill|<ChatBubble/);
  });

  it("a Father's words wear the Quill, as a gathered line of a Father does", () => {
    expect(father).toContain('<Quill size={15} aria-hidden className="shrink-0 text-paper/70" />');
    expect(read("components/florilegium/FlorilegiumDetail.tsx")).toContain("<Quill size={15} aria-hidden");
    expect(father).not.toMatch(/<Book |<ChatBubble/);
  });

  it("a quote of one's own wears the speech mark, as the Quote tool does, and never the Quill", () => {
    expect(toolbar).toMatch(/icon=\{<ChatBubble size=\{18\} \/>\}\s+label=\{t\("journal\.page\.addQuote"\)\}/);
    expect(own).toContain('<ChatBubble size={15} aria-hidden className="shrink-0 text-paper/55" />');
    expect(own).not.toMatch(/<Quill|<Book |<Link/);
  });

  it("the two raised forms are not alike: Scripture's place is a heading in the reading face, a Father's source a small line", () => {
    expect(verse).toMatch(/data-page-verse-place="" className="[^"]*\bfont-serif text-\[17px\] font-semibold\b/);
    expect(father).toMatch(/data-page-library-source="" className="[^"]*\bfont-sans text-caption font-semibold\b/);
  });
});

describe("Scripture: its place is its heading", () => {
  it("the place comes before the words, and opens the passage at the verse", () => {
    expect(verse.indexOf("<figcaption")).toBeGreaterThan(-1);
    expect(verse.indexOf("<figcaption")).toBeLessThan(verse.indexOf("<VerseCardWords"));
    expect(verse).toMatch(/<Link href=\{`\/bible\/\$\{block\.book\}\/\$\{block\.chapter\}#v\$\{block\.from\}`\} data-page-verse-place="" className="inline-flex min-h-11 /);
  });

  it("with no signal and nothing kept, the heading still stands, and under it the way to read", () => {
    expect(verseWords).toMatch(/states\.every\(\(s\) => s\.words\.status === "missing"\)[\s\S]*?<Link href=\{`\/bible\/\$\{block\.book\}\/\$\{block\.chapter\}#v\$\{block\.from\}`\}[\s\S]*?min-h-11[\s\S]*?t\("saved\.openToRead"\)/);
  });

  it("asked for again its edge is lit for a moment, and nothing on the page moves for it", () => {
    // An outline takes no room: the card is the same size lit and unlit.
    expect(verse).toContain('noticed ? "outline-paper/60" : "outline-transparent"');
    expect(verse).toContain("outline outline-1 -outline-offset-1 motion-safe:transition-[outline-color]");
  });

  it("its words are never typed here", () => {
    expect(verse + verseWords).not.toMatch(/<textarea|<input/);
  });
});

describe("a Father's words: the words, then the way back", () => {
  it("the source is the way back, 44px to a finger, under the words", () => {
    expect(father.indexOf("<blockquote")).toBeLessThan(father.indexOf("<figcaption"));
    expect(father).toMatch(/<Link href=\{block\.href\} data-page-library-source="" className="inline-flex min-h-11 /);
    // One way back, not a source and a separate Open beside it.
    expect(father.match(/<Link /g)).toHaveLength(1);
    expect(father).not.toContain('t("journal.composer.open")');
  });

  it("it says it is quoted from the library, under the source's name or in its place", () => {
    expect(father).toContain('{block.cite || t("journal.page.fromLibrary")}');
    expect(father).toMatch(/\{block\.cite \? <p className=\{cn\("[^"]*", BLOCK_INSET\)\}>\{t\("journal\.page\.fromLibrary"\)\}<\/p> : null\}/);
  });

  it("its words are never typed here", () => {
    expect(father).not.toMatch(/<textarea|<input/);
  });
});

describe("a block's remove sits level with the block's first line", () => {
  it("in a card it sits in the card's own corner; a quote of one's own opens on words, so its remove is raised to them", () => {
    expect(father).toContain("<RemoveButton onClick={onRemove}");
    expect(verse).toContain("<RemoveButton onClick={onRemove}");
    expect(own).toContain("<RemoveButton high onClick={onRemove}");
    const remove = code(blocks.slice(blocks.indexOf("function RemoveButton("), blocks.indexOf("// ── The tools")));
    expect(remove).toContain('high && "-mt-2.5"');
    // Still a finger wide and high.
    expect(remove).toContain("inline-flex h-11 w-11");
    // And the card's words keep clear of it.
    expect(verse).toContain('<figcaption className="pe-9">');
    expect(father).toContain("whitespace-pre-line pe-8");
  });
});

describe("the tools' names are read whole", () => {
  it("a tool's name has a line of its own height, so no letter is cut at its foot", () => {
    // checkMock's "cut" rule, 2026-11-11: at the tile's leading of 1 the name's box was a pixel shorter than its letters.
    const tool = code(blocks.slice(blocks.indexOf("function Tool("), blocks.indexOf("function VerseFinder(")));
    expect(tool).toContain('<span className="max-w-full truncate leading-[1.35]">{label}</span>');
  });
});

describe("a quote of one's own: the writer's, in the writer's words", () => {
  it("the words in italic, then who said it, both typed by the writer", () => {
    expect(own.indexOf("<textarea")).toBeLessThan(own.indexOf("<input"));
    expect(own).toContain('placeholder={t("journal.page.quotePlaceholder")}');
    expect(own).toContain('placeholder={t("journal.page.quoteBy")}');
  });

  it("who said it is a field a finger can find: 44px high, 16px type", () => {
    expect(own).toMatch(/className="block h-11 min-w-0 flex-1 bg-transparent font-sans text-\[16px\]/);
  });
});
