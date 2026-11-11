// Words a reader marked in a text are theirs to find again: in Saved, in the
// You tab's count, and in the library they can take away (build 93 note 13).

import { describe, expect, it } from "vitest";

import { humanRefFromKey } from "@/lib/library/exportLibrary";
import { countAnnotations } from "@/lib/profile/readingStats";
import { colorOf, inFilter, savedFeed, wordsFrom } from "@/lib/saved/feed";

const blue = { id: "m1", s: 4, e: 11, q: "kingdom", color: "blue", cite: "St. Cyprian of Carthage, On the Mortality, Chapter 2", href: "/saints/cyprian-of-carthage/on-the-mortality#p-2-0", at: "2026-11-11T00:00:00.000Z" };
const keptOnly = { id: "m2", s: 20, e: 26, q: "beloved", kept: true, note: "For Sunday.", at: "2026-11-10T00:00:00.000Z" };
const workKey = "purify:saint:cyprian-of-carthage:on-the-mortality:2:0";
const councilKey = "purify:text:council:first-nicaea:the-twenty-canons:7:1";

describe("Saved", () => {
  it("lists each run of marked words with its words, whose they are and where they open", () => {
    const words = wordsFrom(workKey, JSON.stringify({ highlighted: true, marks: [blue, keptOnly] }));
    expect(words).toHaveLength(2);
    expect(words[0]).toMatchObject({ storeKey: workKey, id: "m1", quote: "kingdom", color: "blue", cite: blue.cite, href: blue.href });
    expect(words[1]).toMatchObject({ id: "m2", quote: "beloved", color: null, note: "For Sunday." });
  });

  it("reads the other texts' paragraphs too, and nothing from anywhere else", () => {
    expect(wordsFrom(councilKey, JSON.stringify({ marks: [blue] }))).toHaveLength(1);
    expect(wordsFrom("purify:bible:john:1:1", JSON.stringify({ marks: [blue] }))).toEqual([]);
    expect(wordsFrom(workKey, "not json")).toEqual([]);
    expect(wordsFrom(workKey, JSON.stringify({ marks: [{ id: "x" }, "nonsense"] }))).toEqual([]);
  });

  it("puts them under Writings, and under Highlights and their colour when they wear one", () => {
    const feed = savedFeed([], [], [], wordsFrom(workKey, JSON.stringify({ marks: [blue, keptOnly] })));
    expect(feed.map((i) => i.words?.id)).toEqual(["m1", "m2"]);
    const [coloured, kept] = feed;
    expect(inFilter(coloured, "writings") && inFilter(kept, "writings")).toBe(true);
    expect(inFilter(coloured, "highlights")).toBe(true);
    expect(inFilter(kept, "highlights")).toBe(false);
    expect(colorOf(coloured)).toBe("blue");
    expect(colorOf(kept)).toBeNull();
  });
});

describe("the You tab's count", () => {
  it("counts what Saved lists: a whole paragraph, each run of marked words, and each note", () => {
    const counts = countAnnotations([
      [workKey, JSON.stringify({ highlighted: true, note: "On the whole of it.", marks: [blue, keptOnly] })],
      [councilKey, JSON.stringify({ marks: [blue] })],
      ["purify:bible:john:1:1", JSON.stringify({ highlighted: true })],
    ]);
    expect(counts).toEqual({ verses: 1, paragraphs: 4, notes: 2 });
  });
});

describe("the library a reader takes away", () => {
  it("names another text's paragraph by its place when a mark carries no citation", () => {
    expect(humanRefFromKey(councilKey)).toBe("First Nicaea · The Twenty Canons §7.1");
    expect(humanRefFromKey("purify:text:life:anthony-the-great:-:1:0")).toBe("Anthony The Great §1.0");
  });
});
