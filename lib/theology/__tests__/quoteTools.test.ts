// A doctrine's quotation and the buttons under it (1.8, the owner's note 22
// of build 80): Source, Gather and the Plus mark were spaced unevenly, 16px
// from Source to Gather and 6px from Gather to its mark, and Source sat a
// couple of pixels above Gather. The row centred its items, and Gather's
// button stands on a line of the page's 17px type (its wrapper is an inline
// block), so its words sat lower than Source's 12px line, centred beside it.
//
// Since round 3 (r3-04, the owner's B and C mix of 2026-10-30) the passages
// are C's deck of picture cards, and under the card in view stand its two
// actions as C draws them, Read where it's from and Share, two pills of one
// height one gap apart; Gather stands under the study's line on the passage,
// its words and its Plus mark still on one baseline.
//
// This reads the source; the built page is measured in the walk (the deck's
// [data-quote-tools] row: the two pills' boxes and the gap between them).

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

const deck = code("components/theology/FathersDeck.tsx");
const gather = code("components/florilegium/AddToFlorilegium.tsx");

/** The class list on the element that carries `attribute`. */
const classesOn = (source: string, attribute: string) => {
  const at = source.indexOf(attribute);
  expect(at, attribute).toBeGreaterThan(-1);
  const m = /className="([^"]+)"/.exec(source.slice(at));
  expect(m, `${attribute} has a className`).not.toBeNull();
  return m![1].split(/\s+/);
};
const gapOf = (classes: string[]) => classes.find((c) => /^gap-/.test(c));
const heightOf = (classes: string[]) => classes.find((c) => /^h-/.test(c));

describe("a doctrine's quotation tools", () => {
  it("stand on one line under the card in view: Read where it's from, then Share", () => {
    const row = classesOn(deck, 'data-quote-tools=""');
    expect(row).toContain("flex");
    expect(row).toContain("items-center");
    expect(gapOf(row)).toBeDefined();
    expect(deck).toMatch(/data-quote-tools=""[\s\S]*?data-quote-source=""[\s\S]*?data-quote-share=""/);
  });

  it("are two pills of one height", () => {
    const source = classesOn(deck, 'data-quote-source=""');
    const share = classesOn(deck, 'data-quote-share=""');
    expect(heightOf(source)).toBeDefined();
    expect(heightOf(share)).toBe(heightOf(source));
    expect(source).toContain("rounded-pill");
    expect(share).toContain("rounded-pill");
  });

  it("keep Gather's words and its Plus mark on one baseline, one gap apart", () => {
    const button = classesOn(gather, 'data-gather=""');
    expect(button).toContain("inline-flex");
    expect(button).toContain("items-baseline");
    expect(button).not.toContain("items-center");
    expect(gapOf(button)).toBe("gap-3");
    // The mark is in the button, after its words.
    expect(gather).toMatch(/data-gather=""[\s\S]*?\{done \?[\s\S]*?<span data-plus-pill=""/);
    expect(deck).toContain("<AddToFlorilegium");
  });
});
