// A doctrine's quotation and the buttons by it (1.8, the owner's note 22 of
// build 80): Source, Gather and the Plus mark were spaced unevenly, 16px from
// Source to Gather and 6px from Gather to its mark, and Source sat a couple
// of pixels above Gather. The row centred its items, and Gather's button
// stands on a line of the page's 17px type (its wrapper is an inline block),
// so its words sat lower than Source's 12px line, centred beside it.
//
// Since round 3 r3-13 (the owner's hybrid of B and C, 2026-10-30) the
// passages stand at the end of the part of the study they belong to, as a
// deck of B's picture cards, and along the foot of the card in view stand its
// three actions as the sheet draws them: Read where it's from, Gather and
// Share, on one line, evenly spaced. The cover's words (a Father's over his
// portrait) carry Read where it's from and Share as a picture.
//
// This reads the source; the built page is measured in the walk (the deck's
// [data-quote-tools] row: its three boxes and the gaps between them).

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
/**
 * A file's code without its notes. A JSX note is matched only up to its own
 * end, so it cannot run on from a type's doc comment to the next note.
 */
const code = (p: string) =>
  read(p)
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const deck = code("components/theology/PassageDeck.tsx");
const cover = code("components/theology/StudyCover.tsx");
const tools = code("components/theology/PassageTools.tsx");
const gather = code("components/florilegium/AddToFlorilegium.tsx");

/** The class list on the element that carries `attribute`. */
const classesOn = (source: string, attribute: string) => {
  const at = source.indexOf(attribute);
  expect(at, attribute).toBeGreaterThan(-1);
  const m = /className="([^"]+)"/.exec(source.slice(at));
  expect(m, `${attribute} has a className`).not.toBeNull();
  return m![1].split(/\s+/);
};
const heightOf = (classes: string[]) => classes.find((c) => /^h-/.test(c));

describe("a passage's three actions", () => {
  it("stand on one line, evenly spaced: Read where it's from, Gather, Share", () => {
    const row = classesOn(deck, 'data-quote-tools=""');
    expect(row).toContain("flex");
    expect(row).toContain("items-center");
    expect(row).toContain("justify-between");
    const tail = deck.slice(deck.indexOf('data-quote-tools=""'));
    expect(tail).toMatch(/<ReadSource[\s\S]*?<AddToFlorilegium[\s\S]*?data-quote-share=""/);
  });

  it("are the card's own, as wide as the card, under the deck that would clip Gather's menu", () => {
    const row = classesOn(deck, 'data-quote-tools=""');
    const card = classesOn(deck, 'data-deck-card=""');
    const width = (classes: string[]) => classes.find((c) => /^w-\[/.test(c));
    expect(width(row)).toBeDefined();
    expect(width(row)).toBe(width(card));
    // After the deck's list, not inside it.
    expect(deck.indexOf('data-quote-tools=""')).toBeGreaterThan(deck.indexOf("</ul>"));
  });

  it("are of one height where they are pills, Share lit white", () => {
    const share = classesOn(deck, 'data-quote-share=""');
    expect(share).toContain("rounded-pill");
    expect(share).toContain("bg-paper");
    expect(share).toContain("reader-lit");
    expect(heightOf(share)).toBe("h-[34px]");
    const source = /<ReadSource[\s\S]*?className="([^"]+)"/.exec(deck)?.[1].split(/\s+/) ?? [];
    expect(heightOf(source)).toBe("h-[34px]");
  });

  it("keep Gather's words and its Plus mark on one baseline, one gap apart", () => {
    const button = classesOn(gather, 'data-gather=""');
    expect(button).toContain("inline-flex");
    expect(button).toContain("items-baseline");
    expect(button).not.toContain("items-center");
    expect(button.find((c) => /^gap-/.test(c))).toBe("gap-3");
    expect(gather).toMatch(/data-gather=""[\s\S]*?\{done \?[\s\S]*?<span data-plus-pill=""/);
  });
});

describe("a study's cover", () => {
  it("carries Read where it's from and Share as a picture under his words", () => {
    expect(cover).toMatch(/data-quote-tools=""[\s\S]*?<ReadSource[\s\S]*?data-quote-share=""/);
    expect(cover).toContain('t("today.saintWords.readSource")');
    expect(cover).toContain('t("today.verse.shareAsPicture")');
  });

  it("shares only a portrait whose rights are recorded, never a carried icon", () => {
    expect(tools).toMatch(/SAINT_FACES\[slug\][\s\S]*?portraitLook\(streamedUrl\(coverFile\(slug\), native\)/);
    expect(tools).not.toMatch(/portraitLook\([^)]*iconUrl/);
    // The cover asks for his portrait alone: a carried icon, a standing figure, is too narrow to fill it.
    expect(cover).toContain("saintPicture({ slug: passage.saintSlug }, native)");
  });

  it("opens the words where they stand in the app, else the public-domain page in a new tab", () => {
    expect(tools).toMatch(/source\.external \?\s*\(\s*<a href=\{source\.href\} target="_blank" rel="noopener noreferrer"/);
    expect(tools).toMatch(/<Link href=\{source\.href\} prefetch=\{false\}/);
  });
});
