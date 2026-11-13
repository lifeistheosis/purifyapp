// The Florilegium's first page (1.9, the owner's pick for Keeping, A and C):
// the starters a reader may keep, word for word from the app's own Bible, and
// the sync line, which says "synced" only for an exchange the server took.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { STARTERS, starterItems, starterOf, starterPicture, starterReference } from "@/lib/florilegium/starters";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");
const HUB = read("components/florilegium/FlorilegiaHub.tsx");
const STARTER = read("components/florilegium/StarterPage.tsx");
const SYNC = read("lib/sync/florilegium.ts");
const MESSAGES = fs.readdirSync(path.resolve(__dirname, "../../i18n/messages")).filter((f) => f.endsWith(".json"));

describe("the starters", () => {
  it("are four whole passages, each line its verse as data/bible carries it, word for word", () => {
    expect(STARTERS.map((s) => s.id)).toEqual(["prologue", "beatitudes", "magnificat", "psalm-50"]);
    for (const s of STARTERS) {
      const chapter = JSON.parse(read(`data/bible/${s.book}/${s.chapter}.json`)) as { verses: { n: number; text: string }[] };
      const first = s.lines[0].verse;
      s.lines.forEach((l, i) => {
        expect(l.verse, s.id).toBe(first + i);
        expect(l.text, `${s.id} ${l.verse}`).toBe(chapter.verses.find((v) => v.n === l.verse)?.text);
      });
    }
    expect(STARTERS.map((s) => `${s.book} ${s.chapter}:${s.lines[0].verse}-${s.lines.at(-1)?.verse}`)).toEqual([
      "john 1:1-18",
      "matthew 5:3-12",
      "luke 1:46-55",
      "psalms 50:1-19",
    ]);
  });

  it("are named in every language of the app", () => {
    for (const file of MESSAGES) {
      const messages = JSON.parse(read(`lib/i18n/messages/${file}`)) as Record<string, string>;
      for (const s of STARTERS) expect(messages[s.nameKey], `${file} ${s.nameKey}`).toBeTruthy();
    }
  });

  it("are kept as the reader's own gathering, a verse a line, reading from the first verse down", () => {
    const prologue = STARTERS[0];
    const items = starterItems(prologue, "John");
    expect(items).toHaveLength(18);
    // The store puts the newest first: the last handed over, verse 1, is read first.
    expect(items.at(-1)).toMatchObject({ kind: "scripture", reference: "John 1:1", book: "john", chapter: 1, verse: 1 });
    expect(items[0]).toMatchObject({ reference: "John 1:18", verse: 18 });
    expect(starterReference(prologue, "John")).toBe("John 1:1-18");
    // Kept on the starter's own page (1.9, build 89 note 6), named and described as before.
    expect(STARTER).toContain("const id = create(t(s.nameKey), starterReference(s, bookName(s.book)));");
    expect(STARTER).toContain("for (const item of starterItems(s, bookName(s.book))) addItem(id, item);");
  });
});

describe("the first page", () => {
  it("gives the naming field its own id, so its label is its own and not the page's title", () => {
    expect(HUB).toContain('htmlFor="florilegium-name"');
    expect(HUB).toContain('id="florilegium-name"');
    expect(HUB).not.toContain('id="florilegium-title"');
  });

  it("says synced only after the server took the collections or handed them over", () => {
    expect(SYNC).toMatch(/const \{ error: parentErr \} = await supabase\.from\("florilegia"\)\.upsert\(parentRows\);\s*if \(parentErr\) return;/);
    expect(SYNC).toMatch(/if \(itemErr\) return;\s*\}\s*\/\/[^\n]*\n\s*stampFlorilegiaSynced\(\);/);
    expect(SYNC).toMatch(/writeLocal\(merged\);\s*stampFlorilegiaSynced\(\);/);
    expect(SYNC.match(/stampFlorilegiaSynced\(\)/g)).toHaveLength(2);
  });

  it("never counts devices, which nothing in the app knows", () => {
    const code = HUB.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    // A count of devices, or a line about them; the date helper's name (deviceDates) is neither.
    expect(code).not.toMatch(/devices|deviceCount|t\("[^"]*device/i);
  });
});

// A gathering kept from a starter wears the starter's picture (1.9, F1). Until
// then no gathering had a picture, so nothing travelled from its row into its
// page, and a kept Magnificat looked like any list of verses.
//
// What a reader would notice if this broke: the Theotokos's icon on a
// gathering that is not her song, or a kept starter back under the plain book.
describe("a gathering kept from a starter", () => {
  const ROW = read("components/florilegium/GatheringRow.tsx");
  const DETAIL = read("components/florilegium/FlorilegiumDetail.tsx");
  const kept = (id: string) => {
    const s = STARTERS.find((x) => x.id === id)!;
    return { s, items: starterItems(s, "Book") };
  };

  it("is told by its lines, whatever it is named and whatever was gathered into it since", () => {
    for (const s of STARTERS) expect(starterOf({ items: starterItems(s, "Any name") })?.id, s.id).toBe(s.id);
    const { s, items } = kept("magnificat");
    // A line of a Father gathered in later, and another verse: still her song.
    const more = [{ kind: "father", text: "x" }, { kind: "scripture", book: "john", chapter: 1, verse: 1 }, ...items];
    expect(starterOf({ items: more })?.id).toBe(s.id);
    // In whatever order the device keeps them.
    expect(starterOf({ items: [...items].reverse() })?.id).toBe(s.id);
  });

  it("is not claimed for a gathering that lacks a verse of it, or keeps nothing", () => {
    const { items } = kept("magnificat");
    expect(starterOf({ items: items.slice(1) })).toBeUndefined();
    expect(starterOf({ items: [] })).toBeUndefined();
    const aFather = [{ kind: "father", text: "x" }];
    expect(starterOf({ items: aFather })).toBeUndefined();
    // The same verse numbers of another chapter are another passage.
    expect(starterOf({ items: items.map((i) => ({ ...i, chapter: 2 })) })).toBeUndefined();
  });

  it("wears the starter's own picture on its row, and the check while a line goes in", () => {
    expect(starterPicture(kept("magnificat").s).src).toBeTruthy();
    // The picture stays while a line goes in, so nothing before the name moves; the check stands at the row's end.
    expect(ROW).toContain("const starter = starterOf(f);");
    expect(ROW).toContain("const picture = starter ? starterPicture(starter) : null;");
    expect(ROW).toContain("<CoverArt src={picture.src} fallback={picture.fallback} size={72}");
    expect(ROW).toContain('{gathered ? <Check size={18} className="shrink-0 text-paper" /> : null}');
    // Every other gathering wears nothing before its name: a row has no icon tile (1.9, the fifteen screens, rule 4).
    expect(ROW).not.toContain("FLOR_PLATE");
  });

  it("carries the picture from its row on the first page to the head of its own page, under its own key", () => {
    expect(ROW).toContain("export const gatheringCarry = (id: string) => `gathering:${id}`;");
    // Only where the row is a place to go: in the sheet that picks a gathering it is a choice.
    expect(ROW).toContain("data-carry={carry ? gatheringCarry(f.id) : undefined}");
    expect(HUB).toContain("<GatheringRowBody f={f} carry />");
    expect(read("components/florilegium/FlorilegiumPickerSheet.tsx")).not.toMatch(/<GatheringRowBody[^>]*\bcarry\b/);
    expect(DETAIL).toContain("data-carry-into={gatheringCarry(f.id)}");
    // Not the picture's address, which the starter's own tile on the same page travels under.
    expect(ROW).not.toContain("data-carry={picture.src}");
    // The booklet is the reader's words: the picture stays off the printed page.
    expect(DETAIL).toMatch(/data-carry-into=\{gatheringCarry\(f\.id\)\}\s+className="[^"]*\bprint:hidden\b/);
  });
});
