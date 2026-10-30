// The reading place (1.8): what a page takes the reader to stands in the
// middle of what they can see, clear of the bars at the top and the foot.
//
// The owner, on build 81, with a photo of Colossians 4 read aloud whose verse
// 7, the one being read, sat low, just over the chapter pill, the mini player
// and the tab bar: "make it a standard so that it goes to the middle of the
// user's screen rather than popping up too high or too low". The measuring
// and the arithmetic are in ../readingPlace.ts.
//
// The screen these tests stand on is a 412 x 915 phone in the apps with the
// status bar and the home indicator 24px each, read aloud playing in the
// Bible: the round buttons' row under the status bar (24 to 76), and at the
// foot the tab bar (805 to 891), the mini player above it (749 to 805) and
// the chapter pill with its running line above that (681 to 737), as
// app/globals.css stands them.

import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock("../motion", () => ({ prefersReducedMotion: () => motion.reduce }));

import {
  HAIR_PX,
  MIN_BAND_PX,
  READING_PLACE,
  SCREEN_EDGE_ATTR,
  bandOf,
  goToReadingPlace,
  inReadingZone,
  placeIn,
  readScreen,
  shiftToReadingPlace,
  spanOf,
  visibleBand,
  type Screen,
  type Span,
} from "../readingPlace";

const PHONE = 915;
const INSETS: Span = { top: 24, bottom: 24 };
const PLATES: Span = { top: 24, bottom: 76 };
const TAB_BAR: Span = { top: 805, bottom: 891 };
const MINI_PLAYER: Span = { top: 749, bottom: 805 };
const PILL: Span = { top: 681, bottom: 737 };

const BIBLE: Screen = {
  height: PHONE,
  insets: INSETS,
  edges: { top: [PLATES], bottom: [TAB_BAR, MINI_PLAYER, PILL] },
  cssFoot: 0,
};
/** Between the round buttons and the pill. */
const BAND: Span = { top: 76, bottom: 681 };

/** Where a block stands once the page has moved by `shift`. */
const moved = (block: Span, shift: number): Span => ({ top: block.top - shift, bottom: block.bottom - shift });
const middle = (s: Span) => (s.top + s.bottom) / 2;

describe("the band: what the reader can see the page through", () => {
  it("runs from under the bars at the top to over the highest piece at the foot", () => {
    expect(bandOf(BIBLE)).toEqual(BAND);
    // The order the pieces come in says nothing.
    expect(bandOf({ ...BIBLE, edges: { top: [PLATES], bottom: [PILL, TAB_BAR, MINI_PLAYER] } })).toEqual(BAND);
  });

  it("frees the room of the bars that have stepped away", () => {
    // Reading on in the Bible: the round buttons, the pill and the tab bar
    // have gone, and the mini player has come down to the foot. The status
    // bar still counts.
    const away = bandOf({ ...BIBLE, edges: { top: [], bottom: [{ top: 829, bottom: 885 }] } });
    expect(away).toEqual({ top: 24, bottom: 829 });
  });

  it("never runs past the phone's own edges, with nothing over the page", () => {
    expect(bandOf({ ...BIBLE, edges: { top: [], bottom: [] } })).toEqual({ top: 24, bottom: PHONE - 24 });
  });

  it("counts a piece only at its own edge, and only on screen", () => {
    const odd = bandOf({
      ...BIBLE,
      edges: {
        // A bar gone up off the screen, and one marked "top" in the lower half.
        top: [PLATES, { top: -60, bottom: -12 }, { top: 600, bottom: 650 }],
        // One marked "bottom" in the upper half, and one below the screen.
        bottom: [PILL, { top: 10, bottom: 60 }, { top: 930, bottom: 990 }],
      },
    });
    expect(odd).toEqual(BAND);
  });

  it("is read from the CSS variables on a page that marks nothing", () => {
    // The tab bar (86px) and the mini player (56px) by --tab-bar-h and
    // --now-playing-h, over the home indicator; the status bar at the top.
    expect(bandOf({ height: PHONE, insets: INSETS, edges: null, cssFoot: 86 + 56 })).toEqual({ top: 24, bottom: PHONE - 24 - 142 });
    // And no variables at all: the screen between the phone's edges.
    expect(bandOf({ height: PHONE, insets: INSETS, edges: null, cssFoot: 0 })).toEqual({ top: 24, bottom: PHONE - 24 });
  });

  it("is the screen between the phone's edges when the bars leave almost nothing", () => {
    // A phone on its side, 360px tall, with every bar up.
    const side = bandOf({
      height: 360,
      insets: { top: 0, bottom: 0 },
      edges: { top: [{ top: 0, bottom: 120 }], bottom: [{ top: 200, bottom: 360 }] },
      cssFoot: 0,
    });
    expect(200 - 120).toBeLessThan(MIN_BAND_PX);
    expect(side).toEqual({ top: 0, bottom: 360 });
  });

  it("puts the reading place two fifths of the way down it", () => {
    expect(READING_PLACE).toBe(0.4);
    expect(placeIn(BAND)).toBeCloseTo(76 + 0.4 * 605);
    expect(placeIn(BAND, 0.5)).toBeCloseTo(middle(BAND));
  });
});

describe("going to a place", () => {
  it("centres a short block, a verse of a few lines, in the band", () => {
    // A verse just over the pill, as in the owner's photo.
    const verse: Span = { top: 600, bottom: 672 };
    const shift = shiftToReadingPlace(BAND, verse);
    expect(middle(moved(verse, shift))).toBeCloseTo(middle(BAND));
    // Up the page; and a verse under the round buttons comes down.
    expect(shift).toBeGreaterThan(0);
    const high: Span = { top: 40, bottom: 100 };
    expect(middle(moved(high, shiftToReadingPlace(BAND, high)))).toBeCloseTo(middle(BAND));
  });

  it("stands a taller block's top at the reading place, a hair above it", () => {
    // Over a fifth of the band and no more than the room under the place.
    const range: Span = { top: 500, bottom: 760 };
    const at = moved(range, shiftToReadingPlace(BAND, range));
    expect(at.top).toBeCloseTo(placeIn(BAND) - HAIR_PX);
    expect(at.bottom).toBeLessThanOrEqual(BAND.bottom);
  });

  it("starts a block too tall for the room under the reading place a tenth of the way down", () => {
    const long: Span = { top: 300, bottom: 820 };
    const at = moved(long, shiftToReadingPlace(BAND, long));
    expect(at.top).toBeCloseTo(BAND.top + 0.1 * 605);
  });

  it("stands a line's top at the reading place when asked, short as it is", () => {
    // A prayer's first line (Begin): where the scroll lights the line, so
    // the line landed on is the one lit.
    const line: Span = { top: 700, bottom: 736 };
    const at = moved(line, shiftToReadingPlace(BAND, line, "top"));
    expect(at.top).toBeCloseTo(placeIn(BAND) - HAIR_PX);
    expect(at.top).toBeLessThan(placeIn(BAND));
  });
});

describe("read aloud's middle", () => {
  it("moves the verse being read once it sinks toward the pill, which the window's 72% did not", () => {
    // Just over the pill. The old rule kept a verse between 90px and 72% of
    // the window, and left this one there.
    const verse: Span = { top: 585, bottom: 655 };
    expect(verse.top >= 90 && verse.bottom <= PHONE * 0.72).toBe(true);
    expect(inReadingZone(BAND, verse)).toBe(false);
    // Moved to the reading place, it is in the middle and stays a while.
    expect(inReadingZone(BAND, moved(verse, shiftToReadingPlace(BAND, verse)))).toBe(true);
  });

  it("sets it higher than the window's middle, which the bars at the foot pull down", () => {
    // The old rule centred it in the window, 457.5px down this phone: 79px
    // under the middle of what can be seen.
    expect(PHONE / 2 - middle(BAND)).toBeCloseTo(79);
  });

  it("moves it when it rises under the round buttons, and leaves it alone in the middle", () => {
    expect(inReadingZone(BAND, { top: 110, bottom: 180 })).toBe(false);
    expect(inReadingZone(BAND, { top: 260, bottom: 340 })).toBe(true);
    // Down to seven tenths of the band, and no further.
    expect(inReadingZone(BAND, { top: 400, bottom: 76 + 0.7 * 605 })).toBe(true);
    expect(inReadingZone(BAND, { top: 400, bottom: 76 + 0.7 * 605 + 1 })).toBe(false);
  });
});

describe("a block made of several", () => {
  it("is the span around them all, and nothing when nothing is drawn", () => {
    expect(spanOf([{ top: 500, bottom: 540 }, { top: 520, bottom: 610 }, { top: 480, bottom: 500 }])).toEqual({ top: 480, bottom: 610 });
    expect(spanOf([{ top: 500, bottom: 540 }, { top: 0, bottom: 0 }])).toEqual({ top: 500, bottom: 540 });
    expect(spanOf([])).toBeNull();
    expect(spanOf([{ top: 0, bottom: 0 }])).toBeNull();
  });
});

// The measuring, on a stubbed window and document: what is on screen of the
// marked pieces, and the scroll that follows.

type Piece = { edge: "top" | "bottom"; rect: Span; visibility?: string; opacity?: string };

function stubScreen({
  width = 412,
  marked = [] as Piece[],
  vars = {} as Record<string, string>,
  scrollY = 2000,
  scrollHeight = 8000,
} = {}) {
  const scrolls: ScrollToOptions[] = [];
  const probe = { style: { cssText: "" }, setAttribute: () => {}, remove: () => {} };
  const root = { scrollHeight };
  const els = marked.map((m) => ({
    getAttribute: (name: string) => (name === SCREEN_EDGE_ATTR ? m.edge : null),
    getBoundingClientRect: () => ({ top: m.rect.top, bottom: m.rect.bottom, width: 412, height: m.rect.bottom - m.rect.top }),
    style: { visibility: m.visibility ?? "visible", opacity: m.opacity ?? "1" },
  }));
  vi.stubGlobal("window", {
    innerHeight: PHONE,
    innerWidth: width,
    scrollY,
    getComputedStyle: (el: unknown) => {
      if (el === probe) return { paddingTop: `${INSETS.top}px`, paddingBottom: `${INSETS.bottom}px` };
      if (el === root) return { getPropertyValue: (name: string) => vars[name] ?? "" };
      return (el as (typeof els)[number]).style;
    },
    scrollTo: (to: ScrollToOptions) => {
      scrolls.push(to);
    },
  });
  vi.stubGlobal("document", {
    querySelectorAll: (selector: string) => (selector === `[${SCREEN_EDGE_ATTR}]` ? els : []),
    createElement: () => probe,
    body: { appendChild: () => {} },
    documentElement: root,
  });
  return { scrolls };
}

/** An element of the page whose box stands at `rect`. */
const block = (rect: Span) => ({ getBoundingClientRect: () => ({ ...rect, width: 380, height: rect.bottom - rect.top }) }) as unknown as Element;

afterEach(() => {
  vi.unstubAllGlobals();
  motion.reduce = false;
});

describe("measuring the screen", () => {
  const bible: Piece[] = [
    { edge: "top", rect: PLATES },
    { edge: "bottom", rect: TAB_BAR },
    { edge: "bottom", rect: MINI_PLAYER },
    { edge: "bottom", rect: PILL },
  ];

  it("measures the marked pieces on screen, with the phone's edges", () => {
    stubScreen({ width: 401, marked: bible });
    expect(readScreen()).toEqual(BIBLE);
    expect(visibleBand()).toEqual(BAND);
  });

  it("leaves out a piece faded or stepped away, and one not drawn", () => {
    stubScreen({
      width: 402,
      marked: [
        { edge: "top", rect: PLATES, visibility: "hidden" },
        { edge: "bottom", rect: TAB_BAR, opacity: "0" },
        { edge: "bottom", rect: { top: 0, bottom: 0 } },
        { edge: "bottom", rect: MINI_PLAYER },
      ],
    });
    expect(visibleBand()).toEqual({ top: 24, bottom: MINI_PLAYER.top });
  });

  it("reads the CSS variables when the page marks nothing", () => {
    stubScreen({ width: 403, vars: { "--tab-bar-h": "86px", "--now-playing-h": "56px", "--readings-flow-h": "" } });
    expect(readScreen().edges).toBeNull();
    expect(visibleBand()).toEqual({ top: 24, bottom: PHONE - 24 - 86 - 56 });
  });

  it("scrolls a short verse to the band's middle, smoothly with motion on", () => {
    const { scrolls } = stubScreen({ width: 404, marked: bible });
    const verse: Span = { top: 600, bottom: 672 };
    const to = goToReadingPlace(block(verse));
    expect(scrolls).toHaveLength(1);
    expect(scrolls[0].behavior).toBe("smooth");
    expect(to).toBeCloseTo(2000 + middle(verse) - middle(BAND));
  });

  it("goes at once with Purify's motion setting off, or when asked to", () => {
    motion.reduce = true;
    const { scrolls } = stubScreen({ width: 405, marked: bible });
    goToReadingPlace(block({ top: 600, bottom: 672 }));
    motion.reduce = false;
    goToReadingPlace(block({ top: 600, bottom: 672 }), { smooth: false });
    expect(scrolls.map((s) => s.behavior)).toEqual(["auto", "auto"]);
  });

  it("sets several together, and stops at the page's ends", () => {
    const { scrolls } = stubScreen({ width: 406, marked: bible, scrollY: 100, scrollHeight: 1200 });
    // A range of verses running down past the foot: its top at the reading
    // place, which the page's end does not let it reach.
    goToReadingPlace([block({ top: 700, bottom: 760 }), block({ top: 760, bottom: 900 })]);
    expect(scrolls[0].top).toBe(1200 - PHONE);
    // One under the round buttons at the top of the page: the page's top.
    goToReadingPlace(block({ top: 30, bottom: 60 }));
    expect(scrolls[1].top).toBe(0);
    expect(goToReadingPlace([])).toBeNull();
  });
});

// The places that take the reader somewhere go to the reading place, and the
// bars they keep clear of are marked.

const ROOT = process.cwd();
const code = (rel: string) =>
  fs
    .readFileSync(path.join(ROOT, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/\{\s*\}/g, "");

describe("the places that go somewhere", () => {
  const SITES = {
    "components/bible/ReadAloud.tsx": /goToReadingPlace\(el, \{ band \}\)/,
    "components/bible/VerseFocusFlash.tsx": /goToReadingPlace\(flashed\)/,
    "components/prayers/PrayerRuleReader.tsx": /goToPrayer\(first\.id\)/,
    "components/prayers/mine/MyRuleReader.tsx": /goToPrayer\(id, \{ smooth: false \}\)/,
    "components/prayers/service/useLitLine.ts": /goToReadingPlace\(step\.querySelector\("\[data-line\]"\) \?\? title \?\? step, \{ smooth, align: "top" \}\)/,
  };

  it("use the shared reading place", () => {
    for (const [file, call] of Object.entries(SITES)) {
      const src = code(file);
      expect(src, file).toMatch(call);
      expect(src, file).toMatch(/from "@\/(lib\/ui\/readingPlace|components\/prayers\/service\/useLitLine)"/);
    }
  });

  it("no longer centre in the window or stand a thing at its top", () => {
    for (const file of Object.keys(SITES)) {
      const src = code(file);
      expect(src, file).not.toMatch(/scrollIntoView\([^)]*block:\s*"(center|start)"/);
      expect(src, file).not.toMatch(/innerHeight \* 0\.72/);
    }
  });

  it("light the line being prayed at the same place", () => {
    const lit = code("components/prayers/service/useLitLine.ts");
    expect(lit).toContain("const band = visibleBand();");
    expect(lit).toContain("placeIn(band, READING_PLACE + (FOOT - READING_PLACE) * nearFoot)");
    expect(lit).not.toMatch(/\bconst PLACE\b|view \* \(PLACE/);
  });

  it("follow read aloud within the band's middle, after the reader's hands-off time", () => {
    const follow = code("components/bible/ReadAloud.tsx");
    expect(follow).toMatch(/performance\.now\(\) - lastHand\.current > HANDS_OFF_MS\) \{\s*const band = visibleBand\(\);\s*if \(!inReadingZone\(band, el\.getBoundingClientRect\(\)\)\)/);
  });
});

describe("the bars a place keeps clear of", () => {
  const MARKED: [string, "top" | "bottom", number][] = [
    ["components/mobile/MobileHeader.tsx", "top", 1],
    // The page's bar, and the Bible's row of round buttons.
    ["components/nav/MobileTopBar.tsx", "top", 2],
    ["components/nav/NativeBackBar.tsx", "top", 1],
    ["components/nav/AppNav.tsx", "top", 1],
    ["components/nav/MobileTabBar.tsx", "bottom", 1],
    // The track's bar and the sound's own, one shell since the card draws
    // in to its pill (1.8, r3-05 B): the card, or the pill, is what covers.
    ["components/prayers/NowPlayingBar.tsx", "bottom", 1],
    ["components/bible/MobileChapterPill.tsx", "bottom", 1],
    ["components/flow/FlowBarShell.tsx", "bottom", 1],
    ["components/bible/MobileVerseToolbar.tsx", "bottom", 1],
  ];

  it("are marked at their edge", () => {
    for (const [file, edge, count] of MARKED) {
      const marks = code(file).match(/data-screen-edge="(top|bottom)"/g) ?? [];
      expect(marks, file).toEqual(Array(count).fill(`data-screen-edge="${edge}"`));
    }
  });

  it("are marked on what covers the page, not on a layer around it", () => {
    // The plates' row steps away while the reader reads on; the bar around
    // it keeps the strip over the status bar. The verse's tools stand in a
    // layer over the whole screen; the card is what covers the foot.
    expect(code("components/nav/MobileTopBar.tsx")).toMatch(/<div data-plates-row data-screen-edge="top"/);
    expect(code("components/bible/MobileVerseToolbar.tsx")).toMatch(/data-verse-tools=""\s+data-screen-edge="bottom"/);
  });
});
