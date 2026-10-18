// The line under a quotation, as the server writes it (1.8,
// components/citations/SourceLine.tsx): the same words a copy carries
// (lib/citations/cite.ts, citeWords), in the reader's language where the
// Bible's books and translations are named, and the place as the link.
//
// What a reader would notice if this broke: a line with a stray comma, a key
// where a word should be, a mark that links somewhere, or a line that opens
// nothing.

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SourceList, marked } from "@/components/citations/Marked";
import { SourceLine } from "@/components/citations/SourceLine";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { citeWords, type ShownCite } from "@/lib/citations/cite";
import { getMessages } from "@/lib/i18n";

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const render = (cite: ShownCite, code = "en") =>
  renderToString(createElement(MessagesProvider, { locale: code, messages: getMessages(code) } as ProviderProps, createElement(SourceLine, { cite })));
/** The text a reader sees, tags taken away and entities read. */
const seen = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<!-- -->/g, "");

const father: ShownCite = {
  kind: "father",
  href: "/saints/augustine-of-hippo/confessions#p-1-0",
  author: "St. Augustine of Hippo",
  work: "Confessions",
  place: "Book I, Chapter 1",
  mark: "§1",
  edition: "tr. Pusey",
};
const scripture: ShownCite = { kind: "scripture", href: "/bible/john/3#v16", book: "john", reference: "3:16", translation: "kjv" };

describe("the line under a quotation", () => {
  it("says a Father's place as a copy does, and opens it", () => {
    const html = render(father);
    expect(seen(html)).toBe("St. Augustine of Hippo, Confessions, Book I, Chapter 1, §1, tr. Pusey");
    expect(seen(html)).toBe(citeWords(father, (k) => getMessages("en")[k] ?? k));
    expect(html).toContain('href="/saints/augustine-of-hippo/confessions#p-1-0"');
  });

  it("says a verse's book and translation in the reader's language", () => {
    expect(seen(render(scripture))).toBe("John 3:16, King James Version");
    const de = getMessages("de");
    expect(seen(render(scripture, "de"))).toBe(`${de["bible.books.john"]} 3:16, ${de["reading.collection.kjv"]}`);
  });

  it("names a work no one signed by its title alone, and a text the library lacks with no link", () => {
    expect(seen(render({ ...father, author: "" }))).toBe("Confessions, Book I, Chapter 1, §1, tr. Pusey");
    const text = render({ kind: "text", author: "Tertullian", work: "The Chaplet (De Corona)", place: "Chapter 3", edition: "tr. Thelwall, ANF 3" });
    expect(seen(text)).toBe("Tertullian, The Chaplet (De Corona), Chapter 3, tr. Thelwall, ANF 3");
    expect(text).not.toContain("href=");
    // A note's own heading with no place of its own, as the commentary rail gives one.
    expect(seen(render({ kind: "text", author: "St. Jerome", work: "Catena Aurea on Matthew", place: "", edition: "Catena Aurea (Oxford, Rivington, 1842)" }))).toBe(
      "St. Jerome, Catena Aurea on Matthew, Catena Aurea (Oxford, Rivington, 1842)",
    );
  });

  it("says plainly when the words are not word for word, with the passage, and when they are not traced", () => {
    const inexact = render({ kind: "inexact", of: father });
    expect(seen(inexact)).toBe(`Not word for word. Compare:${seen(render(father))}`);
    expect(inexact).toContain('href="/saints/augustine-of-hippo/confessions#p-1-0"');
    const untraced = render({ kind: "untraced" });
    expect(seen(untraced)).toBe("Not yet traced to its source");
    expect(untraced).not.toContain("href=");
    for (const code of ["ru", "ar", "ka"]) expect(seen(render({ kind: "untraced" }, code))).toBe(getMessages(code)["cite.untraced"]);
  });
});

describe("the marks in a longer text, and the list they lead to", () => {
  // Learn to pray's lessons and the Bible's "Before you read" (components/citations/Marked.tsx).
  it("number the words where they stand, after a closing quotation mark, and never change them", () => {
    const text = 'Paul writes "Christ our passover is sacrificed for us" (1 Corinthians 5:7), and the Fathers say so too.';
    const marks = [
      { words: "the Fathers say so too", n: 2 },
      { words: "Christ our passover is sacrificed for us", n: 1 },
      { words: "words the text does not have", n: 3 },
    ];
    const html = renderToString(createElement("p", null, marked(text, marks, "x-")));
    expect(seen(html)).toBe('Paul writes "Christ our passover is sacrificed for us"1 (1 Corinthians 5:7), and the Fathers say so too2.');
    expect(html).toContain('href="#x-1"');
    expect(html).toContain('href="#x-2"');
    expect(html).not.toContain("#x-3");
    expect(marked("No marks here.", [], "x-")).toBe("No marks here.");
  });

  it("list each one under its number, with its line, in the reader's language", () => {
    const sources = [
      { words: "For God so loved the world", n: 1, shown: scripture },
      { words: "the Fathers say", n: 2, shown: { kind: "untraced" } as const },
    ];
    const html = renderToString(
      createElement(MessagesProvider, { locale: "en", messages: getMessages("en") } as ProviderProps, createElement(SourceList, { id: "s", idPrefix: "x-", sources, lang: "en" })),
    );
    expect(html).toContain('id="x-1"');
    expect(html).toContain('id="x-2"');
    expect(html).toContain('aria-labelledby="s"');
    const text = seen(html);
    expect(text).toContain("Where these words come from");
    expect(text).toContain("1For God so loved the worldJohn 3:16, King James Version");
    expect(text).toContain("2the Fathers sayNot yet traced to its source");
    expect(renderToString(createElement(SourceList, { id: "s", idPrefix: "x-", sources: [], lang: "en" }))).toBe("");
  });
});
