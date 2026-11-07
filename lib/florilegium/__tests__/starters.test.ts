// The Florilegium's first page (1.9, the owner's pick for Keeping, A and C):
// the starters a reader may keep, word for word from the app's own Bible, and
// the sync line, which says "synced" only for an exchange the server took.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { STARTERS, starterItems, starterReference } from "@/lib/florilegium/starters";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");
const HUB = read("components/florilegium/FlorilegiaHub.tsx");
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
    expect(HUB).toContain("const id = create(t(s.nameKey), starterReference(s, bookName(s.book)));");
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
