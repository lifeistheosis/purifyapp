// How far a reader is in a work (lib/reading/progress.ts): what the room's
// Continue row and a book's Continue button read.

import { describe, expect, it } from "vitest";

import { withProgress } from "@/lib/reading/progress";

describe("a reader's progress in a work", () => {
  it("keeps the section, its place and the work's length", () => {
    const store = withProgress({}, "john-cassian/institutes", { n: 157, i: 156, of: 268 }, 1000);
    expect(store["john-cassian/institutes"]).toEqual({ n: 157, i: 156, of: 268, at: 1000 });
  });

  it("is done at the last section, and stays done when the reader looks back", () => {
    let store = withProgress({}, "a/b", { n: 12, i: 11, of: 12 }, 1);
    expect(store["a/b"].done).toBe(true);
    store = withProgress(store, "a/b", { n: 3, i: 2, of: 12 }, 2);
    expect(store["a/b"]).toMatchObject({ n: 3, i: 2, done: true });
  });

  it("refuses what is not a place in a work, and lets the oldest go", () => {
    expect(withProgress({}, "a/b", { n: 1, i: -1, of: 3 }, 1)).toEqual({});
    expect(withProgress({}, "a/b", { n: 1, i: 0, of: 0 }, 1)).toEqual({});
    let store = {};
    for (let k = 0; k < 70; k++) store = withProgress(store, `s/w${k}`, { n: 1, i: 0, of: 5 }, k);
    expect(Object.keys(store)).toHaveLength(60);
    expect(store).not.toHaveProperty("s/w0");
    expect(store).toHaveProperty("s/w69");
  });
});
