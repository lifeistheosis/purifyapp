// St. Xenia of St. Petersburg's life, refined for 1.9 (the owner's word of
// 2026-11-13, about 01:20 UTC: "a full on refining on saint Xenia of
// Petersburg's profile", and at 01:25 "and addition extra on her life";
// docs/1.9-build/BRAINSTORM.md). His advert ends "Read her life in Purify",
// so her page carries, sourced, what the advert shows: her dead husband's army
// coat and his name, many thinking she had lost her mind, and her weeping
// "Blood, blood, blood" before Emperor Ivan VI was murdered in 1764.
//
// Her page is one of the older ones, with a life of ours marked for the clergy
// review like the rest (lib/saints/month.ts). What this adds to it: every
// paragraph names where its facts are read (lib/saints/lifeSources.ts), and
// the page lists those sources under the life; where the sources disagree the
// life says so instead of choosing (her birth and death, how long before the
// murder she wept, the year of the blini under the two calendars); and its one
// quotation stands in a public-domain text, her oldest printed Life
// (lib/saints/lifeQuotes.ts).
//
// What would go wrong if this broke: a reader sent by the advert finds a page
// that does not carry the moment it promised, or carries it with nothing to
// say where it comes from.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LIFE_QUOTES } from "../lifeQuotes";
import { LIFE_SOURCE_BOOKS, LIFE_SOURCES, lifeSourcesOf } from "../lifeSources";
import { SAINTS } from "../saints";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const xenia = SAINTS.find((s) => s.slug === "xenia-of-petersburg")!;
const life = xenia.life.join("\n");
const EM_DASH = String.fromCharCode(0x2014);

describe("St. Xenia's life", () => {
  it("carries the moments the advert shows", () => {
    expect(life).toMatch(/her husband's clothes, his army coat/);
    expect(life).toMatch(/answered only to his/);
    expect(life).toMatch(/thought she had lost her mind/);
    expect(life).toContain('"Blood, blood, blood!"');
    expect(life).toMatch(/Ivan VI/);
    expect(life).toMatch(/July 1764/);
    expect(life).toMatch(/the guards killed their prisoner there and then/);
  });

  it("tells the whole life: her husband, her folly, her prayer, her foresight, her repose and her glorification", () => {
    for (const told of [
      "Andrei Feodorovich Petrov",
      "died suddenly",
      "gave all that she had to the poor",
      "mocked and abused by many",
      "knelt there in prayer until dawn",
      "carried up onto the scaffolding",
      "bake blini",
      "the Empress Elizabeth died",
      "buried at the Smolensk cemetery",
      "chapel was built over the grave",
      "in 1902",
      "in 1978",
      "1988",
    ]) {
      expect(life, told).toContain(told);
    }
  });

  it("carries the extra her sources give: the cabmen and the traders, the red and the green, the notes at her chapel, her help after death", () => {
    for (const told of ["cab drivers", "traders", "a red jacket and a green skirt", "Okhta", "notes", "Cadet Corps"]) {
      expect(life, told).toContain(told);
    }
  });

  it("says where the sources disagree, and does not choose", () => {
    // Her birth and her death.
    expect(life).toContain("between 1719 and 1731");
    expect(life).toMatch(/about 1800, or about 1803, and one older account before 1777/);
    expect(life).toMatch(/about 1730 or about 1732/);
    // How long before the murder she wept.
    expect(life).toMatch(/three weeks/);
    expect(life).toMatch(/a few days/);
    // The year of the blini, under the old calendar and the new.
    expect(life).toContain("the twenty-fifth of December 1761");
    expect(life).toContain("the fifth of January 1762");
    expect(xenia.born).toBe("Between 1719 and 1732");
    expect(xenia.reposed).toBe("Year not recorded (St. Petersburg)");
    // How the first chapel was paid for.
    expect(life).toMatch(/from the offerings left there by one account and at the cost of a widow of rank by another/);
  });

  it("names a source for every paragraph, each one named in full", () => {
    const rows = LIFE_SOURCES["xenia-of-petersburg"];
    expect(rows, "a row of sources for each paragraph").toHaveLength(xenia.life.length);
    rows.forEach((row, i) => {
      expect(row.length, `paragraph ${i + 1} names no source`).toBeGreaterThan(0);
      for (const key of row) expect(LIFE_SOURCE_BOOKS[key], `paragraph ${i + 1}: ${key}`).toBeDefined();
    });
    for (const [key, book] of Object.entries(LIFE_SOURCE_BOOKS)) {
      expect(book.name.trim().length, key).toBeGreaterThan(10);
      expect(book.at, key).toMatch(/^https:\/\//);
      expect(book.name, key).not.toContain(EM_DASH);
    }
    // Every book is leaned on somewhere, and the line under the life names them in the order the life first does.
    const used = new Set(rows.flat());
    expect(Object.keys(LIFE_SOURCE_BOOKS).filter((k) => !used.has(k as keyof typeof LIFE_SOURCE_BOOKS))).toEqual([]);
    expect(lifeSourcesOf("xenia-of-petersburg")).toEqual([...new Set(rows.flat())].map((k) => LIFE_SOURCE_BOOKS[k].name));
    expect(lifeSourcesOf("john-cassian")).toEqual([]);
  });

  it("stands its one quotation in a public-domain text, her oldest printed Life", () => {
    const quotes = LIFE_QUOTES["xenia-of-petersburg"];
    expect(quotes).toHaveLength(1);
    const [q] = quotes;
    expect(q.words).toBe("Blood, blood, blood!");
    expect(q.cite.kind).toBe("text");
    if (q.cite.kind !== "text") return;
    expect(q.cite.author).toBe("D. G. Bulgakovsky");
    expect(q.cite.edition).toMatch(/1891/);
    expect(q.cite.edition).toMatch(/the English is ours/);
    expect(LIFE_SOURCE_BOOKS.bulgakovsky.publicDomain).toBe(true);
    // No other quotation: the rest of her words are told in ours.
    const quoted = [...life.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(quoted.filter((w) => w !== "Blood, blood, blood!" && w !== "the tsar on horseback")).toEqual([]);
  });

  it("is in the house's words: no em dash, and her own pronoun", () => {
    expect([xenia.shortBio, life, xenia.born, xenia.reposed].join("\n")).not.toContain(EM_DASH);
    expect(xenia.pronoun).toBe("her");
  });

  it("shows its sources under the life, on the page", () => {
    const page = fs.readFileSync(path.join(ROOT, "components/saints/SaintLife.tsx"), "utf8");
    expect(page).toContain("lifeSourcesOf(saint.slug)");
    expect(page).toContain('<T k="study.history.sources" />');
  });
});
