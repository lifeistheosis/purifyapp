// What opens shows itself: the page moves with it (1.9, build 93 note 15).
// The rule, his words and how it is made are in ../showOpened.ts.
//
// What a reader would notice if this broke: a chapter of the prayer book that
// opens and leaves the chapters after it under the tab bar (his note); a page
// thrown down the screen for something they never tapped; a title carried up
// under the bar; or a page that will not stop moving under a finger.
//
// It cannot watch a real fold (vitest runs with no browser here). The check
// that does is scripts/opened-walk.mjs, on the export.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../motion", () => ({ prefersReducedMotion: () => motionOff }));
vi.mock("../readingPlace", () => ({ visibleBand: () => band }));

import {
  BUSY_WATCH_MS,
  CATCH_UP_MS,
  CLEAR_PX,
  IN_PLACE_ATTR,
  SETTLE_MS,
  STEADY_FRAMES,
  TAP_MS,
  WATCH_MS,
  WHOLE_ATTR,
  endShowOpened,
  followIfOpened,
  isShowingOpened,
  moveFor,
  noteOpeningTap,
  noteReaderMoved,
  resetShowOpenedForTests,
  showOpened,
  stepFor,
} from "../showOpened";

/** What the two modules above answer. A phone: the page's bar ends 112px down, the tab bar begins at 806. */
let motionOff = false;
let band = { top: 112, bottom: 806 };

const FRAME_MS = 16;

type Listener = () => void;

type Fake = {
  tagName: string;
  /** From the top of the page, or of the box that holds it. */
  top: number;
  height: number;
  position: string;
  overflowY: string;
  attrs: Record<string, string>;
  open: boolean;
  isConnected: boolean;
  parentElement: Fake | null;
  /** A box that scrolls: how far it is scrolled, where it stands on the screen, how much it holds. */
  scrollTop: number;
  screenTop: number | null;
  scrollHeight: number;
  clientHeight: number;
  scrolls: number[];
  scrollBy: (to: { top: number }) => void;
  getAttribute: (name: string) => string | null;
  hasAttribute: (name: string) => boolean;
  matches: (selector: string) => boolean;
  closest: (selector: string) => Fake | null;
  getBoundingClientRect: () => { top: number; bottom: number };
};

function stubBrowser({ whole = false }: { /** A screen that sets its page on whole pixels, dropping the part of one. */ whole?: boolean } = {}) {
  const listeners = new Map<string, Set<Listener>>();
  const frames: (() => void)[] = [];
  const state = { scrollY: 0, scrolls: [] as number[] };
  const set = (to: number) => (whole ? Math.floor(to) : to);
  const ids = new Map<string, Fake>();
  const body = { tagName: "BODY", parentElement: null } as unknown as Fake;

  const win = {
    innerHeight: 844,
    get scrollY() {
      return state.scrollY;
    },
    getComputedStyle: (el: Fake) => ({ position: el.position, overflowY: el.overflowY }),
    scrollBy: ({ top }: { top: number }) => {
      state.scrolls.push(top);
      state.scrollY = set(state.scrollY + top);
    },
    requestAnimationFrame: (fn: () => void) => {
      frames.push(fn);
      return frames.length;
    },
    cancelAnimationFrame: () => {
      frames.length = 0;
    },
    addEventListener: (type: string, fn: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Listener) => {
      listeners.get(type)?.delete(fn);
    },
  };
  const doc = { body, documentElement: {}, getElementById: (id: string) => ids.get(id) ?? null };
  (globalThis as { window?: unknown }).window = win;
  (globalThis as { document?: unknown }).document = doc;

  /** The box that scrolls an element, if one holds it. */
  const boxOf = (el: Fake): Fake | null => {
    for (let node = el.parentElement; node; node = node.parentElement) if (node.screenTop !== null && node !== body) return node;
    return null;
  };

  /** Whether one simple selector of the few the helper asks about fits. */
  const fits = (el: Fake, one: string): boolean => {
    const s = one.trim();
    if (s === "summary") return el.tagName === "SUMMARY";
    if (s === "input" || s === "textarea" || s === "select") return el.tagName === s.toUpperCase();
    if (s === "[role='combobox']") return el.attrs.role === "combobox";
    if (s.startsWith("[contenteditable]")) return "contenteditable" in el.attrs && el.attrs.contenteditable !== "false";
    const attr = /^\[([a-z-]+)\]$/.exec(s);
    return attr ? attr[1] in el.attrs : false;
  };
  const fitsAny = (el: Fake, selector: string) => selector.split(",").some((one) => fits(el, one));

  function el(tagName: string, top: number, height: number, { within = body, attrs = {}, position = "static" }: { within?: Fake; attrs?: Record<string, string>; position?: string } = {}): Fake {
    const made: Fake = {
      tagName: tagName.toUpperCase(),
      top,
      height,
      position,
      overflowY: "visible",
      attrs,
      open: false,
      isConnected: true,
      parentElement: within,
      scrollTop: 0,
      screenTop: null,
      scrollHeight: 0,
      clientHeight: 0,
      scrolls: [],
      scrollBy: ({ top: by }) => {
        made.scrolls.push(by);
        made.scrollTop = set(made.scrollTop + by);
      },
      getAttribute: (name) => made.attrs[name] ?? null,
      hasAttribute: (name) => name in made.attrs,
      matches: (selector) => fitsAny(made, selector),
      closest: (selector) => {
        for (let node: Fake | null = made; node && node !== body; node = node.parentElement) if (fitsAny(node, selector)) return node;
        return null;
      },
      getBoundingClientRect: () => {
        // A box that scrolls stands where it stands on the screen.
        if (made.screenTop !== null) return { top: made.screenTop, bottom: made.screenTop + made.clientHeight };
        const box = boxOf(made);
        const from = box ? box.screenTop! - box.scrollTop : -state.scrollY;
        // Fixed to the screen: the page's scroll does not move it.
        const at = made.position === "fixed" || made.position === "sticky" ? made.top : from + made.top;
        return { top: at, bottom: at + made.height };
      },
    };
    if (attrs.id) ids.set(attrs.id, made);
    return made;
  }

  /** A sheet's own scroll: `clientHeight` of it on the screen from `screenTop`, holding `scrollHeight`. */
  function box(screenTop: number, clientHeight: number, scrollHeight: number, { position = "fixed" }: { position?: string } = {}): Fake {
    const sheet = el("div", screenTop, clientHeight, { position });
    const made = el("div", 0, clientHeight, { within: sheet });
    made.overflowY = "auto";
    made.screenTop = screenTop;
    made.clientHeight = clientHeight;
    made.scrollHeight = scrollHeight;
    return made;
  }

  /** One frame: the clock moves on, `before` changes the page (a fold opening), and what was waiting runs. */
  function frame(before?: () => void): boolean {
    vi.advanceTimersByTime(FRAME_MS);
    before?.();
    const fn = frames.shift();
    if (!fn) return false;
    fn();
    return true;
  }

  return {
    win,
    state,
    el,
    box,
    frame,
    /** Runs frames until none is waiting, and says how many ran. */
    run: (limit = 400, before?: () => void) => {
      let n = 0;
      while (n < limit && frames.length) {
        frame(before);
        n += 1;
      }
      return n;
    },
    waiting: () => frames.length,
    fire: (type: string) => {
      for (const fn of [...(listeners.get(type) ?? [])]) fn();
    },
    listening: (type: string) => listeners.get(type)?.size ?? 0,
    moved: () => state.scrolls.reduce((a, b) => a + b, 0),
  };
}

/**
 * His screen, build 93: the prayer book with every chapter shut, its second
 * chapter's title 505px down, the book ending 760px down, over the tab bar.
 * The chapter's page is 240px when it has opened.
 */
function prayerBook(b: ReturnType<typeof stubBrowser>) {
  const chapters = b.el("div", 400, 360, { attrs: { [WHOLE_ATTR]: "" } });
  const title = b.el("button", 505, 55, { within: chapters, attrs: { "aria-expanded": "false", "aria-controls": "page-2" } });
  const page = b.el("div", 560, 0, { within: chapters, attrs: { id: "page-2" } });
  /** The fold: the page and the book grow together. */
  const openTo = (height: number) => {
    const grew = height - page.height;
    page.height = height;
    chapters.height += grew;
  };
  return { chapters, title, page, openTo };
}

/**
 * Community as it was measured on the export, online (2026-11-11): a post's
 * "3 replies" 600px down the screen, and its part opened on two grey rows
 * that end in sight over the tab bar and say they are busy while the replies
 * come from the website. `on` is what says so: the grey rows' own box, as
 * Community has it, or the part itself.
 */
function replies(b: ReturnType<typeof stubBrowser>, on: "rows" | "part" = "rows") {
  const control = b.el("button", 600, 36, { attrs: { "aria-expanded": "true", "aria-controls": "replies" } });
  const part = b.el("div", 650, 96, { attrs: on === "part" ? { id: "replies", "aria-busy": "true" } : { id: "replies" } });
  const rows = b.el("div", 650, 96, { within: part, attrs: on === "rows" ? { "aria-busy": "true" } : {} });
  (part as Fake & { querySelector: (selector: string) => Fake | null }).querySelector = (selector) =>
    selector === '[aria-busy="true"]' && rows.isConnected && rows.attrs["aria-busy"] === "true" ? rows : null;
  /** The replies come: the grey rows go, and the part is as tall as they are. */
  const arrive = (height: number) => {
    rows.isConnected = false;
    delete part.attrs["aria-busy"];
    part.height = height;
  };
  return { control, part, arrive };
}

/** The helper, asked with the fakes: they are elements as far as it looks. */
function follow(part: Fake, { head, whole, tapped }: { head?: Fake; whole?: Fake; tapped?: number } = {}) {
  return showOpened(part as unknown as Element, {
    head: (head ?? null) as unknown as Element | null,
    whole: (whole ?? null) as unknown as Element | null,
    tapped: tapped ?? null,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  motionOff = false;
  band = { top: 112, bottom: 806 };
  resetShowOpenedForTests();
});

afterEach(() => {
  resetShowOpenedForTests();
  vi.useRealTimers();
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { document?: unknown }).document;
});

describe("how far the page goes for what has opened", () => {
  const bars = { roof: 112, floor: 806 };

  it("nowhere when it ends in sight, to the pixel of the room kept over the tab bar", () => {
    expect(moveFor({ top: 300, bottom: 700, ...bars })).toBe(0);
    expect(moveFor({ top: 300, bottom: 806 - CLEAR_PX, ...bars })).toBe(0);
  });

  it("as far as its end needs, when its top has the room", () => {
    expect(moveFor({ top: 505, bottom: 1000, ...bars })).toBe(1000 - (806 - CLEAR_PX));
  });

  it("never so far that its top goes under the bar at the top", () => {
    expect(moveFor({ top: 505, bottom: 2400, ...bars })).toBe(505 - (112 + CLEAR_PX));
  });

  it("nowhere when its top is at the bar already, or above it", () => {
    expect(moveFor({ top: 112 + CLEAR_PX, bottom: 2400, ...bars })).toBe(0);
    expect(moveFor({ top: 40, bottom: 2400, ...bars })).toBe(0);
  });
});

describe("how the page catches up with it", () => {
  it("all at once with the glide off", () => {
    expect(stepFor(206, FRAME_MS, false)).toBe(206);
  });

  it("a share each frame with the glide on: two thirds of the way in the time it names", () => {
    const one = stepFor(100, FRAME_MS, true);
    expect(one).toBeGreaterThan(15);
    expect(one).toBeLessThan(30);
    // From far enough off that the pixel it never goes under does not count.
    let left = 10000;
    for (let t = 0; t < CATCH_UP_MS; t += 1) left -= stepFor(left, 1, true);
    expect(left).toBeGreaterThan(3600);
    expect(left).toBeLessThan(3750);
  });

  it("never less than a pixel, so it arrives, and the last pixel and a half whole", () => {
    expect(stepFor(3, FRAME_MS, true)).toBe(1);
    expect(stepFor(1.5, FRAME_MS, true)).toBe(1.5);
    expect(stepFor(0.4, FRAME_MS, true)).toBe(0.4);
  });

  it("nothing for nothing, and a frame that took too long is not taken at its word", () => {
    expect(stepFor(0, FRAME_MS, true)).toBe(0);
    expect(stepFor(-20, FRAME_MS, true)).toBe(0);
    expect(stepFor(100, 5000, true)).toBe(stepFor(100, 50, true));
  });
});

describe("the page moves with what has opened", () => {
  it("his screen: the chapter's own page ends in sight, the book does not, and the page goes until the book's end is clear", () => {
    const b = stubBrowser();
    const book = prayerBook(b);
    follow(book.page, { head: book.title, whole: book.chapters, tapped: 505 });
    // The fold: 240px over fifteen frames.
    let open = 0;
    b.run(400, () => {
      open = Math.min(240, open + 16);
      book.openTo(open);
    });
    // The book now ends 1000px down the page; the tab bar begins at 806.
    expect(b.moved()).toBeCloseTo(1000 - (806 - CLEAR_PX), 5);
    expect(book.chapters.getBoundingClientRect().bottom).toBeCloseTo(806 - CLEAR_PX, 5);
    // And its title is still well under the bar.
    expect(book.title.getBoundingClientRect().top).toBeGreaterThan(112 + CLEAR_PX);
    expect(b.waiting()).toBe(0);
    expect(isShowingOpened()).toBe(false);
  });

  it("which is what was missing: asked only for the chapter's own page, the page stays where it was", () => {
    const b = stubBrowser();
    const book = prayerBook(b);
    follow(book.page, { head: book.title, tapped: 505 });
    let open = 0;
    b.run(400, () => {
      open = Math.min(240, open + 16);
      book.openTo(open);
    });
    // 560 + 240 = 800, and 800 is over the tab bar's 806 less the room kept: 6px to go, no more.
    expect(b.moved()).toBeCloseTo(800 - (806 - CLEAR_PX), 5);
    expect(book.chapters.getBoundingClientRect().bottom).toBeGreaterThan(806);
  });

  it("follows a fold as it opens, never ahead of it", () => {
    const b = stubBrowser();
    const book = prayerBook(b);
    follow(book.page, { head: book.title, whole: book.chapters, tapped: 505 });
    let open = 0;
    for (let i = 0; i < 40; i += 1) {
      b.frame(() => {
        open = Math.min(240, open + 16);
        book.openTo(open);
      });
      // The page has gone no further than what has opened so far needs: the
      // book's end, 400px down the page and as tall as it has grown, is never
      // carried higher than the room kept over the tab bar.
      const needs = Math.max(0, 400 + book.chapters.height - (806 - CLEAR_PX));
      expect(b.moved()).toBeLessThanOrEqual(needs + 0.001);
    }
  });

  it("drawn at once, it is a short glide that eases out: each move smaller than the last", () => {
    const b = stubBrowser();
    const book = prayerBook(b);
    book.openTo(240);
    follow(book.page, { head: book.title, whole: book.chapters, tapped: 505 });
    b.run();
    const moves = b.state.scrolls;
    expect(moves.length).toBeGreaterThan(6);
    // Down to the single pixels it finishes on, each move is smaller than the one before.
    const gliding = moves.filter((m) => m > 1.5);
    for (let i = 1; i < gliding.length; i += 1) expect(gliding[i]).toBeLessThan(gliding[i - 1]);
    expect(b.moved()).toBeCloseTo(206, 5);
  });

  it("with Purify's motion off the page is there at once, before anything is painted", () => {
    motionOff = true;
    const b = stubBrowser();
    const book = prayerBook(b);
    book.openTo(240);
    follow(book.page, { head: book.title, whole: book.chapters, tapped: 505 });
    // No frame has run.
    expect(b.state.scrolls).toEqual([206]);
    b.run();
    expect(b.state.scrolls).toEqual([206]);
  });

  it("never takes the top of what was opened off the screen", () => {
    const b = stubBrowser();
    const title = b.el("button", 505, 55);
    const page = b.el("div", 560, 1500);
    follow(page, { head: title, tapped: 505 });
    b.run();
    expect(title.getBoundingClientRect().top).toBeCloseTo(112 + CLEAR_PX, 5);
    expect(b.moved()).toBeCloseTo(505 - (112 + CLEAR_PX), 5);
  });

  it("words that go on carry their own control down the page: the place kept is where the thumb was", () => {
    const b = stubBrowser();
    // "Read more" stood 600px down; the words it opened are 900px, and it now stands after them.
    const words = b.el("div", 300, 300 + 900);
    const more = b.el("button", 1500, 44);
    follow(words, { head: more, tapped: 600 });
    b.run();
    // Not until the control reaches the bar (that would be 1,376px, the reader's place long gone),
    // and not until the words' own top does: until the place the thumb was has reached it.
    expect(b.moved()).toBeCloseTo(600 - (112 + CLEAR_PX), 5);
  });

  it("on a screen that sets its page on whole pixels, the place the thumb was still comes to rest where it was sent", () => {
    // The gate's third run, Community's "Read more": tapped 448px down, the words it opened end
    // 1,660px down. Each step of the glide is a share of what is left, so nearly every one asks
    // for a part of a pixel the screen does not give; counted as asked, the place the thumb was
    // came to rest 66px down for the 63 it was sent to, three pixels past what the gate allows.
    const b = stubBrowser({ whole: true });
    band = { top: 51, bottom: 761 };
    const words = b.el("div", 300, 1360);
    const more = b.el("button", 1667, 44);
    follow(words, { head: more, tapped: 448 });
    b.run();
    // Where the place the thumb was stands now: where it was, less how far the page has really gone.
    const place = 448 - b.state.scrollY;
    expect(place).toBeGreaterThanOrEqual(51 + CLEAR_PX - 1);
    expect(place).toBeLessThanOrEqual(51 + CLEAR_PX + 1);
  });

  it("at the foot of a page that will not go further, it is still and it is over: never asked for the whole of its time", () => {
    const b = stubBrowser();
    // The page can go 100px and no more.
    const scrollBy = b.win.scrollBy;
    b.win.scrollBy = ({ top }: { top: number }) => scrollBy({ top: Math.min(top, 100 - b.state.scrollY) });
    const title = b.el("button", 505, 55);
    const page = b.el("div", 560, 1500);
    follow(page, { head: title, tapped: 505 });
    const frames = b.run();
    expect(b.state.scrollY).toBe(100);
    // Still for its frames once the page has stopped, and let go: far short of the frames its whole time holds.
    expect(isShowingOpened()).toBe(false);
    expect(frames).toBeLessThan(WATCH_MS / FRAME_MS);
  });

  it("a part inside a sheet moves the sheet's own scroll, and the page under it stays", () => {
    const b = stubBrowser();
    // A sheet from 200 to 844, holding more than it shows once the part has opened.
    const sheet = b.box(200, 644, 1200);
    const row = b.el("button", 500, 48, { within: sheet });
    const part = b.el("div", 548, 300, { within: sheet });
    follow(part, { head: row, tapped: 700 });
    b.run();
    expect(b.state.scrolls).toEqual([]);
    // The part ended 1048px down the screen; the sheet ends at 844.
    expect(sheet.scrollTop).toBeCloseTo(1048 - (844 - CLEAR_PX), 5);
    expect(part.getBoundingClientRect().bottom).toBeCloseTo(844 - CLEAR_PX, 5);
  });

  it("a part in something fixed to the screen, with no scroll of its own, moves nothing", () => {
    const b = stubBrowser();
    const bar = b.el("div", 0, 60, { position: "fixed" });
    const menu = b.el("div", 60, 900, { within: bar });
    follow(menu, { head: b.el("button", 10, 44, { within: bar }) });
    b.run();
    expect(b.state.scrolls).toEqual([]);
    expect(b.waiting()).toBe(0);
  });

  it("something opened where the reader is not looking is not gone to", () => {
    const b = stubBrowser();
    const title = b.el("button", 2400, 55);
    const page = b.el("div", 2455, 300);
    follow(page, { head: title });
    expect(b.state.scrolls).toEqual([]);
    expect(b.waiting()).toBe(0);
    expect(isShowingOpened()).toBe(false);
  });

  it("the reader's hand ends it at once: a touch, a drag, a wheel, a key", () => {
    for (const hand of ["pointerdown", "touchstart", "touchmove", "wheel", "keydown"]) {
      const b = stubBrowser();
      const book = prayerBook(b);
      book.openTo(240);
      follow(book.page, { head: book.title, whole: book.chapters, tapped: 505 });
      b.frame();
      const sofar = b.moved();
      expect(sofar).toBeGreaterThan(0);
      expect(sofar).toBeLessThan(206);
      b.fire(hand);
      b.run();
      expect(b.moved(), hand).toBe(sofar);
      expect(b.listening(hand), hand).toBe(0);
      expect(isShowingOpened(), hand).toBe(false);
      resetShowOpenedForTests();
    }
  });

  it("it is over once it has been still, and no sooner than a late fold could begin", () => {
    const b = stubBrowser();
    const book = prayerBook(b);
    follow(book.page, { head: book.title, whole: book.chapters, tapped: 505 });
    // Nothing has opened yet, and nothing needs moving: it is still watched.
    const quiet = Math.floor(SETTLE_MS / FRAME_MS) - 1;
    for (let i = 0; i < quiet; i += 1) b.frame();
    expect(isShowingOpened()).toBe(true);
    expect(quiet).toBeGreaterThan(STEADY_FRAMES);
    // The fold begins late, and is followed all the same.
    book.openTo(240);
    b.run();
    expect(b.moved()).toBeCloseTo(206, 5);
    expect(isShowingOpened()).toBe(false);
  });

  it("and never watched longer than its time, whatever the page does", () => {
    const b = stubBrowser();
    const book = prayerBook(b);
    follow(book.page, { head: book.title, whole: book.chapters, tapped: 505 });
    // A page that never stops growing.
    let open = 0;
    const ran = b.run(1000, () => {
      open += 40;
      book.openTo(open);
    });
    expect(ran).toBeLessThanOrEqual(Math.ceil(WATCH_MS / FRAME_MS) + 1);
    expect(isShowingOpened()).toBe(false);
  });

  // A part that is still filling has not arrived (1.9, the pre-build gate,
  // 2026-11-11). The two grey rows ended in sight, the watch let go after
  // its 0.4s, and the replies then landed with their end 939px down a screen
  // whose tab bar began well above that.
  it("a part that says it is still filling is not let go for being still, and what comes is followed", () => {
    for (const on of ["rows", "part"] as const) {
      const b = stubBrowser();
      const post = replies(b, on);
      follow(post.part, { head: post.control, tapped: 600 });
      // A second and a half of grey rows, in sight, nothing to move: longer than any opening is watched.
      const waiting = Math.ceil(1500 / FRAME_MS);
      expect(waiting * FRAME_MS).toBeGreaterThan(WATCH_MS);
      for (let i = 0; i < waiting; i += 1) b.frame();
      expect(b.moved(), on).toBe(0);
      expect(isShowingOpened(), on).toBe(true);
      // The replies land, their end 939px down the screen.
      post.arrive(289);
      expect(post.part.getBoundingClientRect().bottom).toBe(939);
      b.run();
      // The page has gone with them: their end stands clear of the tab bar, and it is over.
      expect(b.moved(), on).toBeCloseTo(939 - (806 - CLEAR_PX), 5);
      expect(post.part.getBoundingClientRect().bottom, on).toBeCloseTo(806 - CLEAR_PX, 5);
      expect(isShowingOpened(), on).toBe(false);
      resetShowOpenedForTests();
    }
  });

  it("what has arrived is given an opening's own time, and no more", () => {
    const b = stubBrowser();
    const post = replies(b);
    follow(post.part, { head: post.control, tapped: 600 });
    const waiting = Math.ceil(2000 / FRAME_MS);
    for (let i = 0; i < waiting; i += 1) b.frame();
    // They arrive in sight, and a picture in them begins to unfold a moment later: it is still followed.
    post.arrive(120);
    const quiet = Math.floor(SETTLE_MS / FRAME_MS) - 2;
    for (let i = 0; i < quiet; i += 1) b.frame();
    expect(isShowingOpened()).toBe(true);
    expect(b.moved()).toBe(0);
    post.part.height = 300;
    b.frame();
    expect(b.moved()).toBeGreaterThan(0);
    // And replies that never stop growing are let go after an opening's time, counted from when they came.
    let tall = 300;
    const ran = b.run(1000, () => {
      tall += 40;
      post.part.height = tall;
    });
    expect(ran).toBeLessThanOrEqual(Math.ceil(WATCH_MS / FRAME_MS) + 1);
    expect(isShowingOpened()).toBe(false);
  });

  it("with Purify's motion off the page is with them at once when they come", () => {
    motionOff = true;
    const b = stubBrowser();
    const post = replies(b);
    follow(post.part, { head: post.control, tapped: 600 });
    for (let i = 0; i < 60; i += 1) b.frame();
    post.arrive(289);
    b.frame();
    expect(b.state.scrolls).toEqual([939 - (806 - CLEAR_PX)]);
  });

  it("it is not waited for for ever", () => {
    const b = stubBrowser();
    const post = replies(b);
    follow(post.part, { head: post.control, tapped: 600 });
    const ran = b.run(5000);
    expect(ran).toBeGreaterThan(Math.ceil(WATCH_MS / FRAME_MS) + 1);
    expect(ran).toBeLessThanOrEqual(Math.ceil(BUSY_WATCH_MS / FRAME_MS) + 1);
    expect(isShowingOpened()).toBe(false);
    // What comes after that moves nothing.
    post.arrive(289);
    b.run();
    expect(b.moved()).toBe(0);
  });

  it("the reader's hand ends the wait: replies that come late pull nobody back", () => {
    const b = stubBrowser();
    const post = replies(b);
    follow(post.part, { head: post.control, tapped: 600 });
    for (let i = 0; i < 30; i += 1) b.frame();
    expect(isShowingOpened()).toBe(true);
    b.fire("touchmove");
    expect(isShowingOpened()).toBe(false);
    post.arrive(289);
    b.run();
    expect(b.moved()).toBe(0);
  });

  it("a part taken away ends it, and a new opening ends the last", () => {
    const b = stubBrowser();
    const book = prayerBook(b);
    book.openTo(240);
    follow(book.page, { head: book.title, whole: book.chapters, tapped: 505 });
    b.frame();
    book.page.isConnected = false;
    b.run();
    expect(isShowingOpened()).toBe(false);

    const other = b.el("div", 600, 40);
    const stop = follow(other);
    expect(isShowingOpened()).toBe(true);
    follow(b.el("div", 620, 40));
    stop();
    // The first one's stop does not end the second.
    expect(isShowingOpened()).toBe(true);
    endShowOpened();
    expect(isShowingOpened()).toBe(false);
  });
});

describe("only an opening the reader has just asked for", () => {
  function opened(b: ReturnType<typeof stubBrowser>, book: ReturnType<typeof prayerBook>) {
    book.title.attrs["aria-expanded"] = "true";
    book.openTo(240);
  }

  it("a control the reader tapped, turned to open, is followed to what it names, with the thing it belongs to", () => {
    const b = stubBrowser();
    const book = prayerBook(b);
    noteOpeningTap({ target: book.title as unknown as EventTarget });
    opened(b, book);
    expect(followIfOpened(book.title as unknown as Element)).toBe(true);
    b.run();
    expect(b.moved()).toBeCloseTo(206, 5);
  });

  it("a tap on something inside the control is a tap on the control", () => {
    const b = stubBrowser();
    const book = prayerBook(b);
    const chevron = b.el("svg", 520, 17, { within: book.title });
    noteOpeningTap({ target: chevron as unknown as EventTarget });
    opened(b, book);
    expect(followIfOpened(book.title as unknown as Element)).toBe(true);
  });

  it("a <details> opened by its own <summary>", () => {
    const b = stubBrowser();
    const details = b.el("details", 700, 60);
    const summary = b.el("summary", 700, 60, { within: details });
    noteOpeningTap({ target: summary as unknown as EventTarget });
    details.open = true;
    details.height = 460;
    expect(followIfOpened(details as unknown as Element)).toBe(true);
    b.run();
    // It ended 1160px down; the tab bar begins at 806.
    expect(b.moved()).toBeCloseTo(1160 - (806 - CLEAR_PX), 5);
  });

  it("nothing a page opens on its own: no tap, no move", () => {
    const b = stubBrowser();
    const book = prayerBook(b);
    opened(b, book);
    expect(followIfOpened(book.title as unknown as Element)).toBe(false);
    expect(b.state.scrolls).toEqual([]);
    expect(isShowingOpened()).toBe(false);
  });

  it("not a control other than the one tapped, and not for a tap on anything else", () => {
    const b = stubBrowser();
    const book = prayerBook(b);
    const other = b.el("button", 300, 55, { attrs: { "aria-expanded": "false", "aria-controls": "page-2" } });
    noteOpeningTap({ target: other as unknown as EventTarget });
    opened(b, book);
    expect(followIfOpened(book.title as unknown as Element)).toBe(false);

    noteOpeningTap({ target: book.title as unknown as EventTarget });
    noteOpeningTap({ target: b.el("a", 100, 44) as unknown as EventTarget });
    expect(followIfOpened(book.title as unknown as Element)).toBe(false);
  });

  it("not once the tap is old, and not once the reader has moved the page themselves", () => {
    const b = stubBrowser();
    const book = prayerBook(b);
    noteOpeningTap({ target: book.title as unknown as EventTarget });
    vi.advanceTimersByTime(TAP_MS + 1);
    opened(b, book);
    expect(followIfOpened(book.title as unknown as Element)).toBe(false);

    noteOpeningTap({ target: book.title as unknown as EventTarget });
    noteReaderMoved();
    expect(followIfOpened(book.title as unknown as Element)).toBe(false);
  });

  it("not a control that has shut, and one tap opens one thing", () => {
    const b = stubBrowser();
    const book = prayerBook(b);
    noteOpeningTap({ target: book.title as unknown as EventTarget });
    // Still shut.
    expect(followIfOpened(book.title as unknown as Element)).toBe(false);
    opened(b, book);
    expect(followIfOpened(book.title as unknown as Element)).toBe(true);
    endShowOpened();
    // The same tap is not used twice.
    expect(followIfOpened(book.title as unknown as Element)).toBe(false);
  });

  it("not a control that names nothing: it has to say what it opens", () => {
    const b = stubBrowser();
    const row = b.el("button", 505, 55, { attrs: { "aria-expanded": "false" } });
    noteOpeningTap({ target: row as unknown as EventTarget });
    row.attrs["aria-expanded"] = "true";
    expect(followIfOpened(row as unknown as Element)).toBe(false);
  });

  it("not a field the reader types in, and not a part that asks to open in place", () => {
    const b = stubBrowser();
    const field = b.el("input", 505, 44, { attrs: { role: "combobox", "aria-expanded": "false", "aria-controls": "list" } });
    b.el("div", 549, 600, { attrs: { id: "list" } });
    noteOpeningTap({ target: field as unknown as EventTarget });
    field.attrs["aria-expanded"] = "true";
    expect(followIfOpened(field as unknown as Element)).toBe(false);

    const book = prayerBook(b);
    book.chapters.attrs[IN_PLACE_ATTR] = "";
    noteOpeningTap({ target: book.title as unknown as EventTarget });
    opened(b, book);
    expect(followIfOpened(book.title as unknown as Element)).toBe(false);
    expect(b.state.scrolls).toEqual([]);
  });
});
