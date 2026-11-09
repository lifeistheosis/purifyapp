// The one-time move of a reader's things on Psalms 113 to 115 (lib/bible/psalmMove.ts),
// a DRAFT for his word (Fable's release check 1, M1): held to the script's
// own mapping, and kept out of the app until he says yes.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { moved } from "../../../scripts/bibles/psalms-113-115.mjs";
import { moveDevicePsalms, movedSpan, movedVerse, moveVerseCards, PSALMS_MOVED_KEY, type MoveStore } from "../psalmMove";

function device(seed: Record<string, unknown>) {
  const data = new Map<string, string>(Object.entries(seed).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  const store: MoveStore = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    keys: () => [...data.keys()],
  };
  const json = (k: string) => JSON.parse(data.get(k) ?? "null");
  return { data, store, json };
}

describe("where each old verse of Psalms 113 to 115 stands now", () => {
  it("is where the renumbering script put it, for every verse", () => {
    for (const [chapter, verses] of [[113, 8], [114, 18], [115, 19]] as const) {
      for (let v = 1; v <= verses; v++) expect(movedVerse(chapter, v), `${chapter}:${v}`).toEqual(moved(chapter, v));
    }
  });

  it("splits a span across the new line between 114 and 115 in two", () => {
    expect(movedSpan(114, 1, 18)).toEqual([{ chapter: 113, from: 9, to: 26 }]);
    expect(movedSpan(115, 9, 11)).toEqual([{ chapter: 114, from: 9, to: 9 }, { chapter: 115, from: 1, to: 2 }]);
  });

  it("moves a journal page's verse cards line by line, so none moves twice", () => {
    const body = "# Psalms\n\n[[verse psalms 115:1]]\n\n[[verse psalms 114:1-2]]\n\n[[verse psalms 115:9-11]]\n\nMy words on 114:4.";
    expect(moveVerseCards(body)).toBe(
      "# Psalms\n\n[[verse psalms 114:1]]\n\n[[verse psalms 113:9-10]]\n\n[[verse psalms 114:9]]\n\n[[verse psalms 115:1-2]]\n\nMy words on 114:4.",
    );
  });
});

describe("the move on a device", () => {
  it("moves notes, highlights, saved verses, Remember, journal cards, gathered verses and the last place, as they were", () => {
    const d = device({
      "purify:bible:psalms:114:1": { note: "Not unto us", noteAt: "2026-10-01T00:00:00Z", at: "2026-10-01T00:00:00Z" },
      "purify:bible:psalms:115:1": { highlighted: true, color: "gold", hlAt: "2026-10-02T00:00:00Z", at: "2026-10-02T00:00:00Z" },
      "purify:bible:psalms:115:10": { note: "I believed", at: "2026-10-03T00:00:00Z" },
      "purify:bible:psalms:113:1": { note: "stays", at: "2026-10-04T00:00:00Z" },
      "purify:bookmarks": [
        { kind: "bible-verse", book: "psalms", bookName: "Psalms", chapter: 115, verse: 10, label: "Psalms 115:10", addedAt: 1 },
        { kind: "bible-chapter", book: "psalms", bookName: "Psalms", chapter: 114, label: "Psalms 114", addedAt: 2 },
        { kind: "bible-verse", book: "john", bookName: "John", chapter: 3, verse: 16, label: "John 3:16", addedAt: 3 },
      ],
      "purify:remember": { entries: { "psalms/115/10": { box: 1, due: "2026-12-02", at: 5 } }, texts: { "psalms/115/10": "I believed" }, answeredKey: "psalms/115/10" },
      "purify:journal": [{ id: "a", body: "[[verse psalms 115:10]]", updatedAt: "2026-10-05T00:00:00Z" }],
      "purify:bible:last": { book: "psalms", bookName: "Psalms", chapter: 115, verse: 12, ts: 9 },
      "purify:florilegia": [{ id: "f", updatedAt: 1, items: [{ id: "i", kind: "scripture", text: "I believed, wherefore I have spoken", reference: "Psalms 115:10", book: "psalms", chapter: 115, verse: 10 }] }],
    });
    const report = moveDevicePsalms(d.store);
    expect(report).toEqual({ annotations: 3, bookmarks: 2, remember: 1, journal: 1, florilegium: 1, lastRead: true });
    expect(d.json("purify:florilegia")[0]).toMatchObject({
      updatedAt: 1,
      items: [{ text: "I believed, wherefore I have spoken", reference: "Psalms 115:1", chapter: 115, verse: 1 }],
    });
    // Old 114:1 and old 115:1 both moved, neither over the other.
    // Each as it was, its times too: a device sends nothing it did not change.
    expect(d.json("purify:bible:psalms:113:9")).toEqual({ note: "Not unto us", noteAt: "2026-10-01T00:00:00Z", at: "2026-10-01T00:00:00Z" });
    expect(d.json("purify:bible:psalms:114:1")).toEqual({ highlighted: true, color: "gold", hlAt: "2026-10-02T00:00:00Z", at: "2026-10-02T00:00:00Z" });
    expect(d.json("purify:bible:psalms:115:1")).toMatchObject({ note: "I believed" });
    expect(d.json("purify:bible:psalms:113:1")).toMatchObject({ note: "stays", at: "2026-10-04T00:00:00Z" });
    expect(d.data.has("purify:bible:psalms:115:10")).toBe(false);
    expect(d.json("purify:bookmarks").slice(0, 2)).toEqual([
      { kind: "bible-verse", book: "psalms", bookName: "Psalms", chapter: 115, verse: 1, label: "Psalms 115:1", addedAt: 1 },
      { kind: "bible-chapter", book: "psalms", bookName: "Psalms", chapter: 113, label: "Psalms 113", addedAt: 2 },
    ]);
    expect(d.json("purify:remember")).toMatchObject({ entries: { "psalms/115/1": { box: 1, at: 5 } }, texts: { "psalms/115/1": "I believed" }, answeredKey: "psalms/115/1" });
    expect(d.json("purify:journal")[0]).toEqual({ id: "a", body: "[[verse psalms 115:1]]", updatedAt: "2026-10-05T00:00:00Z" });
    expect(d.json("purify:bible:last")).toMatchObject({ chapter: 115, verse: 3 });
  });

  it("runs once, and leaves a newer copy already at the new place as it is", () => {
    const d = device({
      "purify:bible:psalms:114:4": { note: "old", at: "2026-10-01T00:00:00Z" },
      "purify:bible:psalms:113:12": { note: "from the tablet, newer", at: "2026-11-30T00:00:00Z" },
    });
    expect(moveDevicePsalms(d.store)?.annotations).toBe(0);
    expect(d.json("purify:bible:psalms:113:12")).toEqual({ note: "from the tablet, newer", at: "2026-11-30T00:00:00Z" });
    expect(d.data.get(PSALMS_MOVED_KEY)).toBe("1");
    d.data.set("purify:bible:psalms:114:4", JSON.stringify({ note: "pulled later, already new" }));
    expect(moveDevicePsalms(d.store)).toBeNull();
    expect(d.json("purify:bible:psalms:114:4")).toEqual({ note: "pulled later, already new" });
  });

  it("tombstones nothing: once the server has moved, an old place is another verse's new place", () => {
    const src = fs.readFileSync("lib/bible/psalmMove.ts", "utf8");
    expect(src).not.toMatch(/addTombstone|tombstones"/);
  });

  it("is not run by the app until his word", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== "__tests__" && e.name !== "node_modules") walk(p);
        } else if (/\.(ts|tsx)$/.test(e.name) && p !== path.join("lib", "bible", "psalmMove.ts") && fs.readFileSync(p, "utf8").includes("psalmMove")) hits.push(p);
      }
    };
    for (const dir of ["app", "components", "lib"]) walk(dir);
    expect(hits).toEqual([]);
  });
});
