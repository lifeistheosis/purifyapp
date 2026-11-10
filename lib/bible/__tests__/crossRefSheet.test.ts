// The cross-references' sheet (components/bible/CrossRefSheet.tsx: CrossRefList,
// the sheet's whole body, which the Plus page's preview of cross-references
// draws too), in every language.
//
// 1.9, the arbiter's of 2026-11-10 10:10 UTC: in Arabic and Urdu each verse a
// reference points to ran with the sheet, from the right, and its full stop
// stood at its start (".heaven and the earth"). The words are the app's own
// English for every reader, whatever their language or Bible:
// lib/bible/crossRefs.ts reads them from data/bible at build time. So each
// says it is English and runs left to right, and the place it is from stays in
// the reader's language and direction.
//
// What a reader would notice if this broke: in Arabic or Urdu, a referenced
// verse whose full stop stands before its first word.

import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CrossRefList } from "@/components/bible/CrossRefSheet";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { crossRefNumbers, previewText, type CrossRefItem } from "@/lib/bible/crossRefShape";
import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";

const ROOT = path.resolve(__dirname, "..", "..", "..");

/** A verse's words as lib/bible/crossRefs.ts gives them: the app's text, trimmed for a preview. */
function words(book: string, chapter: number, verse: number): string {
  const file = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bible", book, `${chapter}.json`), "utf8")) as {
    verses: { n: number; text: string }[];
  };
  return previewText(file.verses.find((v) => v.n === verse)!.text);
}

// Two places John 1:1 echoes, as the reader's sheet lists them: one ends with a
// full stop, one runs into a second verse.
const ITEMS: CrossRefItem[] = [
  { book: "genesis", chapter: 1, verse: 1, text: words("genesis", 1, 1) },
  { book: "1-john", chapter: 1, verse: 1, endVerse: 2, text: words("1-john", 1, 1) },
];

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const render = (lang: string) =>
  renderToString(createElement(MessagesProvider, { locale: lang, messages: getMessages(lang) } as ProviderProps, createElement(CrossRefList, { items: ITEMS })));
/** What React writes for a piece of text. */
const html = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe("the cross-references' sheet", () => {
  it("draws the app's English words of each verse it points to", () => {
    expect(ITEMS[0].text).toBe("In the beginning God made the heaven and the earth.");
    expect(ITEMS[1].text.startsWith("That which was from the beginning")).toBe(true);
  });

  it("says each verse is English and runs it left to right, in every language", () => {
    expect(LOCALES.length).toBe(21);
    for (const { code } of LOCALES) {
      const out = render(code);
      const verses = [...out.matchAll(/<p lang="en" dir="ltr" class="[^"]*">([^<]*)<\/p>/g)].map((m) => m[1]);
      expect(verses, code).toEqual(ITEMS.map((item) => html(item.text)));
    }
  });

  it("keeps each place in the reader's language and direction", () => {
    for (const code of ["ar", "ur", "el"]) {
      const out = render(code);
      for (const item of ITEMS) {
        const name = html(getMessages(code)[`bible.books.${item.book}`]);
        // The place's line is not marked English: it runs with the sheet.
        const place = `">${name}<!-- --> <!-- -->${crossRefNumbers(item)}</p>`;
        expect(out, `${code}: ${item.book}`).toContain(place);
        expect(out.slice(out.lastIndexOf("<p", out.indexOf(place)), out.indexOf(place)), `${code}: ${item.book}`).not.toContain("lang=");
      }
    }
  });

  it("is the sheet's whole body, in the Bible's reader and in the Plus preview", () => {
    // The sheet draws on a portal once it has mounted, so a server render shows
    // none of it: its source is read instead.
    const sheet = fs.readFileSync(path.join(ROOT, "components/bible/CrossRefSheet.tsx"), "utf8");
    expect(sheet).toMatch(/<Sheet[\s\S]*?<CrossRefList items=\{items\} onLeave=\{onClose\} \/>[\s\S]*?<\/Sheet>/);
    const preview = fs.readFileSync(path.join(ROOT, "components/billing/plusTry/TryCrossRefs.tsx"), "utf8");
    expect(preview).toContain("<CrossRefList items={items} />");
  });
});
