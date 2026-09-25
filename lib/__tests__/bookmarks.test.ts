import { describe, expect, it } from "vitest";

import { bookmarkHref, bookmarkKey, type Bookmark } from "@/lib/bookmarks";

// The saint kind, added 2026-09-25 after a reader asked for a way to keep a
// saint "so you don't have to search each time". These two functions are the
// whole of what makes a bookmark findable and unique, and neither had a test.

const base = { id: "a", addedAt: 1, label: "St. Anthony the Great" };

const saint = (over: Partial<Bookmark> = {}): Bookmark =>
  ({ ...base, kind: "saint", saintSlug: "anthony-the-great", ...over }) as Bookmark;

describe("the saint bookmark", () => {
  it("links to the saint's own page", () => {
    expect(bookmarkHref(saint())).toBe("/saints/anthony-the-great");
  });

  it("is the same bookmark however it was labelled or when it was added", () => {
    // dedupe() collapses on this key, so a saint saved twice, or saved on a
    // second device with a different label, must still be one entry.
    const a = saint({ id: "a", addedAt: 1, label: "St. Anthony the Great" });
    const b = saint({ id: "b", addedAt: 99, label: "Anthony" });
    expect(bookmarkKey(a)).toBe(bookmarkKey(b));
  });

  it("is a different bookmark from another saint", () => {
    expect(bookmarkKey(saint())).not.toBe(
      bookmarkKey(saint({ saintSlug: "basil-the-great" })),
    );
  });

  it("never collides with a saved passage from the same saint's writings", () => {
    // Saving the saint and saving one of their sections are two different
    // acts, and removing one must not remove the other.
    const section = {
      ...base,
      kind: "writing-section",
      saintSlug: "anthony-the-great",
      saintName: "St. Anthony the Great",
      workSlug: "letters",
      workTitle: "Letters",
      sectionN: 1,
      sectionTitle: "Letter I",
    } as Bookmark;
    expect(bookmarkKey(saint())).not.toBe(bookmarkKey(section));
  });
});
