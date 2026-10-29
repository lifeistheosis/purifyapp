// A doctrine's quotation and the buttons under it (1.8, the owner's note 22
// of build 80): Source, Gather and the Plus mark were spaced unevenly, 16px
// from Source to Gather and 6px from Gather to its mark, and Source sat a
// couple of pixels above Gather. The row centred its items, and Gather's
// button stands on a line of the page's 17px type (its wrapper is an inline
// block), so its words sat lower than Source's 12px line, centred beside it.
// Now the row and the button align their items on one baseline, one gap
// apart.
//
// This reads the source; the built page is measured in the walk (each
// quotation's [data-quote-tools] row: the words' boxes and the gaps).

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes. */
const code = (p: string) =>
  read(p)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const reader = code("components/theology/TopicReader.tsx");
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

describe("a doctrine's quotation tools", () => {
  it("stand on one baseline: the row's items and the Gather button's", () => {
    const row = classesOn(reader, 'data-quote-tools=""');
    expect(row).toContain("flex");
    expect(row).toContain("items-baseline");
    expect(row).not.toContain("items-center");
    const button = classesOn(gather, 'data-gather=""');
    expect(button).toContain("inline-flex");
    expect(button).toContain("items-baseline");
    expect(button).not.toContain("items-center");
  });

  it("are one gap apart: Source to Gather as Gather to its Plus mark", () => {
    const row = gapOf(classesOn(reader, 'data-quote-tools=""'));
    const button = gapOf(classesOn(gather, 'data-gather=""'));
    expect(row).toBeDefined();
    expect(button).toBe(row);
    // The mark is in the button, after its words, and the row holds Source
    // and then the button.
    expect(gather).toMatch(/data-gather=""[\s\S]*?\{done \?[\s\S]*?<span data-plus-pill=""/);
    expect(reader).toMatch(/data-quote-tools=""[\s\S]*?data-quote-source=""[\s\S]*?<AddToFlorilegium/);
  });
});
