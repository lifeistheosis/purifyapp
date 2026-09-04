import { describe, expect, it } from "vitest";

import { changed, diffWords } from "@/lib/admin/textDiff";

const joinKinds = (ops: ReturnType<typeof diffWords>, kinds: string[]) =>
  ops.filter((o) => kinds.includes(o.kind)).map((o) => o.text).join("");

describe("diffWords", () => {
  it("returns one same op for identical text and nothing for empty", () => {
    expect(diffWords("a b c", "a b c")).toEqual([{ kind: "same", text: "a b c" }]);
    expect(diffWords("", "")).toEqual([]);
  });

  it("re-joins to both inputs", () => {
    const a = "The app had a back button and it was fitted per screen.";
    const b = "The app had a back button, and it was fitted on ten screens.";
    const ops = diffWords(a, b);
    expect(joinKinds(ops, ["same", "del"])).toBe(a);
    expect(joinKinds(ops, ["same", "add"])).toBe(b);
  });

  it("lights up only the words that moved", () => {
    const ops = diffWords("one two three four", "one two 3 four");
    expect(ops).toEqual([
      { kind: "same", text: "one two " },
      { kind: "del", text: "three " },
      { kind: "add", text: "3 " },
      { kind: "same", text: "four" },
    ]);
  });

  it("handles a wholly new or wholly removed string", () => {
    expect(diffWords("", "new words")).toEqual([{ kind: "add", text: "new words" }]);
    expect(diffWords("old words", "")).toEqual([{ kind: "del", text: "old words" }]);
  });

  it("merges adjacent ops of one kind", () => {
    const ops = diffWords("a b c d", "a x y d");
    const kinds = ops.map((o) => o.kind);
    // No two neighbours share a kind.
    for (let i = 1; i < kinds.length; i++) expect(kinds[i]).not.toBe(kinds[i - 1]);
  });
});

describe("changed", () => {
  it("ignores whitespace-only differences", () => {
    expect(changed("a  b", "a b")).toBe(false);
    expect(changed(" a b ", "a b")).toBe(false);
    expect(changed("a b", "a c")).toBe(true);
  });
});
