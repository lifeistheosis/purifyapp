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
 * Now none is in a box and none stands beside a rule. Each wears the mark of
 * what it is, the glyph of the tool that lays it, and has its own shape:
 *
 *   Scripture          the Book and its place as a heading that opens the
 *                      passage at the verse, then the words
 *   a Father's words   the words, then the Quill and the source as the way
 *                      back: the form a gathered line has in the Florilegium
 *   a quote of one's   the words in italic, then the speech mark and who
 *   own                said it, typed by the writer; no link, never the Quill
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

describe("none of the three is in a box, and none stands beside a rule", () => {
  it("no border round a verse, a Father's words or a quote of one's own", () => {
    for (const [name, src] of [["verse", verse], ["library", father], ["quote", own]] as const) {
      const figure = src.slice(src.indexOf("<figure"), src.indexOf(">", src.indexOf("className=", src.indexOf("<figure"))));
      expect(figure, name).not.toMatch(/\bborder\b|border-paper|border-(s|e|l|r)\b/);
    }
    // A Father's words and a quote of one's own have no ground of their own either.
    expect(father.slice(father.indexOf("<figure"), father.indexOf("<blockquote"))).not.toMatch(/\bbg-/);
    expect(own.slice(own.indexOf("<figure"), own.indexOf("<label"))).not.toMatch(/\bbg-/);
  });

  it("the words of all three are in the size the app reads at", () => {
    expect(verseWords).toContain('"font-serif text-body leading-[1.7] text-paper/90"');
    expect(father).toContain('"whitespace-pre-line font-serif text-body leading-[1.7] text-paper/90"');
    expect(own).toMatch(/font-serif text-body italic leading-\[1\.7\] text-paper /);
  });

  it("what is brought onto the page is set in from the writer's own words, by an indent and never a rule", () => {
    // The marks hang in the margin; the words begin under the block's name, past its mark (15px and its 8px).
    expect(blocks).toContain('const BLOCK_INSET = "ps-[23px]";');
    expect(verseWords.match(/BLOCK_INSET/g)).toHaveLength(2);
    expect(father.match(/BLOCK_INSET/g)).toHaveLength(2);
    expect(own.match(/BLOCK_INSET/g)).toHaveLength(1);
    // The writer's own words stand at the margin.
    const words = part("function TextBlock(", "const BLOCK_SOURCE");
    expect(words).not.toContain("BLOCK_INSET");
    for (const src of [verse, verseWords, father, own]) expect(src).not.toMatch(/border-(s|e|l|r)\b|border-(s|e|l|r)-/);
  });
});

describe("each wears the mark of what it is: its tool's own glyph (build 93 note 8)", () => {
  const toolbar = code(blocks.slice(blocks.indexOf('role="toolbar"'), blocks.indexOf("<HighlightNamesSheet")));

  it("Scripture wears the Book, as the Verse tool does", () => {
    expect(toolbar).toMatch(/<Tool icon=\{<Book size=\{18\} \/>\} label=\{t\("journal\.page\.addVerse"\)\}/);
    expect(verse).toContain('<Book size={15} aria-hidden className="shrink-0 text-paper/55" />');
    expect(verse).not.toMatch(/<Quill|<ChatBubble/);
  });

  it("a Father's words wear the Quill, as a gathered line of a Father does", () => {
    expect(father).toContain('<Quill size={15} aria-hidden className="shrink-0 text-paper/55" />');
    expect(read("components/florilegium/FlorilegiumDetail.tsx")).toContain("<Quill size={15} aria-hidden");
    expect(father).not.toMatch(/<Book |<ChatBubble/);
  });

  it("a quote of one's own wears the speech mark, as the Quote tool does, and never the Quill", () => {
    expect(toolbar).toMatch(/icon=\{<ChatBubble size=\{18\} \/>\}\s+label=\{t\("journal\.page\.addQuote"\)\}/);
    expect(own).toContain('<ChatBubble size={15} aria-hidden className="shrink-0 text-paper/55" />');
    expect(own).not.toMatch(/<Quill|<Book |<Link/);
  });

  it("the three source lines are one line, the Florilegium's", () => {
    const line = blocks.match(/const BLOCK_SOURCE = "([^"]+)";/)![1];
    expect(line).toBe("inline-flex min-w-0 items-center gap-2 font-sans text-caption font-semibold text-paper/65");
    // The gathered line's own, which also carries its 44px.
    expect(read("components/florilegium/FlorilegiumDetail.tsx")).toContain('const SOURCE = "inline-flex min-h-11 min-w-0 items-center gap-2 font-sans text-caption font-semibold text-paper/65";');
  });
});

describe("Scripture: its place is its heading", () => {
  it("the place comes before the words, and opens the passage at the verse", () => {
    expect(verse.indexOf("<figcaption>")).toBeGreaterThan(-1);
    expect(verse.indexOf("<figcaption>")).toBeLessThan(verse.indexOf("<VerseCardWords"));
    expect(verse).toMatch(/<Link href=\{`\/bible\/\$\{block\.book\}\/\$\{block\.chapter\}#v\$\{block\.from\}`\} data-page-verse-place="" className=\{cn\(BLOCK_SOURCE, "min-h-11 hover:text-paper"\)\}>/);
  });

  it("with no signal and nothing kept, the heading still stands, and under it the way to read", () => {
    expect(verseWords).toMatch(/states\.every\(\(s\) => s\.words\.status === "missing"\)[\s\S]*?<Link href=\{`\/bible\/\$\{block\.book\}\/\$\{block\.chapter\}#v\$\{block\.from\}`\}[\s\S]*?min-h-11[\s\S]*?t\("saved\.openToRead"\)/);
  });

  it("asked for again it is lit for a moment, with no edge to light", () => {
    expect(verse).toContain('noticed ? "bg-paper/[0.09]" : "bg-paper/0"');
    expect(verse).toContain("motion-safe:transition-colors");
  });

  it("its words are never typed here", () => {
    expect(verse + verseWords).not.toMatch(/<textarea|<input/);
  });
});

describe("a Father's words: the words, then the way back", () => {
  it("the source is the way back, 44px to a finger, under the words", () => {
    expect(father.indexOf("<blockquote")).toBeLessThan(father.indexOf("<figcaption>"));
    expect(father).toMatch(/<Link href=\{block\.href\} data-page-library-source="" className=\{cn\(BLOCK_SOURCE, "min-h-11 hover:text-paper"\)\}>/);
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
  it("a Father's words and a quote of one's own open on words, so their remove is raised to them; Scripture's sits with its heading", () => {
    expect(father).toContain("<RemoveButton high onClick={onRemove}");
    expect(own).toContain("<RemoveButton high onClick={onRemove}");
    expect(verse).toContain("<RemoveButton onClick={onRemove}");
    const remove = code(blocks.slice(blocks.indexOf("function RemoveButton("), blocks.indexOf("// ── The tools")));
    expect(remove).toContain('high && "-mt-2.5"');
    // Still a finger wide and high.
    expect(remove).toContain("inline-flex h-11 w-11");
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
