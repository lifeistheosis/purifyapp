// A page of a downloaded Bible (1.9): the app's page for chapter N shows the
// Bible's own chapter N, in its own numbering; the app's last page of a book
// shows any chapters the Bible has past it; a page whose verses the Bible
// sets in another chapter says which.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { biblePage, verseAnchor } from "@/lib/bible/downloads/page";
import type { BibleBookFile } from "@/lib/bible/downloads/store";

const ROOT = path.resolve(__dirname, "../../../..");
const book = (bible: string, slug: string) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, "public/bibles", bible, `${slug}.json`), "utf8")) as BibleBookFile;

describe("a page of a downloaded Bible", () => {
  it("is the Bible's own chapter, numbered as it numbers it", () => {
    const page = biblePage(book("ru-synodal", "psalms"), 50, 151);
    expect(page.sections.map((s) => s.chapter)).toEqual([50]);
    expect(page.sections[0].verses[2][0]).toBe(3);
    expect(page.last).toBe(21);
    expect(page.elsewhere).toBeNull();
  });

  it("on the app's last page of a book, shows the chapters the Bible has past it: the Greek's Joel 4 with its 3", () => {
    const joel = book("grc-lxx-patriarchal", "joel");
    expect(biblePage(joel, 2, 3).sections.map((s) => s.chapter)).toEqual([2]);
    const last = biblePage(joel, 3, 3);
    expect(last.sections.map((s) => s.chapter)).toEqual([3, 4]);
    expect(last.last).toBe(5);
  });

  it("says where the verses of a page stand when the Bible has none there", () => {
    expect(biblePage(book("grc-lxx-patriarchal", "malachi"), 4, 4)).toEqual({ sections: [], elsewhere: 3, last: 0 });
    expect(biblePage(book("grc-lxx-patriarchal", "proverbs"), 30, 31)).toEqual({ sections: [], elsewhere: 24, last: 0 });
  });

  it("is empty, and says nothing of elsewhere, for a chapter the Bible does not have: the screen shows the English then", () => {
    // The Bibles of the Hebrew canon end the Psalms at 150 and Daniel at 12.
    for (const id of ["sr-danicic-karadzic", "ar-van-dyck", "es-reina-valera-1909"]) {
      expect(biblePage(book(id, "psalms"), 151, 151), id).toEqual({ sections: [], elsewhere: null, last: 0 });
      expect(biblePage(book(id, "daniel"), 13, 14), id).toEqual({ sections: [], elsewhere: null, last: 0 });
      expect(biblePage(book(id, "daniel"), 12, 14).sections.map((s) => s.chapter), id).toEqual([12]);
    }
  });

  it("anchors a verse of its own chapter as the English does, and one past the app's last apart", () => {
    expect(verseAnchor(50, 50, 3)).toBe("v3");
    expect(verseAnchor(4, 3, 1)).toBe("c4v1");
    expect(verseAnchor(1, 1, "")).toBeUndefined();
    expect(verseAnchor(31, 31, "50a")).toBeUndefined();
  });

  // Build 95 note 25: the World English Bible, British Edition, opens as the six do.
  it("opens the World English Bible's chapters as it prints them: John 1, Genesis 1, its own Psalm 50, Susanna as Daniel 13", () => {
    const john = biblePage(book("en-web", "john"), 1, 21);
    expect(john.sections.map((s) => s.chapter)).toEqual([1]);
    expect(john.sections[0].verses[0]).toEqual([1, "In the beginning was the Word, and the Word was with God, and the Word was God."]);
    expect(john.last).toBe(51);
    expect(john.elsewhere).toBeNull();
    expect(verseAnchor(1, 1, john.sections[0].verses[0][0])).toBe("v1");

    expect(biblePage(book("en-web", "genesis"), 1, 50).sections[0].verses[0]).toEqual([1, "In the beginning, God created the heavens and the earth."]);

    // Numbered as the Hebrew: the app's page for Psalm 50 shows the Bible's own Psalm 50, its title before verse 1.
    const psalm = biblePage(book("en-web", "psalms"), 50, 151);
    expect(psalm.sections[0].verses.slice(0, 2)).toEqual([
      ["", "A Psalm by Asaph."],
      [1, "The Mighty One, God, the LORD, speaks, and calls the earth from sunrise to sunset."],
    ]);

    const susanna = biblePage(book("en-web", "daniel"), 13, 14);
    expect(susanna.sections.map((s) => s.chapter)).toEqual([13]);
    expect(susanna.sections[0].verses[0]).toEqual([1, "A man lived in Babylon, and his name was Joakim."]);
  });
});
