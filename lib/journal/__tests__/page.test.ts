// A journal page kept as text in an entry's body (lib/journal/page.ts): the
// round trip, an older entry read as words, and the rules that keep Scripture
// verbatim and a writer's own quote their own.

import { describe, expect, it } from "vitest";

import { MAX_BODY } from "../entries";
import { cleanNotebook, cleanStyle, cleanTags, insertAt, isAppHref, libraryBlock, pageIsEmpty, pageText, parsePage, removeAt, serializePage, tidyBlocks, verseBlock, VERSE_CARD_MAX, type Page } from "../page";

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

describe("a quote from Purify's library", () => {
  const lib = libraryBlock("Let us run with patience.\n\nAnd again: let us run.", "On the Incarnation", "/saints/athanasius-the-great/on-the-incarnation/#p12")!;

  it("keeps the words as the page has them, the page's name, and its way back", () => {
    const body = serializePage({ title: "", blocks: [lib] });
    expect(body).toBe(
      "[[library /saints/athanasius-the-great/on-the-incarnation/#p12]]\n> Let us run with patience.\n>\n> And again: let us run.\n> ~ On the Incarnation",
    );
    expect(parsePage(body)).toEqual({ title: "", blocks: [lib] });
  });

  it("leads only inside the app, never to another site", () => {
    expect(isAppHref("/prayers/morning/")).toBe(true);
    expect(isAppHref("//evil.example/")).toBe(false);
    expect(isAppHref("https://evil.example/")).toBe(false);
    expect(isAppHref("javascript:alert(1)")).toBe(false);
    expect(isAppHref("/\\evil.example")).toBe(false);
    expect(libraryBlock("Words", "A page", "https://evil.example/")).toBeNull();
    // Written by hand with a way out, it is read as the words it is, never as the library's.
    const forged = "[[library https://evil.example/]]\n> Words\n> ~ St. Basil";
    expect(parsePage(forged).blocks.every((b) => b.type !== "library")).toBe(true);
  });

  it("is named with its page in the list, and a page holding one is not empty", () => {
    expect(pageText({ title: "", blocks: [lib] }, () => "")).toContain("” On the Incarnation");
    expect(pageIsEmpty({ title: "", blocks: [lib] })).toBe(false);
  });

  it("a line of its words that looks like its page's name stays its words", () => {
    const tricky = libraryBlock("First line\n~ not the name", "", "/prayers/")!;
    expect(parsePage(serializePage({ title: "", blocks: [tricky] })).blocks[0]).toEqual(tricky);
  });
});

describe("Plus's blocks, kept as text an older build reads", () => {
  const plus: Page = {
    title: "Lent, week one",
    blocks: [
      { type: "heading", text: "This week" },
      { type: "check", items: [{ text: "Read the Canon of St Andrew", done: true }, { text: "Confession on Saturday", done: false }] },
      { type: "divider", style: "line" },
      { type: "callout", icon: "candle", text: "Words set apart.\nOn two lines." },
      { type: "divider", style: "dots" },
      { type: "text", text: "And the words after." },
      { type: "divider", style: "space" },
    ],
  };

  it("writes each as plain text and reads it back as it was", () => {
    const body = serializePage(plus);
    expect(body).toBe(
      [
        "# Lent, week one",
        "## This week",
        "- [x] Read the Canon of St Andrew\n- [ ] Confession on Saturday",
        "---",
        "[[callout candle]]\n> Words set apart.\n> On two lines.",
        "* * *",
        "And the words after.",
        "[[divider space]]",
      ].join("\n\n"),
    );
    expect(parsePage(body)).toEqual(plus);
  });

  it("keeps words that look like Plus's marks as words", () => {
    const words: Page = { title: "", blocks: [{ type: "text", text: "## not a heading\n\n- [ ] not a checklist\n\n---\n\n* * *" }] };
    expect(parsePage(serializePage(words))).toEqual(words);
  });

  it("knows only the house's callout icons and dividers", () => {
    expect(parsePage("[[callout skull]]\n> Words").blocks[0].type).not.toBe("callout");
    expect(parsePage("[[divider ornament]]").blocks[0].type).toBe("text");
  });

  it("a checklist's empty lines and a page of only dividers keep nothing", () => {
    expect(serializePage({ title: "", blocks: [{ type: "check", items: [{ text: " ", done: false }] }] })).toBe("");
    expect(pageIsEmpty({ title: "", blocks: [{ type: "divider", style: "line" }] })).toBe(true);
    expect(pageIsEmpty({ title: "", blocks: [{ type: "check", items: [{ text: "One", done: false }] }] })).toBe(false);
  });

  it("names a checklist's lines and a callout's words in the list", () => {
    const text = pageText(plus, () => "");
    expect(text).toContain("Confession on Saturday");
    expect(text).toContain("Words set apart.");
  });
});

describe("a page's notebook and tags (Plus)", () => {
  it("are kept under the title, and read back", () => {
    const p: Page = { title: "Week one", blocks: [{ type: "text", text: "Words." }], notebook: "Lent 2027", tags: ["fasting", "prayer"] };
    const body = serializePage(p);
    expect(body).toBe("# Week one\n\n[[notebook Lent 2027]]\n[[tags fasting, prayer]]\n\nWords.");
    expect(parsePage(body)).toEqual(p);
  });

  it("a page without them carries no empty marks", () => {
    expect(serializePage({ title: "", blocks: [{ type: "text", text: "Words." }], notebook: " ", tags: [] })).toBe("Words.");
    expect(parsePage("Words.")).not.toHaveProperty("notebook");
  });

  it("tags are cleaned: no commas or brackets inside one, none twice, eight at most", () => {
    expect(cleanTags(["Prayer", "prayer", " fasting ", "a,b", "[x]", ""])).toEqual(["Prayer", "fasting", "a b", "x"]);
    expect(cleanTags(Array.from({ length: 12 }, (_, i) => `t${i}`))).toHaveLength(8);
    expect(cleanNotebook("  Lent [2027]  ")).toBe("Lent 2027");
  });
});

describe("a page's style (Plus)", () => {
  it("is kept only where it differs from the house's own, and read back", () => {
    const p: Page = { title: "T", blocks: [{ type: "text", text: "W" }], style: { font: "sans", align: "center" } };
    const body = serializePage(p);
    expect(body).toBe("# T\n\n[[style font=sans align=center]]\n\nW");
    expect(parsePage(body)).toEqual(p);
    expect(serializePage({ title: "", blocks: [{ type: "text", text: "W" }], style: { font: "serif", align: "start" } })).toBe("W");
  });

  it("knows only the house's two fonts and two places", () => {
    expect(parsePage("[[style font=comic align=left]]\n\nW").style).toBeUndefined();
    expect(cleanStyle({ font: "sans" })).toEqual({ font: "sans" });
  });
});
