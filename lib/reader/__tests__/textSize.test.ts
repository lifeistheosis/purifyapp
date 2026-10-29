// The Bible reads at Large for a reader who has never chosen a size (1.8,
// with the owner's pick B of the reader's buttons and his "add everything we
// left out" of 2026-10-28: 19px on a phone, as the page is drawn,
// Homebase/boards/purify-master/variants/02-bible). A reader who chose one
// keeps theirs, Medium included.
//
// What a reader would notice if this broke: the Bible small again on a first
// open, a size they chose overridden, the settings sheet lighting a size the
// page is not drawn at, or the prayers and the Fathers' works growing with it.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BIBLE_START_SIZE, STORE_DEFAULT_SIZE, sizeShown, storedSize } from "@/lib/reader/textSize";

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");

describe("a reader who has never chosen a size", () => {
  it("reads the Bible at Large, 19px on a phone", () => {
    expect(BIBLE_START_SIZE).toBe("lg");
    const shown = sizeShown({ ...pick(storedSize(null)) }, BIBLE_START_SIZE);
    expect(shown).toBe("lg");
    // Large is 19px on a phone (text-lede, --text-lede: 19px).
    expect(read("components/reader/ReaderPrefs.tsx")).toMatch(/lg: "text-lede md:text-title-sm /);
    expect(read("app/globals.css")).toMatch(/--text-lede: 19px;/);
  });

  it("is a reader with nothing stored, or something that is no size", () => {
    expect(storedSize(null)).toEqual({ size: STORE_DEFAULT_SIZE, chosen: false });
    expect(storedSize("")).toEqual({ size: STORE_DEFAULT_SIZE, chosen: false });
    expect(storedSize("huge")).toEqual({ size: STORE_DEFAULT_SIZE, chosen: false });
  });

  it("starts anywhere else where it always did", () => {
    // No start asked for: the store's own default, Medium.
    expect(sizeShown(pick(storedSize(null)))).toBe("md");
  });
});

describe("a reader who chose a size", () => {
  it("keeps it in the Bible, Medium and Small included", () => {
    for (const size of ["sm", "md", "lg", "xl"] as const) {
      expect(storedSize(size)).toEqual({ size, chosen: true });
      expect(sizeShown(pick(storedSize(size)), BIBLE_START_SIZE)).toBe(size);
    }
  });
});

describe("where the start is asked for", () => {
  it("is the Bible's readers, both of them, and the Bible's settings, on a phone and a computer", () => {
    expect(read("components/bible/ChapterReader.tsx")).toContain("useReaderPrefs(BIBLE_START_SIZE)");
    expect(read("components/bible/LicensedChapterReader.tsx")).toContain("useReaderPrefs(BIBLE_START_SIZE)");
    // The size lit in the settings is the size on the page.
    expect(read("components/bible/MobileReaderActions.tsx")).toMatch(/<ReaderSettingsSheet [^>]*startSize=\{BIBLE_START_SIZE\}/);
    expect(read("components/bible/ChapterScreen.tsx")).toMatch(/<ReaderSettingsMenu [^>]*startSize=\{BIBLE_START_SIZE\}/);
    expect(read("components/bible/ReaderSettingsMenu.tsx")).toContain("useReaderPrefs(startSize)");
  });

  it("is nowhere else: the prayers and the Fathers' works start where they did", () => {
    for (const file of ["components/prayers/service/PrayerStep.tsx", "components/prayers/service/CommemorationStep.tsx", "components/saints/WritingReader.tsx"]) {
      const src = read(file);
      expect(src, file).toContain("useReaderPrefs()");
      expect(src, file).not.toContain("BIBLE_START_SIZE");
    }
    // A saint's work opens the same settings sheet without the Bible's start.
    expect(read("components/saints/MobileWorkActions.tsx")).not.toContain("startSize");
  });

  it("writes nothing for the reader: only their own choice is stored", () => {
    const prefs = read("components/reader/ReaderPrefs.tsx");
    expect(prefs).toContain("const { size, chosen: sizeChosen } = storedSize(rawS);");
    expect(prefs).toContain("const size = sizeShown(snap, startSize);");
    // The size key is written by a choice alone.
    expect(prefs.match(/write\(SIZE_KEY,/g)?.length).toBe(2);
  });
});

/** A snapshot of the store from what storedSize answers. */
function pick(s: { size: "sm" | "md" | "lg" | "xl"; chosen: boolean }) {
  return { size: s.size, sizeChosen: s.chosen };
}
