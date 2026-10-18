// Highlights and notes follow their paragraphs when a work is laid out again
// (1.8, lib/saints/layoutMoves.ts).
//
// The Confessions were ten groups of four paragraphs ("Opening invocation",
// "Reflection 2" ... "Reflection 10") and are now Book I, one section of the
// same 38 paragraphs. A reader's highlight is kept by section and paragraph,
// so without the move a highlight on "Reflection 2" would have stayed on an
// address the work no longer has. What a reader would notice if this broke:
// their highlights and notes in the Confessions gone, or on another paragraph.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LAYOUT_MOVES, moveLegacyAnnotations } from "@/lib/saints/layoutMoves";

const ROOT = path.resolve(__dirname, "..", "..", "..");
type Work = { sections: { n: number; title?: string; paragraphs: string[] }[] };
const read = (key: string): Work => {
  const [saint, work] = key.split("/");
  return JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", saint, `${work}.json`), "utf8")) as Work;
};

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

describe("a work laid out again", () => {
  it("names only old places its file no longer has, so nothing it moves can be a new paragraph", () => {
    for (const [key, entry] of Object.entries(LAYOUT_MOVES)) {
      const w = read(key);
      const now = new Set(w.sections.map((s) => s.n));
      for (const n of entry.oldSections) expect(now.has(n), `${key}: section ${n} exists again; retire the move first`).toBe(false);
      for (const [n, i] of entry.oldParagraphs ?? []) {
        const s = w.sections.find((x) => x.n === n);
        expect((s?.paragraphs.length ?? 0) <= i, `${key}: section ${n}, paragraph ${i} exists again; retire the move first`).toBe(true);
      }
      // Every place it moves anything from is one it names.
      for (const n of [...now].slice(0, 200)) for (let i = 0; i < 60; i++) {
        const s = w.sections.find((x) => x.n === n)!;
        if (i < s.paragraphs.length) expect(entry.move(n, i), `${key}: moves the live paragraph ${n}:${i}`).toBeNull();
      }
    }
  });

  it("sends each paragraph of St Athanasius's Life of Antony and Against the Heathen past the notes taken out", () => {
    for (const key of ["athanasius-the-great/life-of-antony", "anthony-the-great/life-of-antony"]) {
      const { move } = LAYOUT_MOVES[key];
      const w = read(key);
      expect(w.sections.map((s) => s.n), key).toEqual([2]);
      const now = w.sections[0].paragraphs;
      // The text's own paragraphs keep their order and their numbers, §1 at old 5 to §94 at old 126.
      expect(move(1, 0), key).toEqual({ n: 2, i: 0 });
      expect(now[move(1, 5)!.i].startsWith("1. Antony you must know"), key).toBe(true);
      expect(now[move(1, 121)!.i].startsWith("91. But he, knowing the custom"), key).toBe(true);
      expect(now[move(1, 126)!.i].startsWith("94. Read these words"), key).toBe(true);
      expect(move(1, 126), key).toEqual({ n: 2, i: now.length - 1 });
      // A note is gone, and what was marked on it stays where it was.
      expect(move(1, 122), key).toBeNull();
      expect(move(1, 7), key).toBeNull();
    }
    const key = "athanasius-the-great/against-the-heathen";
    const { move } = LAYOUT_MOVES[key];
    const w = read(key);
    expect(w.sections.map((s) => s.n)).toEqual([4, 5, 6]);
    const at = (to: { n: number; i: number } | null) => w.sections.find((s) => s.n === to!.n)!.paragraphs[to!.i];
    expect(at(move(1, 4)).startsWith("§2. Evil no part")).toBe(true);
    expect(at(move(2, 9)).startsWith("§34. The soul, then")).toBe(true);
    expect(at(move(3, 28)).startsWith("§47. Necessity of a return")).toBe(true);
    expect(move(1, 2)).toBeNull();
    expect(move(3, 3)).toBeNull();
    // Every paragraph left is a chapter's heading or its one paragraph.
    for (const s of w.sections) s.paragraphs.forEach((p, i) => expect(/^§\d+\. /.test(p) || /^§\d+\. /.test(s.paragraphs[i - 1] ?? ""), `${s.n}:${i}`).toBe(true));
  });

  it("sends chapter 61 of St Justin's Dialogue to its own section, and the second copy of chapter 116 to the first", () => {
    const key = "justin-martyr/dialogue-with-trypho";
    const { move } = LAYOUT_MOVES[key];
    const w = read(key);
    const at = (n: number) => w.sections.find((s) => s.n === n)!;
    // The paragraph moved is the same words.
    expect(at(143).paragraphs[0]).toMatch(/^“I shall give you another testimony, my friends,” said I, “from the Scriptures, that God begat before all creatures a Beginning/);
    expect(move(60, 4)).toEqual({ n: 143, i: 0 });
    expect(move(60, 5)).toEqual({ n: 143, i: 0 });
    expect(move(116, 0)).toEqual({ n: 115, i: 0 });
    expect(at(115).title).toBe("It is shown how this prophecy suits the Christians");
    // Everything else stays where it was.
    expect(move(60, 3)).toBeNull();
    expect(move(61, 0)).toBeNull();
    expect(move(115, 0)).toBeNull();
    expect(move(143, 0)).toBeNull();
  });

  it("sends each old paragraph of the Confessions to the same words in Book I", () => {
    const { move } = LAYOUT_MOVES["augustine-of-hippo/confessions"];
    const book = read("augustine-of-hippo/confessions").sections[0].paragraphs;
    expect(book).toHaveLength(38);
    // The old layout was the same paragraphs, four to a section, in order.
    for (let n = 2; n <= 10; n++) {
      for (let i = 0; i < 4; i++) {
        const k = (n - 1) * 4 + i;
        if (k >= book.length) {
          expect(move(n, i)?.i ?? 99, `${n}:${i}`).toBeGreaterThanOrEqual(book.length);
          continue;
        }
        expect(move(n, i), `${n}:${i}`).toEqual({ n: 1, i: k });
      }
    }
    // Section 1 was where it is now, and anything else is left alone.
    expect(move(1, 2)).toBeNull();
    expect(move(11, 0)).toBeNull();
    expect(move(2, 4)).toBeNull();
  });
});

describe("moving a reader's marks", () => {
  let store: ReturnType<typeof storage>;
  let events: { type: string; detail: unknown }[];

  beforeEach(() => {
    store = storage();
    events = [];
    vi.stubGlobal("window", {
      localStorage: store,
      dispatchEvent: (e: { type: string; detail: unknown }) => {
        events.push(e);
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

  const old = "purify:saint:augustine-of-hippo:confessions:3:1";
  const now = "purify:saint:augustine-of-hippo:confessions:1:9";

  it("moves a highlight to its new place, buries the old one for the sync, and says so", () => {
    store.setItem(old, JSON.stringify({ highlighted: true, at: "2026-10-01T00:00:00.000Z" }));
    expect(moveLegacyAnnotations("augustine-of-hippo", "confessions")).toBe(1);
    expect(store.getItem(old)).toBeNull();
    expect(JSON.parse(store.getItem(now)!)).toEqual({ highlighted: true, at: "2026-10-01T00:00:00.000Z" });
    const removed = JSON.parse(store.getItem("purify:sync:removed")!) as { kind: string; locator: Record<string, unknown> }[];
    expect(removed.map((t) => t.locator)).toEqual([{ saintSlug: "augustine-of-hippo", workSlug: "confessions", sectionN: 3, paragraphIdx: 1 }]);
    expect(events.map((e) => e.type)).toEqual(["purify:annotation"]);
    expect(events[0].detail).toMatchObject({ kind: "saint-paragraph", sectionN: 1, paragraphIdx: 9 });
    // A second visit has nothing left to move.
    expect(moveLegacyAnnotations("augustine-of-hippo", "confessions")).toBe(0);
  });

  it("keeps the newer note when both places hold one", () => {
    store.setItem(old, JSON.stringify({ note: "older", at: "2026-09-01T00:00:00.000Z" }));
    store.setItem(now, JSON.stringify({ note: "newer", at: "2026-10-10T00:00:00.000Z" }));
    moveLegacyAnnotations("augustine-of-hippo", "confessions");
    expect(JSON.parse(store.getItem(now)!).note).toBe("newer");
    expect(store.getItem(old)).toBeNull();
  });

  it("leaves every other work and every current place alone", () => {
    store.setItem("purify:saint:augustine-of-hippo:confessions:1:2", JSON.stringify({ highlighted: true }));
    store.setItem("purify:saint:john-chrysostom:homilies-on-matthew:3:1", JSON.stringify({ highlighted: true }));
    expect(moveLegacyAnnotations("augustine-of-hippo", "confessions")).toBe(0);
    expect(moveLegacyAnnotations("john-chrysostom", "homilies-on-matthew")).toBe(0);
    expect(store.map.size).toBe(2);
  });
});
