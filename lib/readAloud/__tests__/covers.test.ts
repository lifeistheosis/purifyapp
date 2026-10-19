// The read-aloud covers (1.7): an icon of each book's saint or prophet, on
// every one of the 78 books (the owner's note 9 of 2026-10-16 and his answer,
// the Old Testament too).
//
// What this holds, because nothing else does:
//  - every book has a cover, and every cover has a book;
//  - every picture is public domain, says where that was read, was looked at
//    (the date it was opened), and is marked for the future clergy review;
//  - every file is on the website, a real square JPEG at 1024px, small, and
//    named with its version, and nothing sits in the folder unused;
//  - the rule of who is shown: the figure is named in the book's own name
//    (Ruth, Job, 1 Samuel) or in its "by" line in Before you read
//    (data/bible/intros/facts.json), or the book has the manuscript plate.
//    So the cover never says something the book's page does not.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import books from "@/data/bible/books.json";
import facts from "@/data/bible/intros/facts.json";
import { LOCALES } from "@/lib/i18n/locales";
import { BOOK_COVERS, COVER_PLATE, COVER_SIZE, FIGURES, readAloudCover, type FigureId } from "@/lib/readAloud/covers";

const ROOT = process.cwd();
const BOOKS = books as { slug: string; name: string }[];
const BY = facts.books as Record<string, { by: string }>;
const catalog = (code: string) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages", `${code}.json`), "utf8")) as Record<string, string>;

/** The words a book's name or its by-line uses for each figure. */
const NAMED_AS: Record<FigureId, string[]> = {
  moses: ["Moses"],
  joshua: ["Joshua"],
  samuel: ["Samuel"],
  ruth: ["Ruth"],
  jeremiah: ["Jeremiah"],
  ezra: ["Ezra", "Esdras"],
  nehemiah: ["Nehemiah"],
  tobit: ["Tobit"],
  judith: ["Judith"],
  esther: ["Esther"],
  maccabees: ["Maccabees"],
  job: ["Job"],
  david: ["David"],
  solomon: ["Solomon"],
  sirach: ["Sirach"],
  hosea: ["Hosea"],
  amos: ["Amos"],
  micah: ["Micah"],
  joel: ["Joel"],
  obadiah: ["Obadiah"],
  jonah: ["Jonah"],
  nahum: ["Nahum"],
  habakkuk: ["Habakkuk"],
  zephaniah: ["Zephaniah"],
  haggai: ["Haggai"],
  zechariah: ["Zechariah"],
  malachi: ["Malachi"],
  isaiah: ["Isaiah"],
  ezekiel: ["Ezekiel"],
  daniel: ["Daniel"],
  baruch: ["Baruch"],
  matthew: ["Matthew"],
  mark: ["Mark"],
  luke: ["Luke"],
  john: ["John"],
  johnPatmos: ["Patmos"],
  paul: ["Paul"],
  james: ["James"],
  peter: ["Peter"],
  jude: ["Jude"],
};

/** A JPEG's pixel size, read from its frame header. */
function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    // SOF0 to SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

const figures = Object.entries(FIGURES) as [FigureId, NonNullable<(typeof FIGURES)[FigureId]>][];

describe("every book's cover", () => {
  it("is set for all 78 books, and for nothing else", () => {
    expect(BOOKS.length).toBe(78);
    expect(Object.keys(BOOK_COVERS).sort()).toEqual(BOOKS.map((b) => b.slug).sort());
  });

  it("is a figure with a picture, or the manuscript plate", () => {
    for (const [book, cover] of Object.entries(BOOK_COVERS)) {
      expect(cover === "plate" || Boolean(FIGURES[cover]), `${book}: ${cover}`).toBe(true);
    }
  });

  it("shows someone the book's own name or its by-line names", () => {
    for (const b of BOOKS) {
      const cover = BOOK_COVERS[b.slug];
      if (cover === "plate") continue;
      const by = BY[b.slug]?.by ?? "";
      const said = NAMED_AS[cover].some((w) => b.name.includes(w) || by.includes(w));
      expect(said, `${b.slug} shows ${cover}, but neither "${b.name}" nor "${by}" names them`).toBe(true);
    }
  });

  it("gives the player the picture, the plate behind it, and the figure's name", () => {
    const john = readAloudCover("john");
    expect(john.src).toBe(FIGURES.john!.file);
    expect(john.fallback).toBe(COVER_PLATE);
    expect(john.nameKey).toBe("readAloud.cover.john");
    expect(john.size).toBe(COVER_SIZE);
    for (const b of BOOKS) {
      const c = readAloudCover(b.slug);
      if (BOOK_COVERS[b.slug] === "plate") {
        expect(c.src, b.slug).toBe(COVER_PLATE);
        expect(c.nameKey, b.slug).toBeNull();
      } else {
        expect(c.src.startsWith("/covers/"), b.slug).toBe(true);
      }
    }
    // A book the map does not know gets the plate, never a broken picture.
    expect(readAloudCover("no-such-book").src).toBe(COVER_PLATE);
  });

  it("has a plate that ships inside the apps", () => {
    expect(fs.existsSync(path.join(ROOT, "public", COVER_PLATE))).toBe(true);
    expect(COVER_PLATE.startsWith("/covers/")).toBe(false);
  });
});

describe("every cover picture", () => {
  it("serves at least one book, and every file in the folder is one", () => {
    const used = new Set(Object.values(BOOK_COVERS));
    for (const [id] of figures) expect(used.has(id), `${id} is on no book`).toBe(true);
    // The folder's own files. Its two folders are held to registries of their
    // own: saints/, the saints' hero pictures (lib/saints/__tests__/heroes.test.ts),
    // and authors/, the reading room's cover icons (lib/reading/__tests__/coverArt.test.ts).
    const dir = path.join(ROOT, "public", "covers");
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    expect(entries.filter((e) => e.isDirectory()).map((e) => e.name).sort()).toEqual(["authors", "saints"]);
    // Each picture also has its AVIF beside it (1.7.2, scripts/covers-avif.mjs), and nothing else is there.
    const onDisk = entries.filter((e) => e.isFile()).map((e) => `/covers/${e.name}`);
    const files = figures.map(([, f]) => f.file);
    expect(onDisk.filter((f) => !f.endsWith(".avif")).sort()).toEqual([...files].sort());
    expect(onDisk.filter((f) => f.endsWith(".avif")).sort()).toEqual(files.map((f) => f.replace(/\.jpg$/, ".avif")).sort());
  });

  for (const [id, f] of figures) {
    describe(id, () => {
      it("is public domain, read on its Commons page, opened, and marked for the clergy review", () => {
        expect(f.license, `${id}.license`).toMatch(/^(public domain|pd-art|cc0)$/i);
        expect(f.source.startsWith("File:"), `${id}.source`).toBe(true);
        expect(f.evidenceUrl.startsWith("https://commons.wikimedia.org/wiki/File:"), `${id}.evidenceUrl`).toBe(true);
        for (const field of ["work", "artist", "workDate"] as const) expect(f[field].trim(), `${id}.${field}`).not.toBe("");
        expect(f.inspectedOn, `${id}.inspectedOn`).toMatch(/^2\d{3}-\d{2}-\d{2}$/);
        expect(f.review).toBe("clergy");
      });

      it("describes what the picture shows", () => {
        expect(f.alt.length, `${id}.alt`).toBeGreaterThan(30);
        expect(f.alt, `${id}.alt`).not.toMatch(/^icon of st\.? \w+\.?$/i);
      });

      it("is a square JPEG of 1024px, small, named with its version", () => {
        expect(f.file).toMatch(new RegExp(`^/covers/${id}\\.v\\d+\\.jpg$`));
        const buf = fs.readFileSync(path.join(ROOT, "public", f.file));
        expect(jpegSize(buf), `${f.file} size`).toEqual({ width: 1024, height: 1024 });
        expect(buf.length / 1024, `${f.file} KB`).toBeLessThan(200);
      });

      it("has its name in all twenty-one languages", () => {
        expect(f.nameKey).toBe(`readAloud.cover.${id}`);
        for (const l of LOCALES) {
          const v = catalog(l.code)[f.nameKey];
          expect(v?.trim(), `${l.code} ${f.nameKey}`).toBeTruthy();
          // No em dash in a name (the standing rule), written as its code.
          expect(v?.includes(String.fromCharCode(0x2014)), `${l.code} ${f.nameKey}`).toBe(false);
        }
      });
    });
  }
});
