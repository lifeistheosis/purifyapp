import { describe, expect, it } from "vitest";

// The helper lives in scripts/lib/ with the other ingest machinery, but vitest
// collects lib/** only, so the test lives here and reaches across. An
// untested extractor is how column bleed ships.
import { findGutter, readingOrder } from "@/scripts/lib/djvu-columns.mjs";

/**
 * Reading order on a two-column scan.
 *
 * The failure this prevents is quiet. archive.org's plain text has no
 * coordinates, so on a two-column page it alternates between the columns and
 * produces sentences that are half from one and half from the other. The
 * result still READS like liturgical English, which is exactly why it would
 * have shipped: Great Vespers came out of the plain text at a median line
 * length of 27 characters against 69 for the single-column pre-Communion
 * prayers, and nothing about the words themselves looked wrong.
 *
 * Geometry is synthetic here on purpose. Pinning this to the real 22 MB scan
 * would make the suite depend on a network fetch and on one book.
 */

type L = { x1: number; x2: number; y: number; text: string };
const W = 1464;

/** Two columns, left at x 80..560, right at x 760..1380. */
function twoColumn(): L[] {
  return [
    { x1: 80, x2: 540, y: 100, text: "left one" },
    { x1: 760, x2: 1380, y: 110, text: "right one" },
    { x1: 80, x2: 540, y: 200, text: "left two" },
    { x1: 760, x2: 1380, y: 210, text: "right two" },
    { x1: 80, x2: 540, y: 300, text: "left three" },
    { x1: 760, x2: 1380, y: 310, text: "right three" },
  ];
}

describe("readingOrder", () => {
  it("reads a two-column page down one column, then the other", () => {
    // Sorted by y alone this is "left one, right one, left two, ...", which is
    // the interleaving that makes the plain text unusable.
    expect(readingOrder(twoColumn(), W)).toEqual([
      "left one",
      "left two",
      "left three",
      "right one",
      "right two",
      "right three",
    ]);
  });

  it("leaves a single-column page in plain y order", () => {
    const lines: L[] = [
      { x1: 80, x2: 1380, y: 300, text: "third" },
      { x1: 80, x2: 1380, y: 100, text: "first" },
      { x1: 80, x2: 1380, y: 200, text: "second" },
      { x1: 80, x2: 1380, y: 400, text: "fourth" },
    ];
    expect(readingOrder(lines, W)).toEqual(["first", "second", "third", "fourth"]);
  });

  it("bands a page that is single column above and two columns below", () => {
    /**
     * This is page 40 of the Hapgood scan, and it is why banding exists.
     * The page runs as one column down to the heading "Psalm civ." and
     * splits into two beneath it. Treating the page as uniformly one or the
     * other gets it wrong either way.
     */
    // Proportions matter and an earlier version of this fixture got them
    // wrong. Three full-width lines out of seven is 43% of lines crossing the
    // gutter, and the extractor correctly reads that as "this is not a
    // two-column page, leave it alone". The real page 40 is three full-width
    // lines out of fifty-five. So the fixture carries a realistic column body.
    const lines: L[] = [
      { x1: 80, x2: 1380, y: 100, text: "Deacon. Arise, Master" },
      { x1: 80, x2: 1380, y: 200, text: "Priest. Glory to the Holy" },
      // A narrow centred heading sitting over the left column, which is where
      // it is on the real page (x=228 of a 1464-wide scan). An earlier version
      // of this fixture put it at 400..1000, straddling the gutter, which is
      // a position it never occupies, and asserted an order the page does not
      // produce.
      { x1: 228, x2: 520, y: 300, text: "Psalm civ." },
    ];
    for (let i = 0; i < 10; i++) {
      lines.push({ x1: 80, x2: 540, y: 400 + i * 40, text: `psalm ${i}` });
      lines.push({ x1: 760, x2: 1380, y: 410 + i * 40, text: `rubric ${i}` });
    }
    const order = readingOrder(lines, W);

    // The full-width lines stay above, in order.
    expect(order.slice(0, 2)).toEqual([
      "Deacon. Arise, Master",
      "Priest. Glory to the Holy",
    ]);
    // Then the heading leads its own column, and the psalm runs contiguously
    // with no rubric spliced into it. That splicing is the entire bug.
    expect(order.slice(2, 13)).toEqual([
      "Psalm civ.",
      ...Array.from({ length: 10 }, (_, i) => `psalm ${i}`),
    ]);
    expect(order.slice(13)).toEqual(
      Array.from({ length: 10 }, (_, i) => `rubric ${i}`),
    );
  });

  it("does not split a page where only one side has any text", () => {
    // A short page with a wide margin can look bimodal. One populated side
    // means one column, whatever the gutter search says.
    const lines: L[] = [
      { x1: 80, x2: 500, y: 100, text: "a" },
      { x1: 80, x2: 500, y: 200, text: "b" },
      { x1: 80, x2: 500, y: 300, text: "c" },
      { x1: 80, x2: 500, y: 400, text: "d" },
    ];
    expect(readingOrder(lines, W)).toEqual(["a", "b", "c", "d"]);
  });

  it("handles a page too short to analyse", () => {
    const lines: L[] = [{ x1: 80, x2: 1380, y: 200, text: "only" }];
    expect(readingOrder(lines, W)).toEqual(["only"]);
  });
});

describe("findGutter", () => {
  it("puts the gutter between the columns and reports few crossings", () => {
    const { gutter, crossings } = findGutter(twoColumn(), W);
    expect(gutter).toBeGreaterThan(540);
    expect(gutter).toBeLessThan(760);
    expect(crossings).toBe(0);
  });

  it("reports heavy crossing on a single-column page, which is the signal", () => {
    // Every full-width line crosses the middle. That count is what tells
    // readingOrder to leave the page alone.
    const lines: L[] = Array.from({ length: 10 }, (_, i) => ({
      x1: 80,
      x2: 1380,
      y: i * 100,
      text: `line ${i}`,
    }));
    expect(findGutter(lines, W).crossings).toBe(10);
  });
});
