// A florilegium handed on as words (1.9, s5-05): every line as it was kept,
// its source under it, the reader's note after, nothing reworded.

import { describe, expect, it } from "vitest";

import { florilegiumAsText, itemSource } from "@/lib/florilegium/asText";
import type { Florilegium } from "@/lib/florilegium/florilegium";

const F: Florilegium = {
  id: "g1",
  title: "On Prayer",
  description: "Lines that struck me",
  createdAt: 1,
  updatedAt: 2,
  items: [
    { id: "i1", addedAt: 1, kind: "scripture", text: "Pray without ceasing.", reference: "1 Thessalonians 5:17", book: "1-thessalonians", chapter: 5, verse: 17 },
    { id: "i2", addedAt: 2, kind: "father", text: "Prayer is the breath of the soul.", author: "St Theophan", work: "The Art of Prayer", note: "keep this" },
    { id: "i3", addedAt: 3, kind: "father", text: "   ", author: "Nobody" },
  ],
};

describe("a florilegium as words", () => {
  it("names each line's source as its card does", () => {
    expect(itemSource(F.items[0])).toBe("1 Thessalonians 5:17");
    expect(itemSource(F.items[1])).toBe("St Theophan, The Art of Prayer");
  });

  it("keeps every line word for word, its source under it and the note after, and leaves out a line with no words", () => {
    expect(florilegiumAsText(F)).toBe(
      [
        "On Prayer",
        "Lines that struck me",
        "Pray without ceasing.\n1 Thessalonians 5:17",
        "Prayer is the breath of the soul.\nSt Theophan, The Art of Prayer\n(keep this)",
        "purifyapp.net",
      ].join("\n\n"),
    );
  });

  it("writes no em dash of its own", () => {
    expect(florilegiumAsText(F)).not.toContain("—");
  });
});
