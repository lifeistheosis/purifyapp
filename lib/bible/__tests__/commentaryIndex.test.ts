// A source-reading guard, in the idiom of lib/calendar/__tests__/noFrozenDay.test.ts.
//
// COMMENTED_BOOKS is a second source of truth beside data/bible/commentary/.
// It drives the "Fathers" badge, which is how a reader discovers that a book has
// commentary at all. When the two disagree in one direction the notes are live
// and unreachable; in the other, the badge points at nothing.
//
// It has already failed once. The Catena Aurea ingest wrote 2,948 notes for Mark
// and nothing named Mark here, so the entire book of commentary shipped dark and
// nobody could see it. Every gate passed, because no gate was looking.
//
// An ingest that writes data is not finished until its book appears in that set.

import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { COMMENTED_BOOKS, hasCommentary } from "../commentary-index";

const DIR = join(process.cwd(), "data", "bible", "commentary");

/** Book directories that actually hold at least one chapter of notes. */
function booksWithNotesOnDisk(): string[] {
  return readdirSync(DIR)
    .filter((entry) => statSync(join(DIR, entry)).isDirectory())
    .filter((entry) => readdirSync(join(DIR, entry)).some((f) => f.endsWith(".json")));
}

describe("the Fathers badge matches the commentary on disk", () => {
  const onDisk = booksWithNotesOnDisk();

  it("finds commentary on disk at all", () => {
    // Guards the guard: a wrong path would make every assertion below vacuous.
    expect(onDisk.length).toBeGreaterThan(20);
  });

  it("names every book that ships commentary", () => {
    const missing = onDisk.filter((b) => !COMMENTED_BOOKS.has(b));
    expect(
      missing,
      `These books have commentary in data/bible/commentary/ but are absent from ` +
        `COMMENTED_BOOKS, so their notes are live and unreachable in the app. ` +
        `Add them to lib/bible/commentary-index.ts.`,
    ).toEqual([]);
  });

  it("claims no book that has none", () => {
    const phantom = [...COMMENTED_BOOKS].filter((b) => !onDisk.includes(b));
    expect(
      phantom,
      `These books are listed in COMMENTED_BOOKS but have no commentary on disk, ` +
        `so the badge points at an empty rail.`,
    ).toEqual([]);
  });

  it("agrees with its own accessor", () => {
    for (const book of onDisk) expect(hasCommentary(book)).toBe(true);
    expect(hasCommentary("no-such-book")).toBe(false);
  });
});
