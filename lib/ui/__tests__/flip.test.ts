import { describe, expect, it } from "vitest";
import { moveItem } from "../flip";

/**
 * moveItem is the whole reorder. Drag, Up, and Down all funnel into it, so an
 * off-by-one here is an off-by-one in every mechanism at once, and the result
 * is written straight to sort_order and published on /support.
 */
describe("moveItem", () => {
  const rows = ["a", "b", "c", "d"];

  it("moves an item down", () => {
    expect(moveItem(rows, 0, 1)).toEqual(["b", "a", "c", "d"]);
    expect(moveItem(rows, 0, 3)).toEqual(["b", "c", "d", "a"]);
  });

  it("moves an item up", () => {
    expect(moveItem(rows, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveItem(rows, 2, 1)).toEqual(["a", "c", "b", "d"]);
  });

  it("never mutates the array it was given", () => {
    const original = ["a", "b", "c"];
    moveItem(original, 0, 2);
    expect(original).toEqual(["a", "b", "c"]);
  });

  it("clamps rather than throwing at the ends", () => {
    // Both call sites can ask for this: Up on the first row, Down on the last,
    // and a drag that ends past the final row.
    expect(moveItem(rows, 0, -1)).toEqual(["a", "b", "c", "d"]);
    expect(moveItem(rows, 3, 99)).toEqual(["a", "b", "c", "d"]);
  });

  it("returns the list unchanged for an out of range source", () => {
    expect(moveItem(rows, -1, 0)).toEqual(rows);
    expect(moveItem(rows, 9, 0)).toEqual(rows);
  });

  it("keeps every element, always", () => {
    // The property that matters: a reorder is a permutation. Losing or
    // duplicating a row here would delete or double a cost line.
    for (let from = 0; from < rows.length; from++) {
      for (let to = 0; to < rows.length; to++) {
        const out = moveItem(rows, from, to);
        expect(out.length).toBe(rows.length);
        expect([...out].sort()).toEqual([...rows].sort());
      }
    }
  });

  it("is a no-op when the source and target match", () => {
    for (let i = 0; i < rows.length; i++) {
      expect(moveItem(rows, i, i)).toEqual(rows);
    }
  });
});
