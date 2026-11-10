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
});
