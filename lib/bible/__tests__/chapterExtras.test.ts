import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  chapterCommentaryFile,
  chapterCrossRefFile,
  chapterInterlinear,
  chapterOfFile,
  commentaryFiles,
  crossRefFiles,
  crossRefVerses,
  interlinearFiles,
  interlinearState,
  strongsFile,
} from "../chapterExtras";
import { loadChapter } from "../load";
import { hebrewState } from "../hebrewText";

/**
 * A chapter's files (app/bible-data/) and the chapter page that no longer
 * carries them. The first half holds the files to what the reader needs; the
 * last test holds the page to its diet, so the weight this took off cannot
 * come back as a prop without somebody deleting an assertion.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");
const bytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v), "utf8");

describe("the Greek beside a chapter", () => {
  it("is shown for the New Testament and the paired Old Testament, and for no book without it", async () => {
    expect(await interlinearState("john", 1)).toBe("shown");
    expect(await interlinearState("genesis", 1)).toBe("shown");
    expect(await interlinearState("no-such-book", 1)).toBe("none");
  });

  it("carries the Greek, word by word, and the English tagged to pair with it", async () => {
    const john = await chapterInterlinear("john", 1);
    expect(john).not.toBeNull();
    const verses = (await loadChapter("john", 1))!.verses;
    // A line of Greek for every English verse, numbered as the English is.
    for (const v of verses) expect(john!.text[v.n], `John 1:${v.n}`).toBeTruthy();
    // Normalised: the text writes its accents as the Greek block's own "oxia".
    expect(john!.text[1].normalize("NFC")).toContain("Λόγος".normalize("NFC"));
    expect(john!.tokens[1].some((t) => t.s === "3056")).toBe(true);
    expect(john!.english[1].some((t) => t.s === "3056")).toBe(true);
  });

  it("finds each tagged word in the one lexicon every chapter shares", async () => {
    const lexicon = strongsFile();
    expect(lexicon["3056"].l).toBe("λόγος");
    expect(Object.keys(lexicon).some((k) => k.startsWith("G"))).toBe(false);
    const john = await chapterInterlinear("john", 1);
    const tagged = Object.values(john!.tokens).flat().filter((t) => t.s);
    const found = tagged.filter((t) => lexicon[t.s!]);
    // The lexicon is Strong's and the text has a few forms it does not list.
    expect(found.length / tagged.length).toBeGreaterThan(0.98);
    // One file for the whole Bible, and small enough to read at a tap.
    expect(bytes(lexicon)).toBeLessThan(800_000);
  });

  it("writes a file for every chapter that shows it, and for no other", async () => {
    const files = await interlinearFiles();
    expect(files).toContainEqual({ book: "john", file: "1.json" });
    expect(files).toContainEqual({ book: "genesis", file: "1.json" });
    // 260 New Testament chapters and the Old Testament ones that pair verse for verse,
    // with the Greek or, from 1.9, with the Hebrew (lib/bible/hebrewText.ts).
    expect(files.length).toBeGreaterThan(1000);
    for (const f of files.slice(0, 40)) {
      const c = chapterOfFile(f.file)!;
      const either = (await interlinearState(f.book, c)) === "shown" || (await hebrewState(f.book, c)) === "shown";
      expect(either, `${f.book} ${f.file}`).toBe(true);
    }
  }, 120_000);
});

describe("cross-references", () => {
  it("are a file for a chapter, and the page is told only which verses have them", async () => {
    const refs = await chapterCrossRefFile("john", 1);
    expect(refs).not.toBeNull();
    const verses = await crossRefVerses("john", 1);
    expect(verses).toEqual(Object.keys(refs!).map(Number));
    expect(verses.length).toBeGreaterThan(10);
    expect(refs![verses[0]][0]).toMatchObject({ book: expect.any(String), chapter: expect.any(Number), text: expect.any(String) });
    // The mark costs the page a list of numbers, not the references.
    expect(bytes(verses)).toBeLessThan(bytes(refs) / 20);
  });

  it("are offered in the Old Testament from 1.9, in the Septuagint's numbering, and on no book OpenBible has nothing for", async () => {
    // Psalm 22 is the KJV's 23: "The Lord tends me as a shepherd" is echoed by John 10:11.
    const psalm = await chapterCrossRefFile("psalms", 22);
    expect(psalm?.[1].some((r) => r.book === "john" && r.chapter === 10 && r.verse === 11)).toBe(true);
    expect(await crossRefVerses("genesis", 1)).toContain(1);
    const files = await crossRefFiles();
    expect(files.some((f) => f.book === "genesis")).toBe(true);
    expect(files.some((f) => f.book === "psalms")).toBe(true);
    expect(files.some((f) => f.book === "tobit")).toBe(false);
  }, 120_000);
});

describe("the commentary", () => {
  it("is a file for a chapter the Fathers comment on, and none for a chapter they do not", async () => {
    const john = await chapterCommentaryFile("john", 1);
    expect(john).not.toBeNull();
    expect(Object.values(john!).flat()[0]).toMatchObject({ author: expect.any(String), text: expect.any(String) });
    const files = await commentaryFiles();
    expect(files).toContainEqual({ book: "john", file: "1.json" });
    // Every file has notes in it: an empty one would be fetched for nothing.
    for (const f of files.slice(0, 40)) {
      expect(await chapterCommentaryFile(f.book, chapterOfFile(f.file)!), `${f.book} ${f.file}`).not.toBeNull();
    }
  }, 120_000);
});

describe("a chapter file's name", () => {
  it("is a chapter number and .json, and nothing else", () => {
    expect(chapterOfFile("1.json")).toBe(1);
    expect(chapterOfFile("150.json")).toBe(150);
    for (const bad of ["0.json", "01.json", "1", "1.txt", "../1.json", "1.json.json", "a.json", ""]) {
      expect(chapterOfFile(bad), bad).toBeNull();
    }
  });
});

describe("the chapter page", () => {
  const page = fs.readFileSync(path.join(ROOT, "app/(app)/bible/[book]/[chapter]/page.tsx"), "utf8");

  it("hands the reader its verses and not the Greek, the lexicon or the references", () => {
    // Each of these was a prop until 1.5.1, written into every chapter's HTML
    // and again into the payload the app reads between pages: 96 MB of props
    // that became 462 MB of a 720 MB app. See lib/bible/chapterExtras.ts.
    for (const gone of ["tokensByNum", "englishTokensByNum", "originalByNum", "strongsMap", "loadOriginal", "loadEnglishTagged", "chapterCrossRefs("]) {
      expect(page, gone).not.toContain(gone);
    }
    // The Greek or, from 1.9, the Hebrew (lib/bible/hebrewText.ts): either is fetched as a file, never handed over.
    expect(page).toContain("hasInterlinear={showOriginals}");
    expect(page).toContain("crossRefVerses={refVerses}");
  });

  it("carries the commentary on the website only", () => {
    // In the apps it is a file. On the website it stays in the page, where a
    // search engine reads the Fathers beside the chapter.
    expect(page).toContain("commentary={IS_STATIC_EXPORT ? undefined : commentary}");
    expect(page).toContain('<LazyStudyRail key="rail" book={book} chapter={chapterNum} empty={!hasChapterCommentary} />');
  });

  it("is a tenth of what it was for the heaviest chapter", async () => {
    // What the apps' page hands over for John 1, against the 1,006 KB it handed over in 1.5.
    const verses = (await loadChapter("john", 1))!.verses;
    const commentaryVerses = Object.keys((await chapterCommentaryFile("john", 1))!).map(Number);
    const handed = bytes(verses) + bytes(commentaryVerses) + bytes(await crossRefVerses("john", 1));
    expect(handed).toBeLessThan(12_000);
  });
});
