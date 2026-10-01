import fs from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { GET } from "@/app/api/bible/word/route";
import { BOOKS } from "@/lib/bible/books";
import { englishChapter, greekAlignment, pairsOneToOne, testamentOf, wordIndex } from "@/lib/bible/greekText";
import { interlinearAvailable } from "@/lib/bible/interlinearBooks";

// The Greek word study and the Septuagint beside the Old Testament
// (2026-09-30). The rule under test is the interlinear's own: Greek is never
// set beside, or linked to, a verse that is not its own.

type Item = {
  ref: string;
  book: string;
  chapter: number;
  verse: number;
  greek: string;
  forms: string[];
  english: string | null;
  href: string;
};
type Answer = {
  strongs: string;
  lemma: string | null;
  counts: { nt: number; ot: number };
  testament: string;
  offset: number;
  next: number | null;
  items: Item[];
};

async function ask(query: string): Promise<{ status: number; body: Answer }> {
  const res = await GET(new Request(`https://purifyapp.net/api/bible/word?${query}`));
  return { status: res.status, body: (await res.json()) as Answer };
}

/** Where in θεός's Old Testament verses a given verse falls. */
async function theosAt(predicate: (ref: string) => Promise<boolean>): Promise<number> {
  const index = await wordIndex();
  const ot = index.get("2316")!.verses.filter((r) => testamentOf(r.split(".")[0]) === "ot");
  for (let i = 0; i < ot.length; i += 1) if (await predicate(ot[i])) return i;
  return -1;
}

const ORIGINAL = path.join(process.cwd(), "data", "bible", "original");

// The word index reads every Greek chapter once, about 1,300 files. Build it
// before the tests that ask it, with room for a loaded machine: the per-test
// 30 seconds in vitest.config.ts is for a check, not for this one-time read.
beforeAll(async () => {
  await wordIndex();
}, 300_000);

describe("the Old Testament interlinear gate", () => {
  it("offers the Greek for exactly the Old Testament books that have it", () => {
    for (const b of BOOKS.filter((x) => x.testament !== "NT")) {
      const hasGreek = fs.existsSync(path.join(ORIGINAL, b.slug, "1.json"));
      expect(interlinearAvailable(b.slug, b.testament), b.slug).toBe(hasGreek);
    }
    expect(interlinearAvailable("genesis", "OT")).toBe(true);
    expect(interlinearAvailable("esther", "OT")).toBe(false);
  });

  it("leaves the New Testament rule as it was", () => {
    expect(interlinearAvailable("john", "NT")).toBe(true);
    expect(interlinearAvailable("philemon", "NT")).toBe(false);
  });
});

describe("pairsOneToOne", () => {
  const greek = [40, 120, 60, 200, 80, 150, 50, 90];

  it("keeps two runs of lengths that rise and fall together", () => {
    expect(pairsOneToOne(greek, greek.map((n) => Math.round(n * 1.4)))).toBe(true);
  });

  it("refuses the same text a verse out of step: two verses joined, one split", () => {
    const english = [40 + 120, 60, 200, 80, 150, 50, 45, 45].map((n) => Math.round(n * 1.4));
    expect(pairsOneToOne(greek, english)).toBe(false);
  });
});

describe("greekAlignment", () => {
  it("pairs the New Testament as it stands", async () => {
    expect(await greekAlignment("john", 1)).toBe(0);
  });

  it("pairs Old Testament chapters that line up verse for verse", async () => {
    expect(await greekAlignment("genesis", 1)).toBe(0);
    expect(await greekAlignment("isaiah", 53)).toBe(0);
    // Exodus 7 and 8 are divided apart; by chapter 9 the two agree again.
    expect(await greekAlignment("exodus", 9)).toBe(0);
  });

  it("steps past a psalm's title where Swete numbers it as verses", async () => {
    // Psalm 50: the title is Greek 1 and 2; "Have mercy on me, O God" is 3.
    expect(await greekAlignment("psalms", 50)).toBe(2);
  });

  it("refuses a chapter whose numbers agree while its verses stand apart", async () => {
    // Brenton's Exodus 25 has verse 6 of the Hebrew, which the Greek lacks.
    expect(await greekAlignment("exodus", 25)).toBeNull();
    // Swete gives Psalm 12's title a verse; the English splits its last line.
    expect(await greekAlignment("psalms", 12)).toBeNull();
    expect(await greekAlignment("song-of-solomon", 6)).toBeNull();
    expect(await greekAlignment("1-samuel", 21)).toBeNull();
  });

  it("refuses a chapter divided apart", async () => {
    expect(await greekAlignment("exodus", 8)).toBeNull();
  });
});

describe("wordIndex", () => {
  it("knows each word in both testaments, each verse once, in canonical order", async () => {
    const index = await wordIndex();
    const theos = index.get("2316");
    expect(theos).toBeDefined();
    expect(theos!.ot).toBeGreaterThan(1000);
    expect(theos!.nt).toBeGreaterThan(1000);
    expect(theos!.verses[0]).toBe("genesis.1.1");
    expect(new Set(theos!.verses).size).toBe(theos!.verses.length);
    expect(theos!.verses.indexOf("genesis.1.1")).toBeLessThan(theos!.verses.indexOf("john.1.1"));
  });

  it("files each book under its own testament", () => {
    expect(testamentOf("john")).toBe("nt");
    expect(testamentOf("genesis")).toBe("ot");
  });
});

describe("GET /api/bible/word", () => {
  it("answers the New Testament with each verse's English and the word marked", async () => {
    const { status, body } = await ask("s=G3056&t=nt");
    expect(status).toBe(200);
    expect(body.strongs).toBe("3056");
    expect(body.lemma).toBe("λόγος");
    expect(body.items).toHaveLength(30);
    expect(body.next).toBe(30);
    for (const it of body.items) {
      expect(testamentOf(it.book)).toBe("nt");
      expect(it.english).not.toBeNull();
      expect(it.href).toBe(`/bible/${it.book}/${it.chapter}#v${it.verse}`);
      expect(it.forms.length).toBeGreaterThan(0);
      for (const form of it.forms) expect(it.greek).toContain(form);
    }
  });

  it("gives a psalm's verse its English number", async () => {
    const at = await theosAt(async (ref) => ref === "psalms.50.3");
    expect(at).toBeGreaterThanOrEqual(0);
    const first = (await ask(`s=2316&t=ot&offset=${at}`)).body.items[0];
    expect(first.ref).toBe("psalms.50.3");
    expect(first.verse).toBe(1);
    expect(first.english).toMatch(/^Have mercy upon me, O God/);
    expect(first.href).toBe("/bible/psalms/50#v1");
  });

  it("never pairs the Greek with an English verse that is not its own", async () => {
    const at = await theosAt(async (ref) => {
      const [book, chapter] = ref.split(".");
      return (await greekAlignment(book, Number(chapter))) === null;
    });
    expect(at).toBeGreaterThanOrEqual(0);

    const { body } = await ask(`s=2316&t=ot&offset=${at}`);
    expect(body.items[0].english).toBeNull();
    expect(body.items[0].href).toBe(`/bible/${body.items[0].book}/${body.items[0].chapter}`);
    for (const it of body.items) {
      const shift = await greekAlignment(it.book, it.chapter);
      const greekVerse = Number(it.ref.split(".")[2]);
      // Unpaired chapters, and a psalm's title, have no English verse of their own.
      if (shift === null || greekVerse <= shift) {
        expect(it.english, it.ref).toBeNull();
        continue;
      }
      const english = await englishChapter(it.book, it.chapter);
      expect(it.verse, it.ref).toBe(greekVerse - shift);
      expect(it.english, it.ref).toBe(english?.verses.find((v) => v.n === it.verse)?.text);
    }
  });

  it("refuses a request without a Strong's number", async () => {
    expect((await ask("s=logos")).status).toBe(400);
  });
});
