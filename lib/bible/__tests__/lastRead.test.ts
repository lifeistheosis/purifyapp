// The Bible's place: where the tab opens, and what is kept as a chapter
// opens (1.8, the owner's pick A of r3-20, "Straight into the book", and his
// note 68 of 2026-10-31, "the Bible forgets the verse a reader stopped at").
//
// What a reader would notice if this broke: the Bible tab opening on the
// list of books again, or on John 1 for a reader part way through Romans; a
// return to John 3 at its top after reading down to verse 14; or a return
// that lands on verse 16 and is kept as 13, so each one walks back.
//
// The scrolls themselves are lib/ui/__tests__/ownScroll.test.ts, and the
// line a place is read at lib/ui/__tests__/readingPlace.test.ts; the two are
// put together with this file's rules in "leave at 14, come back at 14".

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { IDLE_HAND, handAfter, scrollBy, type Hand } from "@/lib/ui/ownScroll";
import { KEPT_AT, blockAt, placeIn, shiftToReadingPlace, type Span } from "@/lib/ui/readingPlace";

import { allChapterParams, getBook } from "../books";
import {
  FIRST_PLACE,
  FIRST_PLACE_HREF,
  alreadyAtPlace,
  arrivalVerse,
  bibleTabHref,
  placeHref,
  readLastRead,
  subscribeLastRead,
  verseOfHash,
  writeLastRead,
} from "../lastRead";

describe("the Bible tab's target", () => {
  it("opens John 1 for a reader who has read nothing yet", () => {
    expect(bibleTabHref(null)).toBe("/bible/john/1");
    expect(FIRST_PLACE_HREF).toBe("/bible/john/1");
    expect(FIRST_PLACE).toEqual({ book: "john", chapter: 1, verse: 1 });
    // A chapter the apps carry.
    expect(getBook("john")?.testament).toBe("NT");
    expect(allChapterParams()).toContainEqual({ book: "john", chapter: "1" });
  });

  it("opens the chapter the reader left, at the verse", () => {
    expect(bibleTabHref({ book: "john", chapter: 3, verse: 14 })).toBe("/bible/john/3#v14");
    expect(bibleTabHref({ book: "1-samuel", chapter: 17, verse: 45 })).toBe("/bible/1-samuel/17#v45");
  });

  it("opens the chapter at its top when the reader had not moved down it", () => {
    for (const verse of [1, 0, Number.NaN, 2.5]) {
      expect(bibleTabHref({ book: "romans", chapter: 8, verse }), String(verse)).toBe("/bible/romans/8");
    }
  });

  it("never lets the device's storage name another screen or another site", () => {
    for (const bad of [
      { book: "", chapter: 3, verse: 1 },
      { book: "../account", chapter: 3, verse: 1 },
      { book: "/example.org", chapter: 3, verse: 1 },
      { book: "John", chapter: 3, verse: 1 },
      { book: "john", chapter: 0, verse: 1 },
      { book: "john", chapter: 2.5, verse: 1 },
      { book: "john", chapter: Number.NaN, verse: 1 },
    ]) {
      expect(placeHref(bad), JSON.stringify(bad)).toBeNull();
      expect(bibleTabHref(bad), JSON.stringify(bad)).toBe("/bible/john/1");
    }
  });

  it("goes nowhere when tapped in the chapter it would open, and from anywhere else it goes", () => {
    // The apps' addresses end in a slash; the target never does.
    expect(alreadyAtPlace("/bible/john/3/", "/bible/john/3#v14")).toBe(true);
    expect(alreadyAtPlace("/bible/john/3", "/bible/john/3#v14")).toBe(true);
    expect(alreadyAtPlace("/bible/john/1/", "/bible/john/1")).toBe(true);
    for (const from of ["/", "/bible/", "/bible", "/plans/", "/journal/", "/bible/john/30/", "/bible/1-john/3/", "/bible/multi/"]) {
      expect(alreadyAtPlace(from, "/bible/john/3#v14"), from).toBe(false);
    }
  });
});

describe("the verse an address lands on", () => {
  it("reads the forms a chapter lands on", () => {
    expect(verseOfHash("#v16")).toBe(16);
    // A range, as the search writes "James 2:14-26": its first verse.
    expect(verseOfHash("#v14-26")).toBe(14);
  });

  it("reads nothing else", () => {
    for (const hash of ["", "#", "#v", "#v0", "#vx", "#intro-source-1", "#v16x", "v16"]) {
      expect(verseOfHash(hash), hash).toBeNull();
    }
  });
});

describe("the verse kept as a chapter opens (note 68)", () => {
  const JOHN_3 = { book: "john", chapter: 3 };

  it("keeps the verse an address lands on, whatever the place said", () => {
    expect(arrivalVerse({ book: "john", chapter: 3, verse: 13 }, JOHN_3, 16)).toBe(16);
    expect(arrivalVerse(null, JOHN_3, 16)).toBe(16);
  });

  it("keeps the reader's verse when the chapter opened is the one they were in", () => {
    // Come back to by the way back, with no verse in the address.
    expect(arrivalVerse({ book: "john", chapter: 3, verse: 14 }, JOHN_3, null)).toBe(14);
  });

  it("keeps any other chapter from its top", () => {
    expect(arrivalVerse({ book: "john", chapter: 2, verse: 14 }, JOHN_3, null)).toBe(1);
    expect(arrivalVerse({ book: "1-john", chapter: 3, verse: 14 }, JOHN_3, null)).toBe(1);
    expect(arrivalVerse(null, JOHN_3, null)).toBe(1);
  });
});

// John 3 on a phone, as components/bible/ReadingProgressBar.tsx keeps its
// place: kept as the chapter opens (arrivalVerse), then moved only by the
// reader's own scroll (lib/ui/ownScroll.ts), to the verse over the reading
// line (lib/ui/readingPlace.ts). The page moves by `shift` from its top.
describe("leave at 14, come back at 14; land on 16, keep 16", () => {
  /** Between the round buttons and the pill of a 412 x 915 phone. */
  const BAND: Span = { top: 76, bottom: 681 };
  /** John 3's 36 verses, one to four lines each, 8px apart, from 700px down the page. */
  const VERSES: Span[] = [];
  for (let i = 0, y = 700; i < 36; i++) {
    const h = [72, 108, 36, 144][i % 4];
    VERSES.push({ top: y, bottom: y + h });
    y += h + 8;
  }
  const verseAt = (shift: number) => blockAt(VERSES.length, (i) => VERSES[i].top - shift, placeIn(BAND, KEPT_AT)) + 1;
  /** Where verse n is set when a link lands on it. */
  const landOn = (n: number) => shiftToReadingPlace(BAND, VERSES[n - 1]);

  /** One visit to the chapter: the hand, the page and the place kept. */
  function open(prev: { book: string; chapter: number; verse: number } | null, hash: string) {
    let hand: Hand = IDLE_HAND;
    let now = 1000;
    let place = arrivalVerse(prev, { book: "john", chapter: 3 }, verseOfHash(hash));
    const page = {
      get place() {
        return place;
      },
      /** The page moved to `shift`: by the reader's finger or not. */
      scrollTo(shift: number) {
        now += 16;
        const next = scrollBy(hand, now);
        hand = next.hand;
        if (next.own) place = verseAt(shift);
      },
      touch(down: boolean) {
        hand = handAfter(hand, { type: down ? "touchstart" : "touchend" });
      },
    };
    return page;
  }

  it("keeps the verse the reader read down to when they leave by any tap, and the tab opens there", () => {
    const first = open(null, "");
    expect(first.place).toBe(1);
    // Read down with a finger, stopping a little past verse 14's place.
    first.touch(true);
    for (const shift of [200, 600, 1000, landOn(14) + 9]) first.scrollTo(shift);
    first.touch(false);
    expect(first.place).toBe(14);
    // A tap on Today: the page jumps to its top as the next screen comes.
    first.touch(true);
    first.touch(false);
    first.scrollTo(0);
    expect(first.place).toBe(14);

    // The Bible tab, then the chapter it opens.
    const tab = bibleTabHref({ book: "john", chapter: 3, verse: first.place });
    expect(tab).toBe("/bible/john/3#v14");
    const back = open({ book: "john", chapter: 3, verse: 14 }, tab.slice(tab.indexOf("#")));
    expect(back.place).toBe(14);
    // The landing glides there by itself: nothing moves the place.
    for (const shift of [0, landOn(14) / 2, landOn(14)]) back.scrollTo(shift);
    expect(back.place).toBe(14);
    // And a nudge of the reader's own there reads the same verse.
    back.touch(true);
    back.scrollTo(landOn(14) + 4);
    back.touch(false);
    expect(back.place).toBe(14);
  });

  it("keeps verse 16 when a return lands on it, and on the next return too", () => {
    let visit = open({ book: "john", chapter: 3, verse: 13 }, "#v16");
    expect(visit.place).toBe(16);
    for (let round = 0; round < 3; round++) {
      visit.scrollTo(landOn(16));
      visit.touch(true);
      visit.scrollTo(landOn(16) + 2);
      visit.touch(false);
      expect(visit.place, `return ${round + 1}`).toBe(16);
      visit = open({ book: "john", chapter: 3, verse: visit.place }, `#v${visit.place}`);
    }
  });
});

describe("the chapter keeps its place by these rules, and says the same verse over its pill", () => {
  const root = join(__dirname, "..", "..", "..");
  /** A file's code without its notes. */
  const code = (path: string) =>
    readFileSync(join(root, path), "utf8")
      .replace(/\r\n/g, "\n")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
  const bar = code("components/bible/ReadingProgressBar.tsx");

  it("keeps the chapter as it opens, by its address and the place already kept", () => {
    expect(bar).toContain("write(arrivalVerse(readLastRead(), { book: slug, chapter }, verseOfHash(window.location.hash)));");
  });

  it("moves it on the reader's own scroll only, to the verse over the reading line", () => {
    expect(bar).toContain("const stop = watchOwnScroll(onScroll);");
    expect(bar).toContain("const verse = ownSinceFrame ? verseAtReadingPlace() : null;");
    // Build 85's topmost verse under the bar, read on every scroll: gone.
    expect(bar).not.toContain("NAV_OFFSET");
    expect(bar).not.toMatch(/addEventListener\("scroll"/);
    // A waiting write lands as the chapter goes, and nothing is read from it then.
    expect(bar).toMatch(/document\.removeEventListener\("visibilitychange", onHide\);\s*flush\(\);/);
  });

  it("reads that verse one way, for the place and for the running line over the pill", () => {
    const helper = code("lib/bible/verseInView.ts");
    expect(helper).toContain("const line = placeIn(visibleBand(), KEPT_AT);");
    expect(helper).toContain("blockAt(verses.length, (i) => verses[i].getBoundingClientRect().top, line)");
    const status = code("components/bible/ChapterVerseStatus.tsx");
    expect(status).toContain("const n = verseAtReadingPlace();");
    expect(status).not.toContain("rootMargin");
    for (const file of [bar, status]) expect(file).toContain('from "@/lib/bible/verseInView"');
  });
});

describe("the pointer on the device", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubStorage() {
    const store = new Map<string, string>();
    const listeners = new Map<string, Set<(e: unknown) => void>>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener: (type: string, fn: (e: unknown) => void) => listeners.get(type)?.delete(fn),
    });
    return { store, fire: (type: string, e: unknown) => listeners.get(type)?.forEach((fn) => fn(e)) };
  }

  it("reads back what was written, and tells the tab", () => {
    stubStorage();
    const told = vi.fn();
    const stop = subscribeLastRead(told);
    writeLastRead({ book: "john", bookName: "John", chapter: 3, verse: 14, totalVerses: 36, ts: 1 });
    expect(told).toHaveBeenCalledTimes(1);
    expect(readLastRead()).toEqual({ book: "john", bookName: "John", chapter: 3, verse: 14, totalVerses: 36, ts: 1 });
    expect(bibleTabHref(readLastRead())).toBe("/bible/john/3#v14");
    stop();
    writeLastRead({ book: "john", bookName: "John", chapter: 4, verse: 1, totalVerses: 54, ts: 2 });
    expect(told).toHaveBeenCalledTimes(1);
  });

  it("hears a write from another window of the website, and only to its own key", () => {
    const { fire } = stubStorage();
    const told = vi.fn();
    const stop = subscribeLastRead(told);
    fire("storage", { key: "purify:bible:last" });
    fire("storage", { key: "purify:bookmarks" });
    expect(told).toHaveBeenCalledTimes(1);
    stop();
  });
});
