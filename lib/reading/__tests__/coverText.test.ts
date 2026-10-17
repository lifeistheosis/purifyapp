// The words on the reading room's posters (lib/reading/coverText.ts), for
// every book in the room at every size a poster is drawn.
//
// What a reader would notice if this broke: a title cut short with three
// dots, a word running off the poster, "St." at the end of a line with the
// name on the next, a line holding only "on" or "and", an author's name
// running into the title, or a title reworded on its cover.

import { describe, expect, it } from "vitest";

import { buildRoom } from "@/lib/reading/cards";
import { GEOMETRY, SIZES, coverWords, emWidth, type CoverSize } from "@/lib/reading/coverText";

const NBSP = String.fromCharCode(0xa0);
const cards = buildRoom(false).cards;
/** The sizes the reading room draws: a row, the search's grid, the book held up, and a saint's Writings. */
const ROOM_SIZES: CoverSize[] = ["row", "grid", "hero", "sm"];
/** The short small words a line may not hold alone between others. */
const SMALL = /^(?:a|an|the|of|and|or|on|in|to|for|with|from|at|by|as|into|unto|upon|our|his|her|its)$/i;

const every = () =>
  cards.flatMap((c) =>
    ROOM_SIZES.map((size) => ({
      c,
      size,
      w: coverWords({ title: c.title, author: c.author ?? "Anonymous", size, picture: Boolean(c.cover) }),
    })),
  );

describe("the posters' words", () => {
  it("fit every book in the room at every size, whole, with no line cut", () => {
    const cut = every()
      .filter(({ w }) => w.clamp !== null)
      .map(({ c, size }) => `${size}: ${c.title}`);
    expect(cut).toEqual([]);
  });

  it("are the book's own title and author, only held together where a line may not end", () => {
    for (const { c, size, w } of every()) {
      expect(w.title.split(NBSP).join(" "), `${size}: ${c.title}`).toBe(c.title);
      expect(w.titleLines.join(" ").split(NBSP).join(" ").replace(/- /g, "-"), `${size}: ${c.title}`).toBe(c.title);
      if (size !== "sm") expect(w.author?.split(NBSP).join(" "), `${size}: ${c.title}`).toBe(c.author ?? "Anonymous");
    }
  });

  it("never end a line on St., nor leave a small word on a line of its own between others", () => {
    for (const { c, size, w } of every()) {
      for (const lines of [w.titleLines, w.authorLines]) {
        lines.slice(0, -1).forEach((line) => {
          const words = line.split(/[  ]/);
          expect(words[words.length - 1], `${size}: ${c.title}: "${line}"`).not.toMatch(/^(?:St|S)\.$/);
        });
        lines.slice(1, -1).forEach((line) => {
          expect(line.split(/[  ]/).every((x) => SMALL.test(x)), `${size}: ${c.title}: "${line}"`).toBe(false);
        });
      }
    }
  });

  it("keep a title near its full size in a row and on a book's page, and an author on three lines at most", () => {
    for (const { c, size, w } of every()) {
      if (size === "row") expect(w.titleFit, `${size}: ${c.title}`).toBeGreaterThanOrEqual(0.7);
      if (size === "hero") expect(w.titleFit, `${size}: ${c.title}`).toBeGreaterThanOrEqual(0.82);
      expect(w.authorLines.length, `${size}: ${c.author}`).toBeLessThanOrEqual(3);
    }
  });

  it("fit each title to its narrowest poster: every run between breaks fits its line", () => {
    for (const { c, size, w } of every()) {
      const { min, scale } = SIZES[size];
      const g = GEOMETRY[scale];
      const px = (g.title[0] + (g.title[1] * min) / 100) * w.titleFit * (c.cover ? 1 : g.alone);
      const measure = (min * (100 - 2 * g.padX)) / 100 / px;
      for (const line of w.titleLines) expect(emWidth(line, "serif"), `${size}: "${line}"`).toBeLessThanOrEqual(measure);
    }
  });

  it("set the small words down with the word they belong to", () => {
    const john = coverWords({ title: "Homilies on the Gospel of John", author: "St. John Chrysostom", size: "row" });
    expect(john.title).toContain(`of${NBSP}John`);
    expect(john.titleLines[john.titleLines.length - 1]).toBe(`of${NBSP}John`);
    const ignatius = coverWords({ title: "Epistle to the Romans", author: "St. Ignatius of Antioch", size: "row" });
    expect(ignatius.author).toContain(`St.${NBSP}Ignatius`);
    expect(ignatius.authorLines).toEqual([`St.${NBSP}Ignatius`, `of${NBSP}Antioch`]);
  });
});
