import { describe, expect, it } from "vitest";

import type { Bookmark } from "@/lib/bookmarks";
import { youBadges } from "@/lib/profile/myBadges";
import { COVER_PLATE } from "@/lib/readAloud/covers";
import type { SavedItem } from "@/lib/saved/feed";

import { coverOf, subjectOf } from "../covers";

// The covers on the You tab (1.8, note 71, the owner's pick A of r3-25): each
// place a reader left off and each group of what they kept wears the picture
// of what it is, from pictures the app already shows and has checked.

const base = { id: "b", addedAt: 1, label: "" };
const item = (bookmark: Bookmark | null, extra: Partial<SavedItem> = {}): SavedItem => ({ key: "k", bookmark, highlight: null, at: 1, ...extra });

describe("what a cover is of", () => {
  it("is the book of a verse, a chapter or a walk's card", () => {
    expect(subjectOf(item({ ...base, kind: "bible-verse", book: "john", bookName: "John", chapter: 3, verse: 5 }))).toEqual({ kind: "book", book: "john" });
    expect(subjectOf(item({ ...base, kind: "bible-chapter", book: "matthew", bookName: "Matthew", chapter: 1 }))).toEqual({ kind: "book", book: "matthew" });
    expect(subjectOf(item(null, { highlight: { book: "psalms", chapter: 50, verse: 1, color: "c", whole: true, words: [], at: null } }))).toEqual({ kind: "book", book: "psalms" });
  });

  it("is the saint of a writing, a highlighted paragraph or a saint kept", () => {
    expect(
      subjectOf(item({ ...base, kind: "writing-section", saintSlug: "ignatius-of-antioch", saintName: "Ignatius", workSlug: "romans", workTitle: "Romans", sectionN: 4, sectionTitle: "" })),
    ).toEqual({ kind: "saint", slug: "ignatius-of-antioch" });
    expect(subjectOf(item(null, { passage: { saintSlug: "john-chrysostom", workSlug: "w", sectionN: 1, paragraphIdx: 0, color: "c", at: null } }))).toEqual({
      kind: "saint",
      slug: "john-chrysostom",
    });
    expect(subjectOf(item({ ...base, kind: "saint", saintSlug: "saint-george" }))).toEqual({ kind: "saint", slug: "saint-george" });
  });

  it("is the Pantocrator for a prayer, the piece's own picture for an icon, and nothing for history", () => {
    expect(subjectOf(item({ ...base, kind: "prayer", ruleId: "morning", prayerId: "p" }))).toEqual({ kind: "prayer" });
    expect(subjectOf(item({ ...base, kind: "product", productSlug: "x", storeName: "s", priceLabel: "$1", imageUrl: "/shop/x.jpg" }))).toEqual({ kind: "picture", src: "/shop/x.jpg" });
    expect(subjectOf(item({ ...base, kind: "product", productSlug: "x", storeName: "s", priceLabel: "$1" }))).toBeNull();
    expect(subjectOf(item({ ...base, kind: "history-event", eventSlug: "e", displayDate: "" }))).toBeNull();
  });
});

describe("the cover drawn", () => {
  it("is a book's icon from the website, the plate the apps carry behind it", () => {
    const john = coverOf({ kind: "book", book: "john" });
    expect(john?.src).toBe("/covers/john.v1.jpg");
    expect(john?.fallback).toBe(COVER_PLATE);
    // A book with no icon that passed is the plate itself.
    expect(coverOf({ kind: "book", book: "ezra" })?.src).toBe(COVER_PLATE);
  });

  it("is a saint's settled cover, else his page's picture, else none", () => {
    expect(coverOf({ kind: "saint", slug: "ignatius-of-antioch" })?.src).toBe("/covers/authors/ignatius-of-antioch.v1.jpg");
    expect(coverOf({ kind: "saint", slug: "saint-george" })?.src).toMatch(/^\/covers\/saints\/saint-george\./);
    expect(coverOf({ kind: "saint", slug: "no-such-saint" })).toBeNull();
    expect(coverOf(null)).toBeNull();
  });

  it("is the prayer pages' own Pantocrator for a prayer, bundled", () => {
    expect(coverOf({ kind: "prayer" })?.src).toMatch(/^\/icons\/prayer\/christ-pantocrator/);
  });
});

describe("the reader's badges on You", () => {
  it("are the profile's, in its order, less the streak's: the rope is the streak there", () => {
    expect(youBadges([{ id: "plus" }, { id: "streak_40" }, { id: "psalter" }, { id: "first_share" }, { id: "streak_7" }, { id: "nonsense" }, { id: "plus" }])).toEqual([
      "plus",
      "psalter",
      "first_share",
    ]);
    expect(youBadges([])).toEqual([]);
  });
});
