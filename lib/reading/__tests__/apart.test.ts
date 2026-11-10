// No two books wearing the same picture side by side (1.9, build 90; the
// owner's yes of 2026-11-10 through the arbiter: "in every row, two books
// wearing the same picture never stand side by side (St Pachomius's own Life,
// Isidora's Life and now The Institutes all wear his icon). Make it general,
// not just those two, and hold it with a test."). The find was the desert and
// Egypt rows, where the two Lives stood together in his one icon. Measured
// across the room that day, 469 neighbours in each build wore one picture,
// nearly all two books of one Father in his own icon (St John Chrysostom's
// homilies, St Ignatius's letters).
//
// What this holds, in both builds (the website's and the apps', whose
// addresses for one picture differ):
//
//  - apart() (lib/reading/select.ts): it moves a book only where it must, and
//    in a list shown whole it leaves no more twins than any order would, proved
//    against every order of small lists.
//  - A row drawn from more than it shows (the traditions, short reads, More
//    like this on every book) never has two of one picture side by side.
//  - A list shown whole (New to Orthodoxy, the seasons, the search on every
//    filter and on every author's name, a collection's sources) has them only
//    where no order could part them, and then no more than must be.
//  - The passions, the virtues and daily life keep the themes' own order, so
//    two of one picture there are one book read part by part.
//  - Continue, built on the reader's own device, is drawn through apart().

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ERA_IDS, LENGTH_IDS, THEMES, THEME_IDS, TRADITION_IDS, themesIn, type SeasonId } from "@/lib/reading/catalog";
import { buildRoom } from "@/lib/reading/cards";
import { collectionPage } from "@/lib/reading/collectionView";
import { COLLECTION_SLUGS } from "@/lib/reading/feelings";
import {
  apart,
  beginRow,
  moreLikeThis,
  pictureOf,
  searchCards,
  seasonRow,
  shortRow,
  themeRow,
  traditionRows,
  type Card,
  type Room,
  type SearchLabels,
} from "@/lib/reading/select";

const ROOT = join(__dirname, "..", "..", "..");
const labels: SearchLabels = {
  theme: (id) => THEMES.find((t) => t.id === id)!.label,
  tradition: (id) => id,
  era: (id) => id,
};

/** The places where a picture stands beside itself, by name. */
function twins<T>(row: readonly T[], pic: (t: T) => string, name: (t: T) => string): string[] {
  const out: string[] = [];
  for (let i = 1; i < row.length; i++) if (pic(row[i]) === pic(row[i - 1])) out.push(`${name(row[i - 1])} | ${name(row[i])}`);
  return out;
}

/** The fewest twins any order of these pictures leaves: the others can part the most common one only so often. */
function fewest(pics: readonly string[]): number {
  const count = new Map<string, number>();
  for (const p of pics) count.set(p, (count.get(p) ?? 0) + 1);
  const most = Math.max(0, ...count.values());
  return Math.max(0, 2 * most - pics.length - 1);
}

function orders<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => orders([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));
}

const id = (s: string) => s;

describe("apart", () => {
  it("leaves a row that has no twins as it is, and moves a twin no further than the next picture", () => {
    expect(apart(["a", "b", "a", "c"], id)).toEqual(["a", "b", "a", "c"]);
    expect(apart(["a", "a", "b", "c"], id)).toEqual(["a", "b", "a", "c"]);
    expect(apart(["a", "a", "b", "c"], id, 16)).toEqual(["a", "b", "a", "c"]);
  });

  it("ends a row drawn from more than it shows where nothing left could stand, and keeps its first first", () => {
    expect(apart(["a", "b", "b", "b", "c"], id, 16)).toEqual(["a", "b", "c", "b"]);
    expect(apart(["a", "a", "a"], id, 16)).toEqual(["a"]);
    expect(apart(["a", "b", "c", "d"], id, 2)).toEqual(["a", "b"]);
  });

  it("shows a whole list whole, with no more twins than any order of it would leave", () => {
    // Every order of every list of up to six books over three pictures.
    const lists = new Set<string>();
    for (let n = 1; n <= 6; n++) {
      for (let code = 0; code < 3 ** n; code++) {
        let c = code;
        const list: string[] = [];
        for (let i = 0; i < n; i++) {
          list.push("abc"[c % 3]);
          c = Math.floor(c / 3);
        }
        lists.add(list.join(""));
      }
    }
    for (const list of lists) {
      const pics = [...list];
      const best = Math.min(...orders(pics).map((o) => twins(o, id, id).length));
      expect(best, list).toBe(fewest(pics));
      const out = apart(pics, id);
      expect([...out].sort().join(""), list).toBe([...pics].sort().join(""));
      expect(twins(out, id, id).length, list).toBe(best);
    }
  });

  it("knows one picture by its file, wherever it is asked from and whichever its cut", () => {
    const at = (src: string, crop?: { x: number; y: number; zoom: number }): Pick<Card, "key" | "cover"> => ({
      key: src,
      cover: { src, focusY: 30, ...(crop ? { crop } : {}) },
    });
    expect(pictureOf(at("/saints/icons/pachomius-the-great.jpg"))).toBe(pictureOf(at("https://purifyapp.net/saints/icons/pachomius-the-great.v2.jpg")));
    expect(pictureOf(at("/covers/authors/john-chrysostom.v1.jpg"))).not.toBe(pictureOf(at("/covers/authors/john-of-damascus.v1.jpg")));
    // A council's documents are each their own window of its icon.
    expect(pictureOf(at("/covers/councils/ephesus.v1.jpg", { x: 0.2, y: 0.3, zoom: 2 }))).not.toBe(pictureOf(at("/covers/councils/ephesus.v1.jpg", { x: 0.7, y: 0.3, zoom: 2 })));
    // A book with no picture wears its own plate.
    expect(pictureOf({ key: "a/b" })).not.toBe(pictureOf({ key: "a/c" }));
  });
});

for (const native of [false, true]) {
  const build = native ? "the apps" : "the website";
  const room: Room = buildRoom(native);
  const byKey = new Map(room.cards.map((c) => [c.key, c]));
  const name = (c: Card) => c.key;

  describe(`every row, in ${build}`, () => {
    it("parts two books of one picture on the desert and Egypt rows, and keeps both", () => {
      for (const id of ["desert", "egypt"] as const) {
        const row = traditionRows(room).find((r) => r.id === id)!.cards;
        const keys = row.map((c) => c.key);
        const life = keys.indexOf("pachomius-the-great/life-of-pachomius");
        const isidora = keys.indexOf("isidora-of-tabenna/life-of-isidora");
        // December's saints (1.9) brought whole Lives of Egypt that rank above
        // St. Isidora's excerpts, and the Egypt row shows sixteen of its books:
        // hers is not reached there, so the parting is not in question on it.
        if (id === "egypt" && isidora < 0) {
          expect(row.length, id).toBe(16);
          expect(life, id).toBeGreaterThanOrEqual(0);
          continue;
        }
        expect(life, id).toBeGreaterThanOrEqual(0);
        expect(isidora, id).toBeGreaterThanOrEqual(0);
        expect(Math.abs(life - isidora), id).toBeGreaterThan(1);
      }
    });

    it("never stands two of one picture side by side on a row drawn from more than it shows", () => {
      const found: string[] = [];
      for (const r of traditionRows(room)) found.push(...twins(r.cards, pictureOf, name).map((t) => `${r.id}: ${t}`));
      found.push(...twins(shortRow(room), pictureOf, name).map((t) => `short: ${t}`));
      for (const c of room.cards) {
        // Because you read it (ten) on the room, More like this (eight) at a book's foot.
        for (const n of [10, 8]) found.push(...twins(moreLikeThis(room, c.key, n), pictureOf, name).map((t) => `like ${c.key}: ${t}`));
      }
      expect(found).toEqual([]);
    });

    it("stands them together on a list shown whole only where no order could part them, and no more than must be", () => {
      const lists: [string, Card[]][] = [["New to Orthodoxy", beginRow(room)]];
      for (const season of themesIn("seasons") as SeasonId[]) {
        lists.push([`season ${season}`, seasonRow(room, season).map((p) => byKey.get(p.key)!)]);
      }
      lists.push(["search", searchCards(room, "", {}, labels)]);
      for (const theme of THEME_IDS) lists.push([`search ${theme}`, searchCards(room, "", { theme }, labels)]);
      for (const tradition of TRADITION_IDS) lists.push([`search ${tradition}`, searchCards(room, "", { tradition }, labels)]);
      for (const era of ERA_IDS) lists.push([`search ${era}`, searchCards(room, "", { era }, labels)]);
      for (const length of LENGTH_IDS) lists.push([`search ${length}`, searchCards(room, "", { length }, labels)]);
      for (const a of Object.values(room.authors)) lists.push([`search "${a.name}"`, searchCards(room, a.name, {}, labels)]);
      const found: string[] = [];
      for (const [what, list] of lists) {
        const t = twins(list, pictureOf, name);
        if (t.length !== fewest(list.map(pictureOf))) found.push(`${what}: ${t.length} twins, ${fewest(list.map(pictureOf))} at the fewest: ${t.join("; ")}`);
      }
      expect(found).toEqual([]);
      // The whole library, which had them by the dozen, parts them all. The
      // Antioch search cannot, St John Chrysostom's books being 19 of its 29,
      // nor a search for one Father's name, which is all his own icon.
      expect(twins(searchCards(room, "", {}, labels), pictureOf, name)).toEqual([]);
    });

    it("parts them in a collection's sources", () => {
      const found: string[] = [];
      for (const slug of COLLECTION_SLUGS) {
        const sources = collectionPage(slug, native).sources;
        const t = twins(sources, pictureOf, (c) => c.key);
        if (t.length !== fewest(sources.map(pictureOf))) found.push(`${slug}: ${t.join("; ")}`);
      }
      expect(found).toEqual([]);
    });

    it("keeps the themes' own order on the passions, the virtues and daily life, where two of one picture are one book", () => {
      for (const group of ["passions", "virtues", "life"] as const) {
        const row = themeRow(room, group);
        expect(row.map((p) => p.theme)).toEqual(themesIn(group));
        for (let i = 1; i < row.length; i++) {
          const [a, b] = [byKey.get(row[i - 1].key)!, byKey.get(row[i].key)!];
          if (pictureOf(a) === pictureOf(b)) expect(b.key, `${group}: ${row[i - 1].theme} | ${row[i].theme}`).toBe(a.key);
        }
      }
    });
  });
}

describe("Continue", () => {
  it("is drawn through apart, so the reader's own books part as every row's do", () => {
    const room = readFileSync(join(ROOT, "components/reading/ReadingRoom.tsx"), "utf8");
    expect(room).toMatch(/return apart\(out, \(o\) => pictureOf\(o\.card\)\);/);
  });
});
