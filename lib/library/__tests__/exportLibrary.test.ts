import { describe, expect, it } from "vitest";

import {
  humanRefFromKey,
  librarySummary,
  toJson,
  toMarkdown,
  type LibraryData,
} from "@/lib/library/exportLibrary";

const DATA: LibraryData = {
  exportedAt: "2026-07-13T10:00:00.000Z",
  florilegia: [
    {
      id: "f1",
      title: "On Prayer",
      description: "Lines that struck me",
      createdAt: 1,
      updatedAt: 2,
      items: [
        {
          id: "i1",
          addedAt: 1,
          kind: "scripture",
          text: "Pray without ceasing.",
          reference: "1 Thessalonians 5:17",
          book: "1-thessalonians",
          chapter: 5,
          verse: 17,
        },
        {
          id: "i2",
          addedAt: 2,
          kind: "father",
          text: "Prayer is the breath of the soul.",
          author: "St Theophan",
          work: "The Art of Prayer",
          note: "keep this",
        },
      ],
    },
  ],
  bookmarks: [{ label: "John 1 — the Word" }],
  diptychs: {
    living: [{ id: "l1", name: "Maria", relationship: "mother", nameday: "08-15", addedAt: "x" }],
    departed: [{ id: "d1", name: "Georgios", repose: "2020-01-02", addedAt: "y" }],
  },
  annotations: [{ ref: "John 3:16", note: "the whole gospel" }],
};

describe("export library", () => {
  it("humanises annotation storage keys", () => {
    expect(humanRefFromKey("purify:bible:john:1:1")).toBe("John 1:1");
    expect(humanRefFromKey("purify:bible:1-thessalonians:5:17")).toBe(
      "1 Thessalonians 5:17",
    );
    expect(
      humanRefFromKey("purify:saint:athanasius-the-great:on-the-incarnation:2:3"),
    ).toBe("Athanasius The Great · On The Incarnation §2.3");
  });

  it("summarises counts", () => {
    const s = librarySummary(DATA);
    expect(s.florilegia).toBe(1);
    expect(s.gatheredLines).toBe(2);
    expect(s.bookmarks).toBe(1);
    expect(s.names).toBe(2);
    expect(s.notes).toBe(1);
  });

  it("renders readable markdown with every section", () => {
    const md = toMarkdown(DATA);
    expect(md).toContain("# My Purify library");
    expect(md).toContain("### On Prayer");
    expect(md).toContain("Pray without ceasing.");
    expect(md).toContain("1 Thessalonians 5:17");
    expect(md).toContain("St Theophan, The Art of Prayer");
    expect(md).toContain("keep this");
    expect(md).toContain("Maria (mother) · name day 08-15");
    expect(md).toContain("Georgios · reposed 2020-01-02");
    expect(md).toContain("**John 3:16**: the whole gospel");
    expect(md).toContain("John 1 — the Word");
  });

  it("produces valid JSON that round-trips", () => {
    const parsed = JSON.parse(toJson(DATA)) as LibraryData;
    expect(parsed.florilegia[0].title).toBe("On Prayer");
    expect(parsed.diptychs.departed[0].name).toBe("Georgios");
  });
});
