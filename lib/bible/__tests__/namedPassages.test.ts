import { describe, expect, it } from "vitest";

import { namedPassageHits, passageForChapter, searchBible } from "@/lib/bible/books";

// A reader asked on Discord (2026-09-23) why Purify did not carry Susanna, the
// Song of the Three, Bel and the Dragon or Psalm 151. All four were already
// here, filed the Septuagint's way inside Daniel and as the 151st psalm, and
// none of them could be found by name. These pin the way in.

const where = (q: string) =>
  searchBible(q).map((h) =>
    h.kind === "verse"
      ? `${h.book.slug} ${h.chapter}:${h.verse}${h.passage ? ` [${h.passage}]` : ""}`
      : h.kind === "chapter"
        ? `${h.book.slug} ${h.chapter}${h.passage ? ` [${h.passage}]` : ""}`
        : h.book.slug,
  );

describe("the passages the Church knows by name", () => {
  it("finds Susanna as Daniel 13", () => {
    expect(where("Susanna")[0]).toBe("daniel 13 [susanna]");
    expect(where("susannah")[0]).toBe("daniel 13 [susanna]");
  });

  it("finds Bel and the Dragon as Daniel 14, by either word", () => {
    expect(where("Bel and the Dragon")[0]).toBe("daniel 14 [bel]");
    expect(where("bel")[0]).toBe("daniel 14 [bel]");
    expect(where("dragon")[0]).toBe("daniel 14 [bel]");
  });

  it("finds the Prayer of Azariah and the Song of the Three where they begin in Daniel 3", () => {
    expect(where("Prayer of Azariah")[0]).toBe("daniel 3:25 [azariah]");
    expect(where("Song of the Three")[0]).toBe("daniel 3:52 [song-of-the-three]");
    expect(where("three holy children")[0]).toBe("daniel 3:52 [song-of-the-three]");
    expect(where("Benedicite")[0]).toBe("daniel 3:52 [song-of-the-three]");
  });

  it("still finds Psalm 151 the way it always could", () => {
    expect(where("Psalm 151")).toContain("psalms 151");
  });

  it("does not crowd out ordinary book searches", () => {
    // "song" still finds the Song of Songs; the Song of the Three joins it.
    const song = where("song");
    expect(song).toContain("song-of-solomon");
    expect(song).toContain("daniel 3:52 [song-of-the-three]");
    // Common words find nothing on their own.
    expect(namedPassageHits("the")).toEqual([]);
    expect(namedPassageHits("of")).toEqual([]);
    // A plain book search is unchanged.
    expect(where("john 3")[0]).toBe("john 3");
  });

  it("finds a passage by its name in the reader's own language", () => {
    expect(namedPassageHits("Сусанна", { susanna: "Сусанна" }).map((h) => h.kind === "chapter" && h.passage)).toEqual([
      "susanna",
    ]);
  });

  it("names the two chapters that ARE a passage, and no others", () => {
    expect(passageForChapter("daniel", 13)).toBe("susanna");
    expect(passageForChapter("daniel", 14)).toBe("bel");
    // Daniel 3 contains two passages but is not one: it gets links, not a title.
    expect(passageForChapter("daniel", 3)).toBeNull();
    expect(passageForChapter("daniel", 12)).toBeNull();
  });
});
