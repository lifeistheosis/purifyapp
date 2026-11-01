// St John Cassian's books On the Incarnation, a work of their own (1.8, round
// 6, the owner's note 79; lib/saints/workMoves.ts), and the reader's places
// carried from the old address in the Conferences to the new one.
//
// What a reader would notice if this broke: a highlight, a note, a bookmark
// or a kept place in the books gone, or on another chapter; an old link to
// "Conference 24" opening the Conferences at their top.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { carryMovedPlaces } from "@/lib/saints/carryMoves";
import { WORK_MOVES, movedAddress, movesInto, movesOutOf } from "@/lib/saints/workMoves";
import { withMovedWork } from "@/lib/reading/progress";
import { SAINTS } from "@/lib/saints/saints";

const ROOT = path.resolve(__dirname, "..", "..", "..");
type Work = { title: string; sections: { n: number; title: string; paragraphs: string[] }[] };
const read = (saint: string, work: string): Work =>
  JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", saint, `${work}.json`), "utf8")) as Work;

const [move] = WORK_MOVES;
const conferences = read("john-cassian", "conferences");
const books = read("john-cassian", "on-the-incarnation");

describe("the books On the Incarnation, out of the Conferences", () => {
  it("are a work of St John Cassian's own, with its own page", () => {
    const cassian = SAINTS.find((s) => s.slug === "john-cassian")!;
    expect(cassian.works.map((w) => w.slug)).toEqual(["institutes", "conferences", "on-the-incarnation"]);
    expect(cassian.works[2].title).toBe(move.to.title);
    expect(books.title).toBe(move.to.title);
    expect(movesOutOf("john-cassian", "conferences")).toEqual([move]);
    expect(movesInto("john-cassian", "on-the-incarnation")).toEqual([move]);
  });

  it("hold the Preface and seven books, the Conferences 492 chapters ending at Conference 24, Chapter 26", () => {
    expect(conferences.sections).toHaveLength(move.from.sections);
    expect(conferences.sections.at(-1)!.title.startsWith("Conference 24, Chapter 26.")).toBe(true);
    expect(books.sections).toHaveLength(move.to.sections);
    expect(books.sections.map((s) => s.n)).toEqual(Array.from({ length: 112 }, (_, k) => k + 1));
    expect(books.sections[0].title).toBe("Preface");
    expect(books.sections[0].paragraphs[0].startsWith("When I had now finished the books of Spiritual Conferences")).toBe(true);
    expect(books.sections[1].title).toBe("Book 1, Chapter 1. The heresy compared to the hydra of the poets.");
    expect(books.sections.at(-1)!.title.startsWith("Book 7, Chapter 31.")).toBe(true);
    // No heading of the treatise is left standing as a paragraph, in either work: its title page,
    // "Preface." and "Book I." at the foot of Conference 24, Chapter 26, each book's at the foot of the one before.
    for (const w of [conferences, books]) {
      for (const s of w.sections) {
        for (const p of s.paragraphs) expect(/^(?:Book [IVX]+\.$|THE SEVEN BOOKS|INCARNATION OF THE LORD)/.test(p.trim()), `${s.n}: ${p}`).toBe(false);
      }
    }
    expect(conferences.sections.at(-1)!.paragraphs.slice(4).every((p) => p === "")).toBe(true);
  });

  it("name only old places the Conferences no longer have, or slots they keep empty", () => {
    const now = new Set(conferences.sections.map((s) => s.n));
    for (const n of move.oldSections) {
      expect(now.has(n), `the Conferences have a section ${n} again: retire the move first`).toBe(false);
      // Each section that left is a chapter of the books, in order.
      const to = move.moveSection(n)!;
      expect(books.sections.find((s) => s.n === to), `${n} to ${to}`).toBeDefined();
    }
    for (const [n, i] of move.emptied) expect(conferences.sections.find((s) => s.n === n)!.paragraphs[i]).toBe("");
    // Nothing the Conferences still hold is moved.
    for (const s of conferences.sections) {
      s.paragraphs.forEach((p, i) => {
        if (move.emptied.some(([en, ei]) => en === s.n && ei === i)) return;
        expect(move.move(s.n, i), `${s.n}:${i}`).toBeNull();
      });
      expect(move.moveSection(s.n), `${s.n}`).toBeNull();
    }
  });

  it("send each old paragraph to the same index of its chapter, under the book's own name", () => {
    expect(move.move(493, 0)).toEqual({ n: 2, i: 0 });
    expect(move.move(503, 1)).toEqual({ n: 12, i: 1 });
    expect(move.move(603, 1)).toEqual({ n: 112, i: 1 });
    expect(move.move(492, 8)).toEqual({ n: 1, i: 0 });
    expect(move.move(492, 3)).toBeNull();
    // Book 2, Chapter 5 is the Theotokos study's: "she who bore God is Theotocos".
    expect(books.sections.find((s) => s.n === 12)!.paragraphs[1]).toContain("she who bore God is Theotocos");
    expect(move.retitle(503, "Conference 24, Chapter 5. From the gifts of Divine grace")).toBe("Book 2, Chapter 5. From the gifts of Divine grace");
    expect(move.retitle(603, "Conference 24, Chapter 31. He bemoans")).toBe("Book 7, Chapter 31. He bemoans");
  });

  it("land an old link on the same place of the new work", () => {
    expect(movedAddress("/saints/john-cassian/conferences", "#s503")).toBe("/saints/john-cassian/on-the-incarnation#s12");
    expect(movedAddress("/saints/john-cassian/conferences/", "#s493")).toBe("/saints/john-cassian/on-the-incarnation/#s2");
    expect(movedAddress("/saints/john-cassian/conferences/", "#p-503-1")).toBe("/saints/john-cassian/on-the-incarnation/#p-12-1");
    expect(movedAddress("/saints/john-cassian/conferences", "#p-492-8")).toBe("/saints/john-cassian/on-the-incarnation#p-1-0");
    // What stayed, stays.
    expect(movedAddress("/saints/john-cassian/conferences", "#s492")).toBeNull();
    expect(movedAddress("/saints/john-cassian/conferences", "#p-2-1")).toBeNull();
    expect(movedAddress("/saints/john-cassian/conferences", "")).toBeNull();
    expect(movedAddress("/saints/john-cassian/institutes", "#s503")).toBeNull();
    expect(movedAddress("/saints/john-cassian/on-the-incarnation", "#s12")).toBeNull();
  });
});

describe("the reading room's progress, after the move", () => {
  const from = { key: "john-cassian/conferences", of: 492 };
  const to = { key: "john-cassian/on-the-incarnation", of: 112 };

  it("is the new work's when the reader was in the books, and the Conferences are finished", () => {
    const next = withMovedWork({ [from.key]: { n: 503, i: 502, of: 603, at: 5 } }, from, to, move.moveSection);
    expect(next[to.key]).toEqual({ n: 12, i: 11, of: 112, at: 5 });
    expect(next[from.key]).toEqual({ n: 492, i: 491, of: 492, at: 5, done: true });
    // A second run changes nothing.
    expect(withMovedWork(next, from, to, move.moveSection)).toBe(next);
  });

  it("counts a reading in the Conferences against their 492", () => {
    const next = withMovedWork({ [from.key]: { n: 300, i: 299, of: 603, at: 5 } }, from, to, move.moveSection);
    expect(next[from.key]).toEqual({ n: 300, i: 299, of: 492, at: 5 });
    expect(next[to.key]).toBeUndefined();
    expect(withMovedWork(next, from, to, move.moveSection)).toBe(next);
  });
});

function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
    map,
  };
}

describe("carrying what a reader kept under the old address", () => {
  let store: ReturnType<typeof storage>;
  let events: string[];

  beforeEach(() => {
    store = storage();
    events = [];
    vi.stubGlobal("localStorage", store);
    vi.stubGlobal("window", {
      localStorage: store,
      dispatchEvent: (e: { type: string }) => {
        events.push(e.type);
        return true;
      },
    });
    vi.stubGlobal(
      "CustomEvent",
      class {
        type: string;
        detail: unknown;
        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type;
          this.detail = init?.detail;
        }
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("moves a highlight, a bookmark, the kept place and the progress, and buries the old addresses for the sync", () => {
    store.setItem("purify:saint:john-cassian:conferences:503:1", JSON.stringify({ highlighted: true, at: "2026-10-01T00:00:00.000Z" }));
    store.setItem("purify:saint:john-cassian:conferences:492:8", JSON.stringify({ note: "the Preface", at: "2026-10-01T00:00:00.000Z" }));
    store.setItem("purify:saint:john-cassian:conferences:20:2", JSON.stringify({ highlighted: true }));
    store.setItem(
      "purify:bookmarks",
      JSON.stringify([
        { id: "a", addedAt: 2, kind: "writing-section", saintSlug: "john-cassian", saintName: "St. John Cassian", workSlug: "conferences", workTitle: "The Conferences", sectionN: 503, sectionTitle: "Conference 24, Chapter 5. From the gifts", label: "x" },
        { id: "b", addedAt: 1, kind: "writing-section", saintSlug: "john-cassian", saintName: "St. John Cassian", workSlug: "conferences", workTitle: "The Conferences", sectionN: 2, sectionTitle: "Conference 1, Chapter 2", label: "y" },
      ]),
    );
    store.setItem("purify.reader.position.john-cassian/conferences", JSON.stringify({ sectionN: 503, savedAt: 9 }));
    store.setItem("purify:reading-progress", JSON.stringify({ "john-cassian/conferences": { n: 503, i: 502, of: 603, at: 9 } }));

    // Two marks, a bookmark, the place and the progress.
    expect(carryMovedPlaces()).toBe(5);

    expect(store.getItem("purify:saint:john-cassian:conferences:503:1")).toBeNull();
    expect(JSON.parse(store.getItem("purify:saint:john-cassian:on-the-incarnation:12:1")!)).toMatchObject({ highlighted: true });
    expect(JSON.parse(store.getItem("purify:saint:john-cassian:on-the-incarnation:1:0")!)).toMatchObject({ note: "the Preface" });
    expect(store.getItem("purify:saint:john-cassian:conferences:20:2")).not.toBeNull();

    const marks = JSON.parse(store.getItem("purify:bookmarks")!) as { workSlug: string; sectionN: number; workTitle: string; sectionTitle: string; label: string }[];
    expect(marks.find((b) => b.workSlug === "on-the-incarnation")).toMatchObject({
      sectionN: 12,
      workTitle: "On the Incarnation of the Lord",
      sectionTitle: "Book 2, Chapter 5. From the gifts",
      label: "St. John Cassian, On the Incarnation of the Lord, Book 2, Chapter 5. From the gifts",
    });
    expect(marks.find((b) => b.workSlug === "conferences")?.sectionN).toBe(2);

    expect(store.getItem("purify.reader.position.john-cassian/conferences")).toBeNull();
    expect(JSON.parse(store.getItem("purify.reader.position.john-cassian/on-the-incarnation")!)).toEqual({ sectionN: 12, savedAt: 9 });
    const progress = JSON.parse(store.getItem("purify:reading-progress")!);
    expect(progress["john-cassian/on-the-incarnation"]).toEqual({ n: 12, i: 11, of: 112, at: 9 });
    expect(progress["john-cassian/conferences"].done).toBe(true);

    // The old addresses are buried, so the sync deletes the server's copies.
    const removed = JSON.parse(store.getItem("purify:sync:removed")!) as { table: string; locator: Record<string, unknown> }[];
    expect(removed.map((t) => `${t.table} ${t.locator.workSlug} ${t.locator.sectionN}`).sort()).toEqual([
      "annotations conferences 492",
      "annotations conferences 503",
      "bookmarks conferences 503",
    ]);
    expect(events).toContain("purify:annotation");
    expect(events).toContain("purify:bookmark");

    // Run again (the next page, the next pull): nothing left to move.
    expect(carryMovedPlaces()).toBe(0);
  });
});
