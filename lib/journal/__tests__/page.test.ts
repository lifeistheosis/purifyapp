// A journal page kept as text in an entry's body (lib/journal/page.ts): the
// round trip, an older entry read as words, and the rules that keep Scripture
// verbatim and a writer's own quote their own.

import { describe, expect, it } from "vitest";

import { MAX_BODY } from "../entries";
import { insertAt, pageIsEmpty, pageText, parsePage, removeAt, serializePage, tidyBlocks, verseBlock, VERSE_CARD_MAX, type Page } from "../page";

const page: Page = {
  title: "On the Samaritan woman",
  blocks: [
    { type: "text", text: "He asked her for water.\nShe did not know who asked." },
    { type: "verse", book: "john", chapter: 4, from: 13, to: 14 },
    { type: "text", text: "The well is deep.", color: "blue" },
    { type: "quote", text: "Prayer is the test of everything.", by: "my priest, at Vespers" },
    { type: "text", text: "Then home." },
  ],
};

describe("a page as text", () => {
  it("is written as text an older build reads, and read back as it was", () => {
    const body = serializePage(page);
    expect(body).toBe(
      [
        "# On the Samaritan woman",
        "He asked her for water.\nShe did not know who asked.",
        "[[verse john 4:13-14]]",
        "==blue== The well is deep.",
        "> Prayer is the test of everything.\n> ~ my priest, at Vespers",
        "Then home.",
      ].join("\n\n"),
    );
    expect(parsePage(body)).toEqual(page);
    expect(body.length).toBeLessThan(MAX_BODY);
  });

  it("reads an entry written before pages as its words, untouched", () => {
    const old = "Lord, have mercy.\n\nOn the way home I thought of the reading.";
    expect(parsePage(old)).toEqual({ title: "", blocks: [{ type: "text", text: old }] });
    expect(serializePage(parsePage(old))).toBe(old);
  });

  it("keeps words that look like marks as words", () => {
    const words: Page = {
      title: "",
      blocks: [{ type: "text", text: "> not a quote\n\n# not a title\n\n==blue== not a colour\n\n[[verse john 3:16]]\n\n\\a backslash" }],
    };
    const body = serializePage(words);
    expect(parsePage(body)).toEqual(words);
  });

  it("keeps a highlight on every paragraph of a coloured block", () => {
    const two: Page = { title: "", blocks: [{ type: "text", text: "One.\n\nTwo.", color: "rose" }] };
    expect(serializePage(two)).toBe("==rose== One.\n\n==rose== Two.");
    expect(parsePage(serializePage(two))).toEqual(two);
  });

  it("knows only the seven colours", () => {
    expect(parsePage("==gold== Not a colour.")).toEqual({ title: "", blocks: [{ type: "text", text: "==gold== Not a colour." }] });
  });

  it("a quote of one's own without a name, and one with a line like a name", () => {
    const q: Page = { title: "", blocks: [{ type: "quote", text: "Be still.\n~ and know", by: "" }] };
    expect(parsePage(serializePage(q))).toEqual(q);
  });

  it("a title is one line, and only at the top", () => {
    expect(parsePage("Words first.\n\n# Not a title").title).toBe("");
    expect(serializePage({ title: "  Two\nlines ", blocks: [] })).toBe("# Two lines");
  });
});

describe("a verse card holds where the words are, never the words", () => {
  it("keeps the reference alone", () => {
    const body = serializePage({ title: "", blocks: [{ type: "verse", book: "psalms", chapter: 22, from: 1, to: 1 }] });
    expect(body).toBe("[[verse psalms 22:1]]");
  });

  it("holds a verse or up to ten, in one chapter", () => {
    expect(verseBlock("john", 3, 16)).toEqual({ type: "verse", book: "john", chapter: 3, from: 16, to: 16 });
    expect(verseBlock("john", 3, 16, 16 + VERSE_CARD_MAX - 1)).not.toBeNull();
    expect(verseBlock("john", 3, 16, 16 + VERSE_CARD_MAX)).toBeNull();
    expect(verseBlock("John", 3, 16)).toBeNull();
    expect(verseBlock("john", 0, 16)).toBeNull();
    // A card too long for the rule is read as the words it is.
    expect(parsePage("[[verse john 3:1-36]]").blocks[0]).toEqual({ type: "text", text: "[[verse john 3:1-36]]" });
  });
});

describe("the editor's blocks", () => {
  it("puts a card where the cursor is, the words parted around it", () => {
    const blocks = [{ type: "text" as const, text: "Before after" }];
    const card = verseBlock("john", 1, 1)!;
    const { blocks: next, inserted } = insertAt(blocks, { index: 0, start: 6, end: 6 }, card);
    expect(next).toEqual([{ type: "text", text: "Before" }, card, { type: "text", text: "after" }]);
    expect(inserted).toBe(1);
  });

  it("on an empty page, the card, then a line to write on", () => {
    const card = verseBlock("john", 1, 1)!;
    expect(insertAt([{ type: "text", text: "" }], { index: 0, start: 0, end: 0 }, card).blocks).toEqual([card, { type: "text", text: "" }]);
  });

  it("taking a card away joins the words again", () => {
    const card = verseBlock("john", 1, 1)!;
    expect(removeAt([{ type: "text", text: "One" }, card, { type: "text", text: "two" }], 1)).toEqual([{ type: "text", text: "One\n\ntwo" }]);
  });

  it("always ends on words to write on", () => {
    expect(tidyBlocks([verseBlock("john", 1, 1)!])).toEqual([verseBlock("john", 1, 1), { type: "text", text: "" }]);
  });

  it("names verse cards by their reference in the list, and a quote with its giver", () => {
    expect(pageText(page, (b) => `John ${b.chapter}:${b.from}-${b.to}`)).toContain("John 4:13-14");
    expect(pageText(page, () => "")).toContain("“Prayer is the test of everything.” my priest, at Vespers");
  });

  it("a page with only a title, or only a card, is not empty", () => {
    expect(pageIsEmpty({ title: "", blocks: [{ type: "text", text: "  " }] })).toBe(true);
    expect(pageIsEmpty({ title: "A title", blocks: [] })).toBe(false);
    expect(pageIsEmpty({ title: "", blocks: [verseBlock("john", 1, 1)!] })).toBe(false);
  });
});
