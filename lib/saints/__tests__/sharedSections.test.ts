// St Cyril on Luke's two second halves, numbered apart in 1.9 (F-49; quick
// win 15 of his "everything in 1.9"), and what a reader kept on them before.
//
// The numbers are the place a highlight, a note and a section bookmark are
// kept by, so these hold three things: no work in the library uses a number
// twice again; the halves stand where they stood, words untouched; and a
// mark made before the split shows where it showed, while a mark made since
// is the half's it was made on. Nothing stored is rewritten.

import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  },
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
});
vi.stubGlobal(
  "CustomEvent",
  class {
    constructor(
      public type: string,
      public init?: unknown,
    ) {}
  },
);

const A = await import("../annotations");
const S = await import("../sharedSections");
const B = await import("@/lib/bookmarks");

const SAINT = "cyril-of-alexandria";
const WORK = "commentary-on-luke";
const at = (n: number, i: number) => `purify:saint:${SAINT}:${WORK}:${n}:${i}`;
/** The phone first had the halves apart at noon on 10 November 2026. */
const SPLIT = Date.parse("2026-11-10T12:00:00Z");
const BEFORE = "2026-10-01T09:00:00.000Z";

type Section = { n: number; title: string; paragraphs: unknown[] };
const luke = JSON.parse(fs.readFileSync(path.join(process.cwd(), `data/saints/${SAINT}/${WORK}.json`), "utf8")) as { sections: Section[] };

beforeEach(() => {
  store.clear();
  store.set("purify:saints:sharedSplitAt", String(SPLIT));
});

describe("the library's section numbers", () => {
  it("are never used twice in one work", () => {
    const twice: string[] = [];
    let works = 0;
    for (const dir of fs.readdirSync(path.join(process.cwd(), "data/saints"))) {
      const folder = path.join(process.cwd(), "data/saints", dir);
      if (!fs.statSync(folder).isDirectory()) continue;
      for (const file of fs.readdirSync(folder)) {
        if (!file.endsWith(".json")) continue;
        let work: { sections?: { n?: number }[] };
        try {
          work = JSON.parse(fs.readFileSync(path.join(folder, file), "utf8"));
        } catch {
          continue;
        }
        const ns = Array.isArray(work.sections) ? work.sections.map((s) => s?.n).filter((n): n is number => typeof n === "number") : [];
        if (!ns.length) continue;
        works++;
        const seen = new Set<number>();
        for (const n of ns) {
          if (seen.has(n)) twice.push(`${dir}/${file} ${n}`);
          seen.add(n);
        }
      }
    }
    expect(works).toBeGreaterThan(150);
    expect(twice).toEqual([]);
  });

  it("put St Cyril on Luke's second halves where they stood, under numbers of their own", () => {
    const i29 = luke.sections.findIndex((s) => s.n === 29);
    const i96 = luke.sections.findIndex((s) => s.n === 96);
    expect(luke.sections[i29 + 1]).toMatchObject({ n: 1029, title: "Sermon 29, the fragments" });
    expect(luke.sections[i96 + 1]).toMatchObject({ n: 97, title: "Sermon 97, from the Catena" });
    // Their words untouched: the same paragraphs, in the same places.
    const fragments = luke.sections[i29 + 1].paragraphs;
    expect(fragments).toHaveLength(16);
    expect(fragments[0]).toBe("FROM SERMON XXIX. Explanation of what is below.");
    const catena = luke.sections[i96 + 1].paragraphs;
    expect(catena).toHaveLength(18);
    expect(catena[1]).toBe("Behold there was a woman, who had a spirit of infirmity eighteen years.");
    // Every shared half named in the code is one of these, right after its first.
    for (const { work, sectionN, before } of S.sharedSections()) {
      expect(work).toBe(`${SAINT}/${WORK}`);
      const i = luke.sections.findIndex((s) => s.n === sectionN);
      expect(luke.sections[i - 1].n).toBe(before);
    }
  });
});

describe("a highlight or a note kept before the halves were apart", () => {
  it("shows on both halves, as it did", () => {
    store.set(at(29, 2), JSON.stringify({ highlighted: true, color: "blue", at: BEFORE }));
    expect(A.readParagraphAnnotation(SAINT, WORK, 29, 2)).toMatchObject({ highlighted: true, color: "blue" });
    expect(A.readParagraphAnnotation(SAINT, WORK, 1029, 2)).toMatchObject({ highlighted: true, color: "blue" });
    // One kept before 1.7, with no time on it, is older still.
    store.set(at(96, 4), JSON.stringify({ note: "the fig tree" }));
    expect(A.readParagraphAnnotation(SAINT, WORK, 97, 4).note).toBe("the fig tree");
  });

  it("changed on a second half, becomes that half's own; the first keeps the old", () => {
    store.set(at(29, 2), JSON.stringify({ highlighted: true, color: "blue", at: BEFORE }));
    A.writeParagraphAnnotation(SAINT, WORK, 1029, 2, { highlighted: true, color: "gold" });
    expect(JSON.parse(store.get(at(1029, 2))!)).toMatchObject({ highlighted: true, color: "gold" });
    expect(JSON.parse(store.get(at(29, 2))!)).toMatchObject({ color: "blue", at: BEFORE });
    expect(A.readParagraphAnnotation(SAINT, WORK, 29, 2).color).toBe("blue");
    expect(A.readParagraphAnnotation(SAINT, WORK, 1029, 2).color).toBe("gold");
  });

  it("taken off a second half, is taken off both, as it always was", () => {
    store.set(at(96, 3), JSON.stringify({ highlighted: true, color: "teal", at: BEFORE }));
    A.writeParagraphAnnotation(SAINT, WORK, 97, 3, {});
    expect(store.has(at(96, 3))).toBe(false);
    expect(store.has(at(97, 3))).toBe(false);
    expect(A.readParagraphAnnotation(SAINT, WORK, 96, 3)).toEqual({});
    expect(A.readParagraphAnnotation(SAINT, WORK, 97, 3)).toEqual({});
  });
});

describe("a highlight or a note made since", () => {
  it("is the second half's, kept under its own number", () => {
    A.writeParagraphAnnotation(SAINT, WORK, 1029, 4, { highlighted: true, color: "red" });
    expect(store.has(at(1029, 4))).toBe(true);
    expect(store.has(at(29, 4))).toBe(false);
    expect(A.readParagraphAnnotation(SAINT, WORK, 29, 4)).toEqual({});
  });

  it("is the first half's, and does not show on the second", () => {
    A.writeParagraphAnnotation(SAINT, WORK, 29, 3, { highlighted: true, color: "red", at: "2026-11-11T08:00:00.000Z" });
    expect(A.readParagraphAnnotation(SAINT, WORK, 29, 3).highlighted).toBe(true);
    expect(A.readParagraphAnnotation(SAINT, WORK, 1029, 3)).toEqual({});
  });

  it("leaves every other work's marks where they are", () => {
    store.set(`purify:saint:${SAINT}:${WORK}:33:1`, JSON.stringify({ highlighted: true, at: BEFORE }));
    expect(A.readParagraphAnnotation(SAINT, WORK, 33, 1).highlighted).toBe(true);
    expect(A.readParagraphAnnotation(SAINT, WORK, 34, 1)).toEqual({});
    expect(S.sharedBefore("anthony-the-great", "letters", 2)).toBeUndefined();
  });
});

describe("a section bookmark", () => {
  const mark = (sectionN: number, addedAt: number) =>
    ({ id: "b", kind: "writing-section", saintSlug: SAINT, saintName: "St. Cyril of Alexandria", workSlug: WORK, workTitle: "Commentary on Luke", sectionN, sectionTitle: "Sermon 29", label: "Sermon 29", addedAt }) as never;
  const place = (sectionN: number) => ({ kind: "writing-section", saintSlug: SAINT, workSlug: WORK, sectionN }) as never;

  it("kept on Sermon 29 before the split, still shows on its fragments", () => {
    expect(B.matches(mark(29, Date.parse(BEFORE)), place(1029))).toBe(true);
    expect(B.matches(mark(29, Date.parse(BEFORE)), place(29))).toBe(true);
  });

  it("kept since, belongs to the half it was kept on", () => {
    const later = SPLIT + 60_000;
    expect(B.matches(mark(29, later), place(1029))).toBe(false);
    expect(B.matches(mark(1029, later), place(29))).toBe(false);
    expect(B.matches(mark(1029, later), place(1029))).toBe(true);
  });
});

describe("the moment the halves were apart on this phone", () => {
  it("is set once, the first time a mark of the work is read, and kept", () => {
    store.clear();
    const t0 = Date.now();
    A.readParagraphAnnotation(SAINT, WORK, 29, 0);
    const seen = Number(store.get("purify:saints:sharedSplitAt"));
    expect(seen).toBeGreaterThanOrEqual(t0);
    A.readParagraphAnnotation(SAINT, WORK, 1029, 0);
    expect(Number(store.get("purify:saints:sharedSplitAt"))).toBe(seen);
  });

  it("is not set by any other work", () => {
    store.clear();
    A.readParagraphAnnotation("anthony-the-great", "letters", 1, 0);
    expect(store.has("purify:saints:sharedSplitAt")).toBe(false);
  });
});
