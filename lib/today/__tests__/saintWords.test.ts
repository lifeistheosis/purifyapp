import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { SaintWindowBody, SaintWindowHead } from "@/components/today/SaintWindow";
import { shownWork, workFile } from "@/lib/citations/shown";
import { getMessages } from "@/lib/i18n";
import { SAINTS } from "@/lib/saints/saints";
import { dateYear } from "@/lib/saints/web";

import { SAINT_WORDS_SLUGS, readWhereFrom, saintByline, saintPictureInput, saintWordsFor, wordsOpening } from "../saintWords";

// Today's saint in their own words (1.8): every line is the saint's, word
// for word in the paragraph its source line opens, or a traced quotation of
// theirs; the card says "In his own words", so no saint here is a woman
// until it can say "her". Since round 12 the words open on the saint's band
// and a tap opens his window: his face, name and years, the words, where they
// come from, Share as a picture and Read where it's from.

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const en = getMessages("en");
const draw = (node: React.ReactElement) => renderToString(createElement(MessagesProvider, { locale: "en", messages: en } as ProviderProps, node));
const html = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const noop = () => {};

describe("Today's saint in their own words", () => {
  it("holds only saints the registry has, each a man until the card can say her", () => {
    for (const slug of SAINT_WORDS_SLUGS) {
      const saint = SAINTS.find((s) => s.slug === slug);
      expect(saint, slug).toBeDefined();
      expect(saint?.pronoun ?? "his", slug).toBe("his");
    }
  });

  it("shows each line where it stands, word for word", () => {
    for (const slug of SAINT_WORDS_SLUGS) {
      const w = saintWordsFor(slug)!;
      if (w.shown.kind !== "father") {
        // A traced quotation in a public-domain text the app does not carry: it is the saint's own quote line.
        const q = SAINTS.find((s) => s.slug === slug)!.quotes!.find((x) => x.text === w.text);
        expect(q, slug).toBeDefined();
        continue;
      }
      const m = w.shown.href.match(/^\/saints\/([^/]+)\/([^#]+)#p-(\d+)-(\d+)$/);
      expect(m, `${slug}: ${w.shown.href}`).not.toBeNull();
      const [, saint, work, section, paragraph] = m!;
      const para = workFile(saint, work)!.sections.find((s) => s.n === Number(section))!.paragraphs[Number(paragraph)];
      const squash = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
      expect(squash(para).includes(squash(w.text)), slug).toBe(true);
      expect(w.shown, slug).toEqual(shownWork({ saint, work, section: Number(section), paragraph: Number(paragraph) }));
    }
  });

  it("says nothing for a saint with no line", () => {
    expect(saintWordsFor("seraphim-of-sarov")).toBeNull();
    expect(saintWordsFor(null)).toBeNull();
  });

  it("keeps each saint's year of repose as the registry gives it", () => {
    for (const slug of SAINT_WORDS_SLUGS) {
      const registry = dateYear(SAINTS.find((s) => s.slug === slug)!.reposed)?.year;
      expect(saintWordsFor(slug)!.reposed, slug).toBe(registry);
    }
  });
});

describe("the words on the saint's band", () => {
  it("open with their first phrase, as round 12 drew them", () => {
    expect(wordsOpening(saintWordsFor("john-chrysostom")!.text)).toBe("Let no one fear death…");
  });

  it("are the words' own beginning, never more than the band carries", () => {
    for (const slug of SAINT_WORDS_SLUGS) {
      const text = saintWordsFor(slug)!.text;
      const opening = wordsOpening(text);
      expect(opening.length, slug).toBeLessThanOrEqual(45);
      expect(opening.endsWith("…"), slug).toBe(true);
      expect(text.startsWith(opening.slice(0, -1)), slug).toBe(true);
      // Cut between words, not inside one.
      expect(text.charAt(opening.length - 1), slug).toMatch(/[\s,;:.!?]/);
    }
    expect(wordsOpening("Glory to God for all things.")).toBe("Glory to God for all things.");
  });
});

describe("the saint's window", () => {
  const chrysostom = SAINTS.find((s) => s.slug === "john-chrysostom")!;
  const words = saintWordsFor("john-chrysostom")!;

  it("names him with his first title and the year he reposed", () => {
    expect(saintByline(chrysostom.epithet, words.reposed)).toBe("Archbishop of Constantinople, †407");
    expect(saintByline("Bishop of Antioch · Apostolic Father", "c. 108")).toBe("Bishop of Antioch, †c. 108");
    expect(saintByline("Hymnographer", undefined)).toBe("Hymnographer");
  });

  it("opens his page from his face and name", () => {
    const head = draw(createElement(SaintWindowHead, { saint: chrysostom, words, picture: null, onClose: noop }));
    expect(head).toContain('href="/saints/john-chrysostom"');
    expect(head).toContain("St. John Chrysostom");
    expect(head).toContain("Archbishop of Constantinople, †407");
    expect(head).toContain(`aria-label="${en["common.close"]}"`);
  });

  it("sets his words whole, says where they come from, and offers both actions", () => {
    const body = draw(createElement(SaintWindowBody, { words, onShare: noop, onLeave: noop, said: null }));
    expect(body).toContain("“Let no one fear death, for the Saviour&#x27;s death hath set us free.”");
    // The source line every quotation wears, opening the homily where the words stand.
    expect(body).toContain('data-cite="father"');
    expect(body).toContain(html(en["today.verse.shareAsPicture"]));
    expect(body).toContain(html(en["today.saintWords.readSource"]));
    expect(body).toMatch(/<a(?=[^>]*data-saint-source="")(?=[^>]*href="\/saints\/john-chrysostom\/paschal-homily#p-1-4")/);
  });

  it("reads where the words are from at the source line's own place, for every saint the app carries", () => {
    for (const slug of SAINT_WORDS_SLUGS) {
      const w = saintWordsFor(slug)!;
      if (w.shown.kind === "father") expect(readWhereFrom(w.shown), slug).toBe(w.shown.href);
      else expect(readWhereFrom(w.shown), slug).toBeNull();
    }
  });

  it("offers no Read where it's from for a text the library does not carry", () => {
    const text = SAINT_WORDS_SLUGS.map((s) => saintWordsFor(s)!).find((w) => w.shown.kind === "text")!;
    const body = draw(createElement(SaintWindowBody, { words: text, onShare: noop, onLeave: noop, said: null }));
    expect(body).toContain(html(en["today.verse.shareAsPicture"]));
    expect(body).not.toContain(html(en["today.saintWords.readSource"]));
    expect(body).not.toContain("data-saint-source");
  });

  it("shares his words with his name where a verse has its reference", () => {
    expect(saintPictureInput(words, chrysostom.name)).toEqual({
      text: "Let no one fear death, for the Saviour's death hath set us free.",
      reference: "St. John Chrysostom",
      lang: "en",
    });
  });
});
