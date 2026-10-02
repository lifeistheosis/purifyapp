import { describe, expect, it } from "vitest";

import { chapterRefOf, findChapterRef, validChapterRef } from "../chapterRef";

describe("findChapterRef", () => {
  it("finds the first reference in what a reader wrote", () => {
    expect(findChapterRef(["I keep coming back to John 3:16 this week."])).toBe("john/3");
    expect(findChapterRef(["Reading 1 Cor 13:4 at the wedding"])).toBe("1-corinthians/13");
    expect(findChapterRef(["Rev. 21:4 has always comforted me"])).toBe("revelation/21");
    expect(findChapterRef([null, "Mt 5:3, the Beatitudes"])).toBe("matthew/5");
    expect(findChapterRef(["Song of Solomon 2:4"])).toBe("song-of-solomon/2");
  });

  it("takes the Psalms without a verse, and nothing else", () => {
    expect(findChapterRef(["Praying Psalm 51 tonight"])).toBe("psalms/51");
    expect(findChapterRef(["Mark 2 of these down for later"])).toBeNull();
  });

  it("does not read a time or a missing chapter as a reference", () => {
    expect(findChapterRef(["My job 9:00 to 5:00"])).toBeNull();
    expect(findChapterRef(["Meet at 3:30 after Vespers"])).toBeNull();
    expect(findChapterRef(["John 99:1"])).toBeNull();
  });
});

describe("validChapterRef", () => {
  it("accepts a chapter that exists and refuses one that does not", () => {
    expect(validChapterRef("john/21")).toBe("john/21");
    expect(validChapterRef("john/22")).toBeNull();
    expect(validChapterRef("nonsense/1")).toBeNull();
    expect(validChapterRef("john 3")).toBeNull();
    expect(validChapterRef(null)).toBeNull();
    expect(chapterRefOf("psalms", 150)).toBe("psalms/150");
  });
});
