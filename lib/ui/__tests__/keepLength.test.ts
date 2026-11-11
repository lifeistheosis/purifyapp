// What closes does not pull the page out from under the finger (1.9, the
// pre-build gate's first rule). The rule, where it was found and how it is
// made are in ../keepLength.ts.
//
// What a reader would notice if this broke: they shut an old year's box near
// the foot of What's new and its title is 204px lower than their finger (the
// gate's tap walk, 2026-11-11); they choose a filter on Chants and the row
// of filters drops 137px (a fresh reader's walk). Or, the other ways it can
// go wrong: a list filtered from a bar stuck to the top of the screen leaves
// them looking at empty ground; a page that will not give its spare length
// back; a short page that opens scrolled down because the page before it
// was long.
//
// It cannot watch a browser pull a page (vitest runs with no browser here).
// The check that does is scripts/closing-walk.mjs, on the export, at three
// sizes with a finger's touch.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HOLDER, KEEP_WATCH_MS, endKeepLength, giveBack, isKeepingLength, keptLength, noteReaderMovedPage, noteTap, readyKeepLength, resetKeepLengthForTests } from "../keepLength";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

type Fake = {
  name: string;
  /** From the top of the page. */
  top: number;
  /** As long as what is in it. */
  natural: number;
  position: string;
  boxSizing: string;
  padding: number;
  holder: boolean;
  isConnected: boolean;
  parentElement: Fake | null;
  children: Fake[];
  /** What the stylesheet's rule says of it, which is all the layout knows: nothing is ever written on the element itself. */
  style: { minHeight: string };
  closest: (selector: string) => Fake | null;
  getBoundingClientRect: () => { top: number; bottom: number; height: number };
};

/** A phone 844 tall, a page whose holder is 2400 long, and the reader at its very end (or `below` short of it). */
function stubPage(options: { after?: number; below?: number; boxSizing?: string; padding?: number; ready?: boolean } = {}) {
  const after = options.after ?? 0;
  const state = { scrollY: 0, innerHeight: 844, path: "/whats-new/", scrolledTo: [] as number[], sheets: 0 };
  const all: Fake[] = [];
  const listeners = new Map<string, Set<() => void>>();
  const frames: (() => void)[] = [];

  function make(name: string, init: Partial<Fake>, parent: Fake | null): Fake {
    const el: Fake = {
      name,
      top: 0,
      natural: 0,
      position: "static",
      boxSizing: options.boxSizing ?? "border-box",
      padding: 0,
      holder: false,
      isConnected: true,
      parentElement: parent,
      children: [],
      style: { minHeight: "" },
      closest(selector: string) {
        const names = selector.split(", ");
        if (selector === HOLDER ? el.holder : names.includes(el.name)) return el;
        return el.parentElement?.closest(selector) ?? null;
      },
      getBoundingClientRect() {
        const height = tall(el);
        return { top: el.top - state.scrollY, bottom: el.top - state.scrollY + height, height };
      },
      ...init,
    };
    parent?.children.push(el);
    all.push(el);
    return el;
  }

  /** A rule of the stylesheet: what it says is what the layout sees on everything it names. */
  const rule = (names: (el: Fake) => boolean) => ({
    style: {
      setProperty: (_: string, value: string) => {
        for (const el of all) if (names(el)) el.style.minHeight = value;
      },
      removeProperty: () => {
        for (const el of all) if (names(el)) el.style.minHeight = "";
      },
    },
  });

  /** How tall the browser draws it: what is in it, or what it has been told to keep. */
  function tall(el: Fake): number {
    const said = Number.parseFloat(el.style.minHeight);
    if (!Number.isFinite(said)) return el.natural;
    return Math.max(el.natural, el.boxSizing === "content-box" ? said + 2 * el.padding : said);
  }

  const html = make("html", {}, null);
  const body = make("body", { natural: 2400 + after }, html);
  const main = make("main", { natural: 2400, holder: true, padding: options.padding ?? 0 }, body);
  const wrapper = make("div", { natural: 2400 }, main);
  // An old year's box near the foot of the page, and its title, which is what the reader taps.
  const box = make("details", { top: 2100, natural: 260 }, wrapper);
  const title = make("summary", { top: 2100, natural: 56 }, box);

  const long = () => Math.max(tall(main) + after, tall(body));
  /** What a browser does as it lays a page out: a page is never left scrolled past its own end. */
  const layOut = () => {
    state.scrollY = Math.max(0, Math.min(state.scrollY, long() - state.innerHeight));
  };
  // How long the page is, asked each time: Object.assign would read it once.
  Object.defineProperty(html, "scrollHeight", { get: long });
  state.scrollY = long() - state.innerHeight - (options.below ?? 0);

  const observers: { observed: Fake[]; fire: () => void; disconnected: number }[] = [];
  const g = globalThis as Record<string, unknown>;
  g.window = {
    get scrollY() {
      return state.scrollY;
    },
    scrollX: 0,
    get innerHeight() {
      return state.innerHeight;
    },
    location: {
      get pathname() {
        return state.path;
      },
    },
    getComputedStyle: (el: Fake) => ({
      position: el.position,
      boxSizing: el.boxSizing,
      paddingTop: `${el.padding}px`,
      paddingBottom: `${el.padding}px`,
      borderTopWidth: "0px",
      borderBottomWidth: "0px",
    }),
    // Nothing here is ever allowed to move the page: a test fails if it is asked to.
    scrollTo: ({ top }: { top: number }) => void state.scrolledTo.push(top),
    addEventListener: (type: string, fn: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: () => void) => void listeners.get(type)?.delete(fn),
    requestAnimationFrame: (fn: () => void) => frames.push(fn),
    cancelAnimationFrame: () => {
      frames.length = 0;
    },
  };
  g.document = {
    body,
    documentElement: html,
    createElement: () => ({ setAttribute: () => {}, textContent: "", sheet: { cssRules: [rule((el) => el.holder), rule((el) => el === body)] } }),
    head: {
      appendChild: () => {
        state.sheets += 1;
      },
    },
  };
  g.ResizeObserver = class {
    private entry: (typeof observers)[number];
    constructor(fn: () => void) {
      this.entry = { observed: [], fire: fn, disconnected: 0 };
      observers.push(this.entry);
    }
    observe(el: Fake) {
      this.entry.observed.push(el);
    }
    disconnect() {
      this.entry.disconnected += 1;
      this.entry.observed = [];
    }
  };

  // As the app starts, before any tap.
  if (options.ready !== false) readyKeepLength();

  return {
    state,
    main,
    body,
    wrapper,
    box,
    title,
    make,
    observers,
    listeners,
    long,
    /** Where the title stands on the screen. */
    onScreen: () => title.top - state.scrollY,
    tap: (el: Fake = title) => noteTap({ target: el as unknown as EventTarget }),
    /** The box shuts by this much, the browser lays the page out again, and what watches is told. */
    shut: (by: number) => {
      box.natural -= by;
      wrapper.natural -= by;
      main.natural -= by;
      body.natural -= by;
      layOut();
      for (const o of observers) if (o.observed.length) o.fire();
      layOut();
    },
    /** Something ABOVE the title goes: the title, and all under it, stand higher in the page. */
    shutAbove: (by: number) => {
      title.top -= by;
      box.top -= by;
      wrapper.natural -= by;
      main.natural -= by;
      body.natural -= by;
      layOut();
      for (const o of observers) if (o.observed.length) o.fire();
      layOut();
    },
    /** The reader's own scroll, with the frame that follows it. */
    scrollBy: (by: number) => {
      state.scrollY += by;
      layOut();
      for (const fn of listeners.get("scroll") ?? []) fn();
      for (const fn of frames.splice(0)) fn();
    },
    /** The moment after a tap passes. */
    wait: () => vi.advanceTimersByTime(KEEP_WATCH_MS + 1),
    layOut,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  resetKeepLengthForTests();
});
afterEach(() => {
  vi.useRealTimers();
  const g = globalThis as Record<string, unknown>;
  delete g.window;
  delete g.document;
  delete g.ResizeObserver;
});

describe("a part that closes near the foot of a page", () => {
  it("as it was: the page grows too short, the browser takes it up, and the title goes 204px down under the finger", () => {
    const page = stubPage();
    expect(page.onScreen()).toBe(544);
    page.shut(204);
    expect(page.onScreen()).toBe(748);
  });

  it("now the page is told to keep its length as the tap lands, before anything has changed, and nothing is pulled", () => {
    const page = stubPage();
    page.tap();
    // Told at the tap: it is that long already, so nothing a reader sees has changed.
    expect(page.main.style.minHeight).toBe("2400px");
    expect(page.onScreen()).toBe(544);
    page.shut(204);
    expect(page.onScreen()).toBe(544);
    // The page was never moved by hand: there was never a pull to undo.
    expect(page.state.scrolledTo).toEqual([]);
    page.wait();
    expect(page.main.style.minHeight).toBe("2400px");
    expect(isKeepingLength()).toBe(true);
  });

  it("only as much as reaches the foot of the screen: a reader 100px short of the end may lose that 100px", () => {
    const page = stubPage({ below: 100 });
    page.tap();
    expect(page.main.style.minHeight).toBe("2300px");
    page.shut(204);
    expect(page.onScreen()).toBe(644);
    expect(page.long()).toBe(page.state.scrollY + page.state.innerHeight);
  });

  it("a box that folds shut over many frames moves nothing on any of them", () => {
    const page = stubPage({ below: 20 });
    page.tap();
    for (let i = 0; i < 12; i++) {
      page.shut(17);
      expect(page.onScreen()).toBe(564);
    }
    expect(page.main.style.minHeight).toBe("2380px");
  });

  it("where the holder's size is not counted to its border, its padding is left out of what it is told", () => {
    const page = stubPage({ boxSizing: "content-box", padding: 24 });
    page.tap();
    expect(page.main.style.minHeight).toBe("2352px");
    page.shut(204);
    expect(page.onScreen()).toBe(544);
  });

  it("a page with nothing marked as its holder keeps its length on the body", () => {
    const page = stubPage();
    page.main.holder = false;
    page.tap();
    expect(page.body.style.minHeight).toBe("2400px");
    expect(page.main.style.minHeight).toBe("");
    page.shut(204);
    expect(page.onScreen()).toBe(544);
  });

  it("a tap on the words inside a control is a tap on the control", () => {
    const page = stubPage();
    const words = page.make("span", { top: 2110, natural: 20 }, page.title);
    page.tap(words);
    page.shut(204);
    expect(page.onScreen()).toBe(544);
  });

  it("a filter chosen over a list near its foot is the same thing: the list ends sooner, and the row of filters stays", () => {
    const page = stubPage();
    const chip = page.make("button", { top: 2040, natural: 44 }, page.wrapper);
    page.tap(chip);
    page.shut(137);
    expect(chip.top - page.state.scrollY).toBe(484);
  });
});

describe("nothing is written on the page at a tap", () => {
  it("the length is said in a rule made once as the app starts, and a tap only changes what the rule says", () => {
    const page = stubPage();
    expect(page.state.sheets).toBe(1);
    readyKeepLength();
    page.tap();
    page.shut(204);
    page.wait();
    page.scrollBy(-60);
    page.tap();
    expect(page.state.sheets).toBe(1);
    expect(keptLength()).toBeGreaterThan(0);
  });

  it("which is what keeps the gate's tap walk honest: it tells a control that does nothing by the page not having changed", () => {
    // scripts/tap-walk.mjs counts every change to the page's elements after
    // a tap. A style written on the holder at every tap would be one, on
    // every control in the app, dead ones included.
    const src = read("lib/ui/keepLength.ts")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const ready = src.slice(src.indexOf("export function readyKeepLength"), src.indexOf("function say("));
    const rest = src.replace(ready, "");
    // The one thing ever added to the page is added there, and only there.
    expect(ready).toContain("document.head.appendChild(style);");
    expect(rest).not.toMatch(/appendChild|setAttribute|\.style\.|textContent|classList|dataset/);
    // And the walk does count such things, so this is not a guess.
    expect(read("scripts/tap-walk.mjs")).toMatch(/__tapwalkObserver\.observe\(document\.documentElement, \{ subtree: true, childList: true, attributes: true, characterData: true \}\)/);
  });

  it("where the stylesheet could not be made, nothing is kept and nothing is broken", () => {
    const page = stubPage({ ready: false });
    page.tap();
    expect(isKeepingLength()).toBe(false);
    page.shut(204);
    // The page does as it did before this was written.
    expect(page.onScreen()).toBe(748);
  });
});

describe("a tap that shortens nothing", () => {
  it("leaves nothing behind once its moment is over", () => {
    const page = stubPage({ below: 100 });
    page.tap();
    expect(page.main.style.minHeight).toBe("2300px");
    page.wait();
    expect(page.main.style.minHeight).toBe("");
    expect(isKeepingLength()).toBe(false);
    expect(page.listeners.get("scroll")?.size ?? 0).toBe(0);
  });

  it("at the very end of a page what is kept is the page's own length, and it goes the first time the reader scrolls up", () => {
    const page = stubPage();
    page.tap();
    page.wait();
    expect(page.main.style.minHeight).toBe("2400px");
    page.scrollBy(-30);
    page.scrollBy(-1);
    expect(page.main.style.minHeight).toBe("");
    expect(isKeepingLength()).toBe(false);
  });

  it("and a page that grew longer is not held to anything", () => {
    const page = stubPage();
    page.tap();
    page.box.natural += 300;
    page.wrapper.natural += 300;
    page.main.natural += 300;
    page.wait();
    expect(page.main.style.minHeight).toBe("");
  });
});

describe("what is left alone", () => {
  it("a thing that rides the screen: a bar of filters stuck under the top bar will not move, and the list may end sooner", () => {
    const page = stubPage();
    const bar = page.make("div", { top: 1700, natural: 56, position: "sticky" }, page.wrapper);
    const chip = page.make("button", { top: 1700, natural: 44 }, bar);
    page.tap(chip);
    expect(page.main.style.minHeight).toBe("");
    expect(isKeepingLength()).toBe(false);
  });

  it("a page that changed ABOVE the finger: the thing tapped has moved in the page, so the length is let go at once and the page does as it would have", () => {
    const page = stubPage();
    page.tap();
    expect(page.main.style.minHeight).toBe("2400px");
    page.shutAbove(204);
    expect(page.main.style.minHeight).toBe("");
    expect(isKeepingLength()).toBe(false);
    // The reader is not left looking at bare ground: the page ends where the screen does.
    expect(page.long()).toBe(page.state.scrollY + page.state.innerHeight);
  });

  it("a thing that is no longer in the page: there is nothing to keep under the finger", () => {
    const page = stubPage();
    page.tap();
    page.title.isConnected = false;
    page.shut(204);
    expect(page.main.style.minHeight).toBe("");
  });

  it("a thing already out of the page when it was tapped", () => {
    const page = stubPage();
    page.title.isConnected = false;
    page.tap();
    expect(page.main.style.minHeight).toBe("");
  });

  it("the reader's own scroll: the tap before it is over, and a length kept for nothing goes", () => {
    const page = stubPage({ below: 100 });
    page.tap();
    noteReaderMovedPage();
    expect(page.main.style.minHeight).toBe("");
    expect(isKeepingLength()).toBe(false);
  });

  it("but a length that is doing something stays through the reader's own scroll, to be given back as they go up", () => {
    const page = stubPage();
    page.tap();
    page.shut(204);
    noteReaderMovedPage();
    expect(page.main.style.minHeight).toBe("2400px");
    expect(isKeepingLength()).toBe(true);
  });

  it("a change of page: the next page is not held to the last one's length", () => {
    const page = stubPage();
    page.tap();
    page.state.path = "/discover/";
    page.shut(1500);
    expect(page.main.style.minHeight).toBe("");
    expect(isKeepingLength()).toBe(false);
  });

  it("no page at all (the server)", () => {
    const g = globalThis as Record<string, unknown>;
    delete g.window;
    delete g.document;
    expect(() => noteTap({ target: null })).not.toThrow();
    expect(() => giveBack()).not.toThrow();
    expect(() => noteReaderMovedPage()).not.toThrow();
    expect(() => endKeepLength()).not.toThrow();
  });
});

describe("the length is given back", () => {
  function kept(options: Parameters<typeof stubPage>[0] = {}) {
    const page = stubPage(options);
    page.tap();
    page.shut(204);
    page.wait();
    return page;
  }

  it("as the reader scrolls up, and only what is already below the screen", () => {
    const page = kept();
    expect(page.main.style.minHeight).toBe("2400px");
    page.scrollBy(-60);
    expect(page.main.style.minHeight).toBe("2340px");
    // The page ends where the screen does again: nothing of it was seen going.
    expect(page.long()).toBe(page.state.scrollY + page.state.innerHeight);
    page.scrollBy(-100);
    expect(page.main.style.minHeight).toBe("2240px");
  });

  it("all of it in the end, and then the page is its own length and nothing is listening", () => {
    const page = kept();
    page.scrollBy(-150);
    page.scrollBy(-150);
    // 204 was kept: the second scroll went past the page's own length.
    page.scrollBy(-10);
    expect(page.main.style.minHeight).toBe("");
    expect(isKeepingLength()).toBe(false);
    expect(page.long()).toBe(2196);
    expect(page.listeners.get("scroll")?.size ?? 0).toBe(0);
    expect(page.listeners.get("resize")?.size ?? 0).toBe(0);
  });

  it("a reader who goes to the top of the page in one go leaves nothing kept, and nothing written on the page", () => {
    const page = kept();
    page.scrollBy(-5000);
    expect(page.state.scrollY).toBe(0);
    expect(page.main.style.minHeight).toBe("");
    expect(isKeepingLength()).toBe(false);
  });

  it("never while the foot of what holds it is in sight: the website's footer is not seen to climb", () => {
    const page = kept({ after: 300 });
    expect(page.main.style.minHeight).toBe("2400px");
    // The footer is 300 tall; the holder's foot is on the screen until the reader has gone up past it.
    page.scrollBy(-200);
    expect(page.main.style.minHeight).toBe("2400px");
    page.scrollBy(-160);
    expect(page.main.style.minHeight).toBe("2340px");
  });

  it("scrolling down gives nothing back and keeps nothing more", () => {
    const page = kept();
    page.scrollBy(-80);
    const said = page.main.style.minHeight;
    page.scrollBy(80);
    expect(page.main.style.minHeight).toBe(said);
  });

  it("not while a tap's moment lasts: the page that tap is about to shorten has not shortened yet", () => {
    const page = stubPage({ below: 100 });
    page.tap();
    // The page's own hand (a chapter put back under the finger) scrolls it a little.
    page.scrollBy(-40);
    expect(page.main.style.minHeight).toBe("2300px");
  });

  it("at once when the page is long enough of itself again: what closed was opened", () => {
    const page = kept();
    page.box.natural += 300;
    page.wrapper.natural += 300;
    page.main.natural += 300;
    page.scrollBy(-1);
    expect(page.main.style.minHeight).toBe("");
    expect(isKeepingLength()).toBe(false);
  });

  it("and the next tap begins from the page as it stands", () => {
    const page = kept();
    // Blank ground at the foot, 204px of it. The reader taps the title again and the box opens.
    page.tap();
    expect(page.main.style.minHeight).toBe("2400px");
    page.box.natural += 204;
    page.wrapper.natural += 204;
    page.main.natural += 204;
    page.body.natural += 204;
    page.shut(0);
    expect(page.onScreen()).toBe(544);
  });

  it("at once when the page changes", () => {
    const page = kept();
    endKeepLength();
    expect(page.main.style.minHeight).toBe("");
    expect(isKeepingLength()).toBe(false);
    expect(page.listeners.get("scroll")?.size ?? 0).toBe(0);
  });

  it("and when what held it has gone from the page", () => {
    const page = kept();
    page.main.isConnected = false;
    page.scrollBy(-1);
    expect(isKeepingLength()).toBe(false);
  });
});

describe("the watching", () => {
  it("lasts the moment after a tap and no longer: the holder and what stands in it", () => {
    const page = stubPage();
    page.tap();
    expect(page.observers).toHaveLength(1);
    expect(page.observers[0].observed).toEqual([page.main, page.wrapper]);
    page.wait();
    expect(page.observers[0].observed).toEqual([]);
  });

  it("a new tap ends the last one's and begins its own", () => {
    const page = stubPage();
    page.tap();
    page.tap();
    expect(page.observers).toHaveLength(1);
    expect(page.observers[0].disconnected).toBe(1);
    expect(page.observers[0].observed).toEqual([page.main, page.wrapper]);
  });

  it("where there is nothing to watch with, the length is still kept: the watching is only for what changes above the finger", () => {
    const page = stubPage();
    delete (globalThis as Record<string, unknown>).ResizeObserver;
    page.tap();
    expect(page.main.style.minHeight).toBe("2400px");
  });
});

describe("the wiring", () => {
  const bridge = read("components/nav/OpenedBridge.tsx");

  it("the one mount hears every tap as it lands, before anything the tap does, and the reader's own scroll", () => {
    // Capturing, on the document: React's own handlers run after it.
    expect(bridge).toContain('document.addEventListener("click", noteTap, true);');
    // The stylesheet is made as the bridge mounts, before it listens for a tap.
    expect(bridge.indexOf("readyKeepLength();")).toBeGreaterThan(-1);
    expect(bridge.indexOf("readyKeepLength();")).toBeLessThan(bridge.indexOf('document.addEventListener("click", noteTap, true);'));
    expect(bridge).toContain('window.addEventListener("touchmove", noteReaderMovedPage, { passive: true });');
    expect(bridge).toContain('window.addEventListener("wheel", noteReaderMovedPage, { passive: true });');
    // And takes each of them off again.
    expect(bridge).toContain('document.removeEventListener("click", noteTap, true);');
    expect(bridge).toContain('window.removeEventListener("touchmove", noteReaderMovedPage);');
    expect(bridge).toContain('window.removeEventListener("wheel", noteReaderMovedPage);');
  });

  it("a change of page lets the length go before the next page is painted", () => {
    expect(bridge).toMatch(/useIsoLayoutEffect\(\(\) => \{\s*endKeepLength\(\);\s*\}, \[pathname\]\);/);
    expect(bridge).toContain('const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;');
  });

  it("the part of the page whose length is kept is the one every route is drawn in", () => {
    expect(HOLDER).toBe("[data-route-content]");
    expect(read("components/layout/AppFrame.tsx")).toContain("<main data-route-content");
    expect(read("app/page.tsx")).toContain("<div data-route-content");
  });

  it("no style of the holder's own outranks the rule: if one is ever given a min-height, the kept length would lose to it", () => {
    expect(read("components/layout/AppFrame.tsx")).not.toMatch(/<main data-route-content[^>]*(style=|min-h-)/);
    expect(read("app/page.tsx")).not.toMatch(/<div data-route-content[^>]*(style=|min-h-)/);
  });

  it("the page is never moved by hand: there is no pull to undo, so nothing here scrolls", () => {
    const src = read("lib/ui/keepLength.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(src).not.toMatch(/scrollTo|scrollBy/);
  });
});
