// The councils' documents as books in the reading room (1.8, the owner's
// build 80 note 12, "Read the Council's documents opens the reading room",
// and his pick of r3-03). What a reader would notice if this broke: a shelf
// with a missing book, a book whose length is wrong or that opens nowhere,
// a local council's book with someone else's picture on it, or the Tome of
// St. Leo shown as the council's own words.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { allShelves, councilBooks, documentMinutes, otherCouncilBooks, shelfCouncil, shelfFor, shelfSize } from "../books";
import { COUNCILS, getCouncil } from "../councils";
import { councilFocus } from "../page";

const council = (slug: string) => {
  const c = getCouncil(slug);
  if (!c) throw new Error(slug);
  return c;
};

describe("a council's shelf", () => {
  it("carries every document the council has, each opening where it is read", () => {
    for (const c of COUNCILS) {
      const books = councilBooks(c, false);
      expect(books.map((b) => b.href), c.slug).toEqual(c.documents.map((d) => d.href ?? `/councils/${c.slug}/${d.slug}`));
      for (const b of books) {
        expect(b.minutes, b.key).toBeGreaterThanOrEqual(1);
        expect(b.title.length, b.key).toBeGreaterThan(3);
      }
    }
  });

  it("counts a document's length as the room counts a work: its paragraphs at 180 words a minute", () => {
    const file = path.join(process.cwd(), "data", "councils", "first-nicaea", "the-twenty-canons.json");
    const json = JSON.parse(fs.readFileSync(file, "utf8")) as { sections: { paragraphs: string[] }[] };
    const words = json.sections.flatMap((s) => s.paragraphs).reduce((n, p) => n + (p.trim() ? p.trim().split(/\s+/).length : 0), 0);
    expect(documentMinutes("first-nicaea", "the-twenty-canons")).toBe(Math.max(1, Math.round(words / 180)));
    expect(shelfSize(councilBooks(council("first-nicaea"), false)).books).toBe(3);
  });

  it("makes each of the seven's books a window onto its council's icon, with the council and its year as the author line", () => {
    const nicaea = councilBooks(council("first-nicaea"), true);
    for (const b of nicaea) {
      expect(b.author).toBe("First Council of Nicaea, 325");
      expect(b.cover?.src).toMatch(/^https:\/\/.+\/history\/media\/first-council-of-nicaea\.v1\.jpg$/);
      expect(b.cover?.crop).toBeDefined();
    }
    // A local council has no picture: the room's plate, with the title alone.
    for (const b of councilBooks(council("carthage-419"), false)) {
      expect(b.cover).toBeUndefined();
      expect(b.author).toBe("Council of Carthage, 419");
    }
  });

  it("keeps a document read among a Father's works as the room's own book, with his cover and his name", () => {
    const tome = councilBooks(council("chalcedon"), false)[0];
    expect(tome.href).toBe("/saints/leo-the-great/the-tome-of-leo");
    expect(tome.author).toBe("St. Leo the Great");
    expect(tome.cover?.crop).toBeUndefined();
    const letters = councilBooks(council("carthage-256"), false).find((b) => b.href.startsWith("/saints/"));
    expect(letters?.href).toBe("/saints/cyprian-of-carthage/letters-on-the-baptism-of-heretics");
    expect(letters?.author).toBe("St. Cyprian of Carthage");
  });

  it("stands the other councils of the seven beside it, each by its own document, and has a shelf for every council", () => {
    const others = otherCouncilBooks("first-nicaea", false);
    expect(others).toHaveLength(6);
    expect(others.some((b) => b.href.startsWith("/councils/first-nicaea/"))).toBe(false);
    expect(others[0].href).toBe("/councils/first-constantinople/the-niceno-constantinopolitan-creed");
    // A local council's shelf has all seven beside it.
    expect(otherCouncilBooks("sardica", false)).toHaveLength(7);
    const shelves = allShelves(false, councilFocus);
    expect(shelves).toHaveLength(COUNCILS.length);
    expect(shelves.slice(0, 7).map((s) => s.council.ordinalKey)).toEqual([
      "study.councils.firstEcumenical",
      "study.councils.secondEcumenical",
      "study.councils.thirdEcumenical",
      "study.councils.fourthEcumenical",
      "study.councils.fifthEcumenical",
      "study.councils.sixthEcumenical",
      "study.councils.seventhEcumenical",
    ]);
    expect(shelfFor("first-nicaea")?.slug).toBe("first-nicaea");
    expect(shelfFor("no-such-council")).toBeUndefined();
  });

  it("hands the shelf no text: only what its head and its covers draw", () => {
    const head = shelfCouncil(council("first-nicaea"), false, councilFocus("first-nicaea"));
    expect(Object.keys(head).sort()).toEqual(["byname", "ordinalKey", "picture", "slug", "year"]);
    expect(head.picture?.credit).toMatch(/Michael Damaskinos/);
    for (const b of councilBooks(council("third-constantinople"), false)) {
      expect(JSON.stringify(b).length, b.key).toBeLessThan(600);
    }
  });
});
