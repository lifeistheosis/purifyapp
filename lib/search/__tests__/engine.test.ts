// The one search (1.8, the owner's pick of r3-12, "C, with the mix of B"):
// what it finds, where it puts it, and the words it offers, against the real
// lists the apps ship (app/search-corpus.json and app/theology-search.json).
//
// What a reader would notice if this broke: Theology's pill and the bar's
// magnifier answering one word two ways again; a door that counts what it
// does not show; "chrystostom" finding nothing and offering nothing; a
// Greek name that cannot be lit; the Bible's "mt" no longer finding Matthew.

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { buildSearchCorpus } from "@/lib/search/buildCorpus";
import {
  behind,
  completions,
  doorCounts,
  doorsFound,
  editDistance,
  groupSections,
  hitParts,
  inDoor,
  kindCounts,
  kindIn,
  kindSections,
  mergeIndex,
  nearSpelling,
  pictureFor,
  prepare,
  rank,
  results,
  vocabulary,
  withDefinitions,
  type SearchRow,
  type TheologyEntry,
} from "@/lib/search/engine";
import { DOOR_KINDS, doorOf, type DoorId } from "@/lib/search/places";
import { buildTheologySearch } from "@/lib/theology/searchIndex";
import { DICTIONARY } from "@/lib/dictionary/terms";
import { GROUP_ORDER } from "@/lib/search/types";

const before = process.env.NEXT_PUBLIC_SHOP_ENABLED;
afterEach(() => {
  if (before === undefined) delete process.env.NEXT_PUBLIC_SHOP_ENABLED;
  else process.env.NEXT_PUBLIC_SHOP_ENABLED = before;
});

let theology: TheologyEntry[] = [];
let rows: SearchRow[] = [];
const ids = (list: readonly SearchRow[]) => list.map((r) => r.id);
const find = (query: string) => results(prepare(rows), query);

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SHOP_ENABLED = "1";
  const corpus = await buildSearchCorpus();
  theology = (await buildTheologySearch()) as TheologyEntry[];
  rows = mergeIndex(corpus, theology);
}, 60_000);

describe("one index, the theology library laid over the corpus by address", () => {
  it("keeps every theology entry, once, by its address", () => {
    expect(theology.length).toBeGreaterThan(40);
    for (const entry of theology) {
      const at = rows.filter((r) => r.href === entry.href);
      expect(at, entry.href).toHaveLength(1);
      expect(at[0].section, entry.href).toBe(entry.section);
    }
  });

  it("gives a study the corpus lists its line, and adds the ones it does not list", () => {
    const arianism = rows.find((r) => r.href === "/heresies/arianism");
    expect(arianism?.id).toBe("heresy-arianism");
    expect(arianism?.line).toBeTruthy();
    const apologetics = rows.filter((r) => r.section === "Apologetics");
    expect(apologetics.length).toBeGreaterThan(0);
    for (const row of apologetics) {
      expect(row.group).toBe("Topics");
      expect(row.href.startsWith("/apologetics/")).toBe(true);
    }
    expect(new Set(ids(rows)).size).toBe(rows.length);
  });

  it("finds a study by its line, as the theology library's own search did", () => {
    // Arianism's line names the council it called, not its own name.
    expect(ids(find("nicaea"))).toContain("heresy-arianism");
  });

  it("still finds the theology library's own name for a council", () => {
    const council = theology.find((e) => e.section === "Councils");
    expect(council).toBeDefined();
    expect(find(council!.title).map((r) => r.href)).toContain(council!.href);
  });
});

describe("doors and kinds", () => {
  it("count, behind each door, what that door would show", () => {
    const found = find("nicaea");
    const counts = doorCounts(found);
    expect(counts.get("all")).toBe(found.length);
    for (const [door, n] of counts) {
      if (door === "all") continue;
      expect(n, door).toBe(found.filter((r) => inDoor(r, door)).length);
      expect(n, door).toBeLessThanOrEqual(found.length);
    }
    expect(counts.get("councils")).toBeGreaterThan(0);
    expect(counts.get("theology")).toBeGreaterThan(0);
  });

  it("list Everything first, then the doors that found something, most first, and the one turned to", () => {
    const counts = new Map<DoorId, number>([
      ["all", 9],
      ["bible", 0],
      ["saints", 2],
      ["prayers", 0],
      ["reading", 5],
      ["theology", 0],
      ["councils", 2],
      ["history", 0],
      ["shop", 0],
    ]);
    expect(doorsFound(counts, "all")).toEqual(["all", "reading", "saints", "councils"]);
    expect(doorsFound(counts, "history")).toEqual(["all", "reading", "saints", "councils", "history"]);
  });

  it("make the same row a different kind behind different doors", () => {
    const athanasius = rows.find((r) => r.id === "saint-athanasius-the-great");
    expect(athanasius).toBeDefined();
    expect(kindIn(athanasius!, "saints")).toBe("saints");
    if (athanasius!.section === "Fathers") expect(kindIn(athanasius!, "theology")).toBe("fathers");
    const work = rows.find((r) => r.id.startsWith("work-"));
    expect(kindIn(work!, "saints")).toBe("writings");
    expect(kindIn(work!, "reading")).toBe("writings");
    const word = rows.find((r) => r.id.startsWith("dictionary-"));
    expect(inDoor(word!, "theology")).toBe(true);
    expect(kindIn(word!, "theology")).toBe("dictionary");
    // No strip, no kind.
    expect(kindIn(word!, "bible")).toBeNull();
  });

  it("count each kind on a door's strip as its list holds it, and list a kind whole with nothing typed", () => {
    for (const door of ["theology", "saints", "prayers", "reading", "councils"] as const) {
      const counts = kindCounts(rows, door);
      for (const kind of DOOR_KINDS[door] ?? []) {
        expect(counts.get(kind), `${door} ${kind}`).toBe(behind(rows, door, kind).length);
      }
    }
    const theologyKinds = kindCounts(rows, "theology");
    for (const section of ["Doctrine", "Topics", "Heresies", "Apologetics", "Councils", "Fathers"] as const) {
      const kind = section.toLowerCase() as "doctrine";
      expect(theologyKinds.get(kind), section).toBe(theology.filter((e) => e.section === section).length);
    }
    expect(theologyKinds.get("dictionary")).toBe(DICTIONARY.length);
  });

  it("lays Everything out by the list's groups and a door by its kinds", () => {
    const found = find("nicaea");
    const groups = groupSections(found);
    expect(groups.map((g) => GROUP_ORDER.indexOf(g.group!))).toEqual([...groups.map((g) => GROUP_ORDER.indexOf(g.group!))].sort((a, b) => a - b));
    expect(groups.reduce((n, g) => n + g.rows.length, 0)).toBe(found.length);
    const here = found.filter((r) => inDoor(r, "theology"));
    const kinds = kindSections(here, "theology");
    const order = DOOR_KINDS.theology!;
    const at = kinds.filter((s) => s.kind).map((s) => order.indexOf(s.kind!));
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(kinds.reduce((n, s) => n + s.rows.length, 0)).toBe(here.length);
  });
});

describe("what a query finds", () => {
  it("ranks a name beginning with the words, then a word of the name, then a name holding them, then the rest", () => {
    const list: SearchRow[] = [
      { id: "d", label: "Something else", href: "/d", group: "Other", line: "the theosis of man" },
      { id: "c", label: "Pretheosis", href: "/c", group: "Other" },
      { id: "b", label: "On Theosis", href: "/b", group: "Other" },
      { id: "a", label: "Theosis", href: "/a", group: "Other" },
    ];
    expect(ids(rank(prepare(list), "theosis"))).toEqual(["a", "b", "c", "d"]);
    // A word's start in any script, not only in Latin letters.
    const greek: SearchRow[] = [{ id: "g", label: "Οἱ Ψαλμοί", href: "/g", group: "Bible" }];
    expect(ids(rank(prepare(greek), "ψαλμ"))).toEqual(["g"]);
  });

  it("puts a typed reference first, and a book only an abbreviation names after it", () => {
    const prepared = prepare(rows);
    const lead: SearchRow[] = [{ id: "ref-matthew-5", label: "Matthew 5", href: "/bible/matthew/5", group: "Bible" }];
    const found = results(prepared, "mt 5", { lead, boost: ["book-matthew"] });
    expect(ids(found).slice(0, 2)).toEqual(["ref-matthew-5", "book-matthew"]);
    // A book the list already finds by its name keeps its own place.
    const named = results(prepared, "genesis", { boost: ["book-genesis"] });
    expect(ids(named)[0]).toBe("book-genesis");
    expect(ids(named).filter((id) => id === "book-genesis")).toHaveLength(1);
  });

  it("finds a dictionary word by its definition once the definitions are in", () => {
    const theosis = DICTIONARY.find((d) => d.id === "theosis");
    expect(theosis).toBeDefined();
    const withDefs = withDefinitions(rows, DICTIONARY);
    const row = withDefs.find((r) => r.href === "/dictionary#theosis");
    expect(row?.line).toBe(theosis!.definition);
    // A word from the middle of the definition, not in the name.
    const word = theosis!.definition.split(/\s+/).find((w) => w.length > 7 && !/theosis/i.test(w))!.replace(/[^\p{L}]/gu, "");
    expect(ids(results(prepare(withDefs), word)), word).toContain(row!.id);
  });
});

describe("the words it offers", () => {
  it("finishes the last word typed, the most used first, and only that word", () => {
    const vocab = vocabulary(rows);
    const theo = completions(vocab, "theo");
    expect(theo.length).toBeGreaterThan(0);
    expect(theo.length).toBeLessThanOrEqual(3);
    for (const c of theo) {
      expect(c.full.startsWith("theo")).toBe(true);
      expect(c.typed + c.rest).toBe(c.full);
    }
    expect(completions(vocab, "t")).toEqual([]);
    const two = completions(vocab, "prayer ro");
    expect(two.length).toBeGreaterThan(0);
    for (const c of two) expect(c.full.startsWith("prayer ro")).toBe(true);
    // "the" would finish every "th": never offered.
    expect(completions(vocab, "th").map((c) => c.rest)).not.toContain("e");
  });

  it("offers the library's spelling a letter or two off, and nothing for a word it knows", () => {
    const vocab = vocabulary(rows);
    expect(nearSpelling(vocab, "chrystostom")).toBe("chrysostom");
    expect(nearSpelling(vocab, "chrysostom")).toBeNull();
    expect(results(prepare(rows), "chrysostom").length).toBeGreaterThan(0);
    expect(nearSpelling(vocab, "xqzv")).toBeNull();
    expect(nearSpelling(vocab, "   ")).toBeNull();
  });

  it("counts a swap of two letters as one change", () => {
    expect(editDistance("niceaa", "nicaea", 2)).toBe(1);
    expect(editDistance("basil", "basil", 1)).toBe(0);
    expect(editDistance("cat", "dogs", 1)).toBe(2);
  });
});

describe("lit words and pictures", () => {
  it("lights the words found whatever their case or accents, and the pieces make the name again", () => {
    const parts = hitParts("St. John Chrysóstomos of Constantinople", "chrysostomos");
    expect(parts.map((p) => p.text).join("")).toBe("St. John Chrysóstomos of Constantinople");
    expect(parts.filter((p) => p.hit).map((p) => p.text)).toEqual(["Chrysóstomos"]);
    const twice = hitParts("Nicaea and Nicaea", "NICAEA");
    expect(twice.filter((p) => p.hit)).toHaveLength(2);
    expect(hitParts("Arianism", "")).toEqual([{ text: "Arianism", hit: false }]);
  });

  it("draws a saint over his own icon and anything else over its door's picture, and a setting over none", () => {
    const saint = rows.find((r) => r.group === "Saints" && r.picture);
    expect(saint).toBeDefined();
    expect(pictureFor(saint!)?.src).toBe(saint!.picture);
    const event = rows.find((r) => r.group === "History" && !r.picture);
    expect(pictureFor(event!)?.src).toBe(doorOf("history").picture);
    const setting = rows.find((r) => r.group === "Settings");
    expect(pictureFor(setting!)).toBeNull();
    const shop = rows.find((r) => r.href === "/shop");
    expect(shop).toBeDefined();
    expect(inDoor(shop!, "shop")).toBe(true);
    expect(pictureFor(shop!)?.src).toBe("/discover/tiles/shop.v2.webp");
  });
});
