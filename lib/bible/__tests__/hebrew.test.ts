// The Hebrew beside the Old Testament (1.9, the Discord's "Add Hebrew"; the
// arbiter: the Westminster Leningrad Codex, pointed, without cantillation, a
// study aid, the Church's Old Testament being the Septuagint; aligned by the
// app's own verse map, saying plainly where none stands). What a reader would
// notice if this broke: the Hebrew beside the wrong verse (the Septuagint's
// Psalm 22 beside the Hebrew's 22, and not its 23), a line saying the Hebrew
// lacks a verse it has, cantillation marks crowding the points, a written word
// run into the word read, or the Hebrew running left to right.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { textDir } from "@/lib/i18n/textDir";

import { HEBREW, placeBible } from "../../../scripts/bibles/compare-map.mjs";
import { chapterInterlinear, interlinearFileState } from "../chapterExtras";
import { chapterHebrew, hebrewState } from "../hebrewText";
import { packInterlinear, unpackInterlinear } from "../interlinearPack";
import { loadChapter } from "../load";

const DIR = path.join(process.cwd(), "data/bible/hebrew");
type BookFile = { bible: string; book: string; chapters: [number, string][][] };
const book = (slug: string) => JSON.parse(fs.readFileSync(path.join(DIR, `${slug}.json`), "utf8")) as BookFile;
const verse = (slug: string, c: number, v: number) => book(slug).chapters[c - 1].find(([n]) => n === v)?.[1];
const numbers = async (slug: string, c: number) => ((await loadChapter(slug, c))?.verses ?? []).map((v) => v.n);
const code = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("the Hebrew text", () => {
  it("is the codex's 39 books and 23,213 verses, pointed, with no cantillation", () => {
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
    expect(files).toHaveLength(39);
    let verses = 0;
    for (const f of files) {
      const b = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as BookFile;
      expect(b.bible).toBe("he-wlc");
      for (const c of b.chapters)
        for (const [, text] of c) {
          verses += 1;
          // The accents, the meteg, the paseq and the joiner are gone; a letter never is.
          expect(text).not.toMatch(/[֑-ֽ֯׀͏]/);
          expect(text).toMatch(/[א-ת]/);
        }
    }
    expect(verses).toBe(23213);
    expect(verse("genesis", 1, 1)).toBe("בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃");
  });

  it("sets a word written and not read in brackets before the word read", () => {
    expect(verse("genesis", 8, 17)).toContain("(הוצא) הַיְצֵא");
    expect(verse("genesis", 24, 33)?.startsWith("(ויישם) וַיּוּשַׂם")).toBe(true);
  });
});

describe("its verse map", () => {
  it("is what the script makes from the text and the Copenhagen mappings, credited under their licence", () => {
    for (const { id, target, sameEdition } of HEBREW as { id: string; target: string; sameEdition: boolean }[]) {
      const file = JSON.parse(code(`data/bibles/maps/${id}.json`)) as { bible: string; license: string; credit: string; books: unknown };
      expect(file.books, id).toEqual((placeBible(id, target, sameEdition) as { books: unknown }).books);
      expect(file.bible).toBe(id);
      expect(file.license).toBe("CC BY-SA 4.0");
      expect(file.credit).toContain("Copenhagen Alliance");
    }
  });

  it("points only at verses the Hebrew has", () => {
    const map = JSON.parse(code("data/bibles/maps/he-wlc.json")) as { books: Record<string, Record<string, number[][]>> };
    for (const [slug, chapters] of Object.entries(map.books)) {
      const has = new Set(book(slug).chapters.flatMap((c, i) => c.map(([v]) => `${i + 1}:${v}`)));
      for (const runs of Object.values(chapters))
        for (const r of runs) {
          const last = r.length === 5 ? r[4] : r[3] + (r[1] - r[0]);
          for (let v = r[3]; v <= last; v++) expect(has.has(`${r[2]}:${v}`), `${slug} ${r[2]}:${v}`).toBe(true);
        }
    }
  });
});

describe("beside a chapter", () => {
  it("stands beside Genesis 1 verse for verse", async () => {
    const h = await chapterHebrew("genesis", 1, await numbers("genesis", 1));
    expect(h?.verses[1]).toEqual(["1:1", verse("genesis", 1, 1)]);
    expect(Object.keys(h!.verses)).toHaveLength(31);
    expect(h?.apart).toEqual([]);
  });

  it("is the Hebrew's own place where it numbers otherwise: its Psalm 23 beside the Septuagint's 22, its Joel 3 beside Joel 2:28", async () => {
    const ps = await chapterHebrew("psalms", 22, await numbers("psalms", 22));
    expect(ps?.verses[1]?.[0]).toBe("23:1");
    expect(ps?.verses[1]?.[1]).toContain("יְהוָה רֹעִי");
    const joel = await chapterHebrew("joel", 2, await numbers("joel", 2));
    expect(joel?.verses[28]?.[0]).toBe("3:1");
    expect(joel?.verses[28]?.[1]).toContain("אֶשְׁפּוֹךְ אֶת־רוּחִי");
  });

  it("says plainly where it stands beside nothing, and claims the Hebrew lacks only what it surely lacks", async () => {
    expect(await hebrewState("genesis", 1)).toBe("shown");
    expect(await hebrewState("tobit", 1)).toBe("book");
    expect(await hebrewState("wisdom", 1)).toBe("book");
    expect(await hebrewState("psalms", 151)).toBe("chapter");
    expect(await hebrewState("daniel", 13)).toBe("chapter");
    expect(await hebrewState("daniel", 14)).toBe("chapter");
    // The Hebrew has these chapters; the two texts do not answer verse for verse there.
    expect(await hebrewState("exodus", 38)).toBe("apart");
    expect(await hebrewState("jeremiah", 25)).toBe("apart");
    expect(await hebrewState("matthew", 1)).toBe("none");
    // The Song of the Three, Daniel 3:24-90 in the Septuagint: one run beside which none stands, said once.
    const dan = await chapterHebrew("daniel", 3, await numbers("daniel", 3));
    expect(dan?.apart.some(([from, to]) => from <= 24 && to >= 90)).toBe(true);
    expect(dan?.verses[1]?.[0]).toBe("3:1");
    // Only the whole books and these three chapters are said to be missing from the Hebrew.
    expect(code("lib/bible/hebrewText.ts")).toMatch(/const NOT_IN_HEBREW[^=]*= \{\s*psalms: \[151\],\s*daniel: \[13, 14\],\s*\};/);
  });

  it("travels in the chapter's interlinear file, with the Greek or alone, packed and unpacked whole", async () => {
    const gen = await chapterInterlinear("genesis", 1);
    expect(gen?.hebrew?.[1]?.[0]).toBe("1:1");
    expect(Object.keys(gen?.text ?? {}).length).toBeGreaterThan(0);
    const round = unpackInterlinear(JSON.parse(JSON.stringify(packInterlinear(gen!))));
    expect(round.hebrew).toEqual(gen!.hebrew);
    const dan = await chapterInterlinear("daniel", 3);
    expect(unpackInterlinear(JSON.parse(JSON.stringify(packInterlinear(dan!)))).hebrewApart).toEqual(dan!.hebrewApart);
    // Ezra has no Greek beside it (Swete's Septuagint does not reach it here): its Hebrew still stands.
    expect(await interlinearFileState("ezra", 1)).toBe(true);
    const ezra = await chapterInterlinear("ezra", 1);
    expect(Object.keys(ezra?.text ?? {})).toHaveLength(0);
    expect(Object.keys(ezra?.hebrew ?? {}).length).toBeGreaterThan(0);
  });
});

describe("on the page", () => {
  it("reads right to left as Hebrew, its place in the Hebrew left to right, in the interlinear's face", () => {
    expect(textDir("hbo")).toBe("rtl");
    const row = code("components/bible/VerseRow.tsx");
    expect(row).toMatch(/<p\s+lang="hbo"\s+dir="rtl"/);
    expect(row).toContain('<sup lang="en" dir="ltr"');
    expect(row).toContain("<HebrewWords text={hebrew[1]} />");
    // Cardo carries Hebrew too, as its own comment always said it would.
    expect(code("app/layout.tsx")).toContain('subsets: ["latin", "greek", "greek-ext", "hebrew"]');
  });

  it("is said in all 21 languages, a range naming both ends, and never a dash for one", () => {
    const keys = ["head", "written", "noneHere", "noneRange", "notInBook", "notInChapter", "apart"].map((k) => `bible.hebrew.${k}`);
    const dir = path.join(process.cwd(), "lib/i18n/messages");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(files).toHaveLength(21);
    for (const f of files) {
      const m = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Record<string, string>;
      for (const k of keys) {
        expect(m[k], `${f} ${k}`).toBeTruthy();
        expect(m[k], `${f} ${k}`).not.toContain("—");
      }
      expect(m["bible.hebrew.noneRange"], f).toContain("{from}");
      expect(m["bible.hebrew.noneRange"], f).toContain("{to}");
    }
  });
});
