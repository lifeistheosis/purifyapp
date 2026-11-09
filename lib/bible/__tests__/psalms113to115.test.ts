// Psalms 113 to 115 as the Septuagint divides them (1.9, c-psalter-113; his yes
// of 2026-11-09 to the sheet's 6). Until then the English had them as the
// Hebrew does (8, 18 and 19 verses), beside a Greek with 26, 9 and 10, so on
// these pages the English and the Greek were different verses.
// scripts/bibles/psalms-113-115.mjs moved them; this holds them there.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { moved, movedRef } from "../../../scripts/bibles/psalms-113-115.mjs";

type Verse = { n: number; text: string };
/** The English (dir "") or the Greek ("original"). */
const chapter = (dir: string, n: number): Verse[] =>
  JSON.parse(fs.readFileSync(path.join("data/bible", dir, "psalms", `${n}.json`), "utf8")).verses;
const keyed = (dir: string, n: number): Record<string, unknown> =>
  JSON.parse(fs.readFileSync(path.join("data/bible", dir, "psalms", `${n}.json`), "utf8"));

describe("Psalms 113 to 115, divided as the Septuagint divides them", () => {
  it("have the Septuagint's verses, as many as the Greek beside them", () => {
    for (const [n, count] of [
      [113, 26],
      [114, 9],
      [115, 10],
    ]) {
      expect(chapter("", n).map((v) => v.n)).toEqual(Array.from({ length: count }, (_, i) => i + 1));
      expect(chapter("original", n).length).toBe(count);
    }
  });

  it("put each English verse beside its own Greek", () => {
    const pairs: [number, number, string, string][] = [
      [113, 1, "At the going forth of Israel", "Ἰσραὴλ ἐξ Αἰγύπτου"],
      [113, 9, "Not to us, O Lord", "μὴ ἡμῖν, Κύριε"],
      [114, 1, "I am well pleased, because the Lord will hearken", "ΗΓΑΠΗΣΑ"],
      [115, 1, "I believed, wherefore I have spoken", "ΕΠΙΣΤΕΥΣΑ"],
      [115, 10, "in the courts of the Lord's house", "ἐν αὐλαῖς οἴκου Κυρίου"],
    ];
    for (const [n, v, english, greek] of pairs) {
      expect(chapter("", n)[v - 1].text).toContain(english);
      expect(chapter("original", n)[v - 1].text).toContain(greek);
    }
  });

  it("keep the commentary and the cross-references on verses that exist", () => {
    for (const [n, count] of [
      [113, 26],
      [114, 9],
      [115, 10],
    ]) {
      for (const dir of ["commentary", "cross-refs"]) {
        for (const k of Object.keys(keyed(dir, n))) expect(Number(k), `${dir} ${n}:${k}`).toBeLessThanOrEqual(count);
      }
    }
    // Augustine on "Not unto us" now stands on the verse that says it.
    expect(JSON.stringify(keyed("commentary", 113)["9"])).toContain("Not unto us");
  });

  it("point every cross-reference in the Bible at a verse these psalms have", () => {
    const last: Record<string, number> = { "113": 26, "114": 9, "115": 10 };
    const root = "data/bible/cross-refs";
    for (const book of fs.readdirSync(root)) {
      const dir = path.join(root, book);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const file of fs.readdirSync(dir)) {
        const raw = fs.readFileSync(path.join(dir, file), "utf8");
        for (const m of raw.matchAll(/"Psalms (11[345]):(\d+)(?:-(\d+))?"/g)) {
          expect(Math.max(Number(m[2]), Number(m[3] ?? 0)), `${book}/${file}: ${m[0]}`).toBeLessThanOrEqual(last[m[1]]);
        }
      }
    }
  });

  it("move a verse, and a reference across the new line, as the script does", () => {
    expect(moved(113, 8)).toEqual({ chapter: 113, verse: 8 });
    expect(moved(114, 1)).toEqual({ chapter: 113, verse: 9 });
    expect(moved(115, 9)).toEqual({ chapter: 114, verse: 9 });
    expect(moved(115, 10)).toEqual({ chapter: 115, verse: 1 });
    expect(movedRef("Psalms 114:4-8")).toEqual(["Psalms 113:12-16"]);
    expect(movedRef("Psalms 115:9-11")).toEqual(["Psalms 114:9", "Psalms 115:1-2"]);
    expect(movedRef("Psalms 115:1-19")).toEqual(["Psalms 114:1-9", "Psalms 115:1-10"]);
    expect(movedRef("Psalms 116:1")).toEqual(["Psalms 116:1"]);
  });

  it("keep the plan's question on the verse it quotes", () => {
    const cites = fs.readFileSync("data/plans/guide/cites.json", "utf8");
    expect(cites).toContain('"book":"psalms","chapter":115,"from":3');
    expect(chapter("", 115)[2].text).toContain("What shall I render to the Lord");
  });
});
