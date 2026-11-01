// The place a Father's work keeps (1.8, round 6, the owner's note 79 and
// sheet r3-29; lib/reader/position.ts): the paragraph a reader stopped at,
// with no expiry, kept the way the Bible keeps its verse since note 68.
//
// What a reader would notice if this broke: a work that opens at the top of
// the chapter they were halfway through (Conference 10, Chapter 10 is one
// paragraph of 2,072 words), or at Start reading after a week away; or a
// return by the book's Continue that lands on the chapter's top.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { arrivalPlace, clearPosition, loadPosition, placeHash, placeOfHash, savePosition } from "@/lib/reader/position";
import { parsePlace } from "@/lib/saints/paragraphInView";
import { KEPT_AT, blockAt, placeIn, shiftToReadingPlace, type Span } from "@/lib/ui/readingPlace";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const code = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

describe("the place kept in a work", () => {
  let store: ReturnType<typeof storage>;
  beforeEach(() => {
    store = storage();
    vi.stubGlobal("localStorage", store);
    vi.stubGlobal("window", { localStorage: store });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("is the paragraph, not only the chapter", () => {
    savePosition("john-cassian", "conferences", 241, 0);
    savePosition("john-cassian", "conferences", 241, 3);
    expect(loadPosition("john-cassian", "conferences")).toMatchObject({ sectionN: 241, paragraph: 3 });
  });

  it("never expires: a book half read in March is still half read in May", () => {
    const march = Date.now() - 60 * 86_400_000;
    store.setItem("purify.reader.position.john-cassian/institutes", JSON.stringify({ sectionN: 157, paragraph: 2, savedAt: march }));
    expect(loadPosition("john-cassian", "institutes")).toEqual({ sectionN: 157, paragraph: 2, savedAt: march });
  });

  it("reads a place saved before 1.8's round 6, which had no paragraph, as its chapter's top", () => {
    store.setItem("purify.reader.position.john-chrysostom/homilies-on-1-corinthians", JSON.stringify({ sectionN: 6, savedAt: Date.now() }));
    expect(loadPosition("john-chrysostom", "homilies-on-1-corinthians")).toMatchObject({ sectionN: 6, paragraph: 0 });
    for (const paragraph of [-1, 2.5, "3", null]) {
      store.setItem("purify.reader.position.a/b", JSON.stringify({ sectionN: 2, paragraph, savedAt: 1 }));
      expect(loadPosition("a", "b")?.paragraph, String(paragraph)).toBe(0);
    }
  });

  it("is let go when the reader has finished the work", () => {
    savePosition("john-cassian", "conferences", 241, 3);
    clearPosition("john-cassian", "conferences");
    expect(loadPosition("john-cassian", "conferences")).toBeNull();
  });
});

describe("the place a work opens at", () => {
  const kept = { sectionN: 241, paragraph: 3 };

  it("is the paragraph an address lands on", () => {
    expect(placeOfHash("#p-157-4")).toEqual({ sectionN: 157, paragraph: 4 });
    expect(arrivalPlace(kept, placeOfHash("#p-157-4"))).toEqual({ sectionN: 157, paragraph: 4 });
  });

  it("is the reader's paragraph when the address names the chapter they are in (Continue, the reading room's row)", () => {
    expect(placeOfHash("#s241")).toEqual({ sectionN: 241, paragraph: null });
    expect(arrivalPlace(kept, placeOfHash("#s241"))).toEqual(kept);
    // Another chapter opens at its top.
    expect(arrivalPlace(kept, placeOfHash("#s242"))).toEqual({ sectionN: 242, paragraph: 0 });
  });

  it("is the kept place when the work opens with no address, and its beginning with none kept", () => {
    expect(arrivalPlace(kept, null)).toEqual(kept);
    expect(arrivalPlace(null, null)).toBeNull();
  });

  it("is reached by an address of its own, and the book's Continue uses it", () => {
    expect(placeHash(kept)).toBe("#p-241-3");
    expect(placeHash({ sectionN: 241, paragraph: 0 })).toBe("#s241");
    for (const bad of ["#s0", "#p-1", "#v3", "#at-1.1", "", "#s12x"]) expect(placeOfHash(bad), bad).toBeNull();
    expect(code("components/reading/BookHeader.tsx")).toContain("placeHash(saved)");
  });
});

describe("leave at a paragraph, come back to the same paragraph", () => {
  // A phone's band between the round buttons and the pill, and a run of
  // paragraphs of every height: one of a line, a long one, one far taller
  // than the screen (Conference 10, Chapter 10).
  const band: Span = { top: 100, bottom: 700 };
  const heights = [40, 260, 90, 1800, 60, 420];

  function tops(scroll: number) {
    const out: number[] = [];
    let y = 0;
    for (const h of heights) {
      out.push(y - scroll);
      y += h + 20;
    }
    return out;
  }

  it("reads back, at the reading line, every paragraph a return stands at the reading place", () => {
    for (let k = 0; k < heights.length; k++) {
      // Where the landing puts the page for paragraph k...
      const at0 = tops(0);
      const block = { top: at0[k], bottom: at0[k] + heights[k] };
      const scroll = shiftToReadingPlace(band, block);
      // ...and which paragraph the keeper then reads there.
      const t = tops(scroll);
      expect(blockAt(heights.length, (i) => t[i], placeIn(band, KEPT_AT)), `paragraph ${k}`).toBe(k);
    }
  });

  it("names its places the way the reader draws them", () => {
    expect(parsePlace("241:3")).toEqual({ sectionN: 241, paragraph: 3 });
    expect(parsePlace("0:3")).toBeNull();
    expect(parsePlace("p-241-3")).toBeNull();
    const row = code("components/saints/ParagraphRow.tsx");
    expect(row).toContain("data-place={`${sectionN}:${paragraphIdx}`}");
    expect(row).toContain('data-work-end={workEnd ? "" : undefined}');
  });

  it("is written by the reader's own scroll only, never by a page that moves by itself", () => {
    const reader = code("components/saints/WritingReader.tsx");
    expect(reader).toContain("watchOwnScroll(onScroll)");
    expect(reader).toContain("paragraphAtReadingPlace()");
    // The old keeper: the section most in view, on every scroll, for seven days.
    expect(reader).not.toContain("IntersectionObserver");
    expect(code("lib/reader/position.ts")).not.toMatch(/TTL_MS|7 \* 24/);
  });
});
