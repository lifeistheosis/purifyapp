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
// Share, on one line, evenly spaced, or on two where they are wider than the
// card (2026-11-10). The cover's words (a Father's over his portrait) carry
// Read where it's from and Share as a picture.
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

/** The class list on the element that carries `attribute`: a plain className, or the first string of its cn(). */
const classesOn = (source: string, attribute: string) => {
  const at = source.indexOf(attribute);
  expect(at, attribute).toBeGreaterThan(-1);
  const m = /className=(?:"([^"]+)"|\{cn\(\s*"([^"]+)")/.exec(source.slice(at));
  expect(m, `${attribute} has a className`).not.toBeNull();
  return (m![1] ?? m![2]).split(/\s+/);
};
/** Read where it's from's classes: the first string of its cn(). */
const sourceClasses = () => /<ReadSource[\s\S]*?className=\{cn\(\s*"([^"]+)"/.exec(deck)?.[1].split(/\s+/) ?? [];
const heightOf = (classes: string[]) => classes.find((c) => /^h-/.test(c));

describe("a passage's three actions", () => {
  it("stand on one line where they fit, evenly spaced: Read where it's from, Gather, Share", () => {
    const row = classesOn(deck, 'data-quote-tools=""');
    expect(row).toContain("grid");
    expect(row).toContain("items-center");
    expect(row).toContain("justify-between");
    expect(deck).toContain('stacked ? "grid-cols-[auto_auto]" : "grid-cols-[auto_auto_auto]"');
    const tail = deck.slice(deck.indexOf('data-quote-tools=""'));
    expect(tail).toMatch(/<ReadSource[\s\S]*?<AddToFlorilegium[\s\S]*?data-quote-share=""/);
  });

  it("are the card's own, as wide as the card, under the deck and not inside it", () => {
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
    const source = sourceClasses();
    expect(heightOf(source)).toBe("h-[34px]");
  });

  it("hold every word whole in every language: where the three are wider than the card, Read where it's from takes a line to itself", () => {
    // 1.9, the arbiter's of 07:12 UTC: in Greek on a 360px phone the row ran
    // 11px past its card (docs/1.9-build/notes/florilegium-fable.md). Measured
    // on the device; then the first action spans the row and Gather and Share
    // stand under it at either end, each target still 44px (hit-44).
    const source = sourceClasses();
    for (const c of ["hit-44", "whitespace-nowrap", "justify-self-start"]) expect(source, c).toContain(c);
    expect(deck).toContain('stacked && "col-span-2"');
    const share = /data-quote-share=""[\s\S]*?className="([^"]+)"/.exec(deck)?.[1].split(/\s+/) ?? [];
    for (const c of ["hit-44", "whitespace-nowrap", "justify-self-end"]) expect(share, c).toContain(c);
    expect(deck).toMatch(/<span className="flex justify-self-start whitespace-nowrap">\s*<AddToFlorilegium/);
    // The two lines 44px apart, centre to centre: 34px actions and a 10px gap, so the 44px
    // reaches meet and none lies over another (app/globals.css, .hit-44: "those need real spacing").
    const row = classesOn(deck, 'data-quote-tools=""');
    expect(row).toContain("gap-y-2.5");
    expect(heightOf(source)).toBe("h-[34px]");
    // Its book at the card's edge, over Gather's first letter: no padding of its own.
    expect(source.some((c) => /^(?:p|px|pl|ps)-/.test(c))).toBe(false);
    // The measure: each action at its own width, with the row's gaps, against the row.
    expect(deck).toContain("const stacked = useStacked(tools, at);");
    expect(deck).toContain("setStacked(natural > el.clientWidth + 0.5);");
    expect(deck).toContain("new ResizeObserver(fit)");
  });

  it("keep Gather's words and its Plus mark on one baseline, one gap apart", () => {
    const button = classesOn(gather, 'data-gather=""');
    expect(button).toContain("inline-flex");
    expect(button).toContain("items-baseline");
    expect(button).not.toContain("items-center");
    expect(button.find((c) => /^gap-/.test(c))).toBe("gap-3");
    expect(gather).toMatch(/data-gather=""[\s\S]*?\{t\("study\.gather"\)\}[\s\S]*?<span data-plus-pill=""/);
  });

  it("give Gather its neighbour's ink and a finger's reach, and not one pixel more of the row", () => {
    // 1.9, with the Florilegium's redesign. It was half the page's ink between two that were not.
    const button = classesOn(gather, 'data-gather=""');
    const source = sourceClasses();
    for (const shared of ["tap-press", "hit-44", "font-sans", "text-paper/82", "hover:text-paper"]) {
      expect(source, `Read where it's from: ${shared}`).toContain(shared);
      expect(button, `Gather: ${shared}`).toContain(shared);
    }
    // The row is as wide as the card and was full: measured in all twenty-one languages at 390 and
    // 360px (docs/1.9-build/notes/florilegium-fable.md), French had 1px to spare. A flower before
    // the word, or the word in bold, put "Read where it's from" on two lines in a dozen of them.
    // So the word keeps the size and weight it had, and nothing stands beside it but the Plus mark.
    // (Since 2026-11-10 the row takes a second line where the three are wider than the card: a
    // wider Gather would send more languages to it.)
    expect(button).toContain("text-caption");
    for (const wider of ["font-semibold", "font-bold", "font-medium", "text-[12.5px]", "text-detail", "text-ui"]) expect(button, wider).not.toContain(wider);
    const face = gather.slice(gather.indexOf('data-gather=""'), gather.indexOf("</button>", gather.indexOf('data-gather=""')));
    expect(face).not.toMatch(/<(?:Flower|Check|svg)\b/);
    // And its word never changes, so the row never moves once a line has gone in.
    expect(face).toContain('{t("study.gather")}');
    expect(face).not.toContain("gatheredInto");
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
