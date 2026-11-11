// The prayer book's screen goes with the book as a chapter opens (1.9).
//
// Build 89 note 8, his words: "I don't like how it doesn't move the screen
// also down in a smooth way, right? So if it like opens, right, you notice
// that it doesn't move with the actual opening." The first mend followed the
// opened chapter's own page.
//
// Build 93 note 15, with every chapter shut and the second opened: "Again, I
// want the screen to move with the bottom if it's too big." On his screen the
// chapter's page had ended 24px over the tab bar, so the screen had rightly
// stayed by that rule, and the two chapters after it had gone under the bar.
// The book is one thing, and it is the book's end the page now goes with.
//
// What it holds: his screen, as arithmetic; that the chapters say they are
// one whole, inside the card and not as the card; that nothing in the book
// moves the page for a chapter any more (the house's one helper does,
// lib/ui/showOpened.ts, whose own test holds the following); and that what
// the book still does itself is as it was: the tapped chapter put back under
// the finger, and the card's length held while it folds. The export walk's
// section 48 and scripts/opened-walk.mjs watch it on the export.
//
// What a reader would notice if this broke: a chapter opened and the rest of
// the book under the tab bar, with the page left where it was.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { CLEAR_PX, moveFor } from "@/lib/ui/showOpened";

describe("his screen, build 93: every chapter shut, the second opened", () => {
  // A phone 844 tall as the app draws it: the bar's foot at 112, the tab bar at 806.
  const bars = { roof: 112, floor: 806 };
  // "Before & after daily life": its title 505px down, its page ending 782px down, the book 1000px down.
  const title = 505;

  it("the chapter's own page ends in sight, 24px over the tab bar: followed alone, the page stays", () => {
    expect(806 - 782).toBe(24);
    expect(moveFor({ top: title, bottom: 782, ...bars })).toBe(0);
  });

  it("the book ends under the tab bar: followed as one thing, the page goes until its end is clear", () => {
    expect(moveFor({ top: title, bottom: 1000, ...bars })).toBe(1000 - (806 - CLEAR_PX));
    // And the title is still well under the bar when it has.
    expect(title - moveFor({ top: title, bottom: 1000, ...bars })).toBeGreaterThan(112 + CLEAR_PX);
  });

  it("a book too long for the screen takes its title to the bar, and no further", () => {
    expect(moveFor({ top: title, bottom: 2400, ...bars })).toBe(title - (112 + CLEAR_PX));
  });
});

describe("the book", () => {
  const src = fs.readFileSync("components/prayers/PrayerBookContents.tsx", "utf8");

  it("says its chapters are one whole, inside the card, whose held length is not theirs", () => {
    // The wrapper holds the chapters and nothing else, and is the card's child.
    expect(src).toMatch(/style=\{BOOK_BG\}\s*>\s*\{\/\*[\s\S]*?\*\/\}\s*<div data-shown-whole="">\s*\{chapters\.map\(/);
    // The card itself is what holds its length while a chapter folds: it is not the whole.
    expect(src).not.toMatch(/data-prayer-book=""[^>]*data-shown-whole/);
    expect(src).toContain("card.style.minHeight = `${card.offsetHeight}px`;");
  });

  it("names each chapter's page on its title, which is how the helper finds it", () => {
    expect(src).toMatch(/aria-expanded=\{isOpen\}\s+aria-controls=\{pageId\}/);
    expect(src).toContain("<div id={pageId} inert={!isOpen}");
  });

  it("moves the page for a chapter with no code of its own", () => {
    expect(src).not.toContain("glidePageBy");
    expect(src).not.toContain("followBy");
    expect(src).not.toContain("visibleBand");
  });

  it("still puts the tapped chapter back under the finger before the screen is painted", () => {
    expect(src).toContain("tapped.current = { at, top: head.getBoundingClientRect().top };");
    expect(src).toMatch(/const off = head\.getBoundingClientRect\(\)\.top - was\.top;\s+if \(Math\.abs\(off\) > 1\) window\.scrollBy\(\{ top: off, left: 0, behavior: "instant" as ScrollBehavior \}\);/);
  });

  it("folds a chapter open over 240ms on the house curve, which the page then goes with", () => {
    expect(src).toContain("const FOLD_MS = 240;");
    const css = fs.readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.book-fold \{[^}]*transition: grid-template-rows 240ms var\(--ease-house\);/);
    expect(css).toContain("--ease-house: cubic-bezier(0.22, 1, 0.36, 1);");
  });
});
