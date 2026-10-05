// Going back puts the tapped link where the reader's thumb was, whatever the
// page's height has become. The measurements that asked for this are in
// ../returnPlace.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SETTLE_FRAMES,
  STEADY_FRAMES,
  TAP_MS,
  WATCH_FRAMES,
  endReturn,
  keepPlace,
  noteLinkTap,
  resetReturnPlaceForTests,
  returnToPlace,
} from "../returnPlace";

type Listener = () => void;

type FakeLink = {
  href: string;
  /** Distance from the top of the PAGE. The screen's top is `top - scrollY`. */
  top: number;
  drawn: boolean;
  position: string;
  parentElement: FakeLink | null;
  getAttribute: (name: string) => string | null;
  closest: (selector: string) => FakeLink | null;
  getBoundingClientRect: () => { top: number };
  getClientRects: () => unknown[];
};

function stubBrowser(pathname = "/saints/", search = "") {
  const listeners = new Map<string, Set<Listener>>();
  const frames: (() => void)[] = [];
  const state = { scrollY: 0, scrolls: [] as number[] };
  const links: FakeLink[] = [];
  const body = {} as FakeLink;

  const win = {
    location: { pathname, search },
    getComputedStyle: (el: FakeLink) => ({ position: el.position }),
    scrollBy: ({ top }: { top: number }) => {
      state.scrolls.push(top);
      state.scrollY += top;
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
  const doc = { links, body };
  (globalThis as { window?: unknown }).window = win;
  (globalThis as { document?: unknown }).document = doc;

  function link(href: string, top: number, { position = "static", drawn = true } = {}): FakeLink {
    const el: FakeLink = {
      href,
      top,
      drawn,
      position,
      parentElement: body,
      getAttribute: (name) => (name === "href" ? el.href : null),
      closest: () => el,
      getBoundingClientRect: () => ({ top: el.top - state.scrollY }),
      getClientRects: () => (el.drawn ? [{}] : []),
    };
    links.push(el);
    return el;
  }

  return {
    win,
    state,
    links,
    link,
    /** Runs one frame. False when nothing was waiting. */
    frame: () => {
      const fn = frames.shift();
      if (!fn) return false;
      fn();
      return true;
    },
    /** Runs frames until none is waiting, and says how many ran. */
    run: (limit = 1000) => {
      let n = 0;
      while (n < limit && frames.length) {
        frames.shift()!();
        n += 1;
      }
      return n;
    },
    waiting: () => frames.length,
    fire: (type: string) => {
      for (const fn of [...(listeners.get(type) ?? [])]) fn();
    },
    listening: (type: string) => listeners.get(type)?.size ?? 0,
    goTo: (p: string, s = "") => {
      win.location.pathname = p;
      win.location.search = s;
    },
  };
}

describe("going back returns the reader to the link they tapped", () => {
  beforeEach(() => {
    // The clock too: a tap is made old by moving it (the same clock
    // scrollReset.test.ts moves for a stale popstate).
    vi.useFakeTimers();
    resetReturnPlaceForTests();
  });

  afterEach(() => {
    resetReturnPlaceForTests();
    vi.useRealTimers();
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
  });

  /** Tap a saint 300px down the screen, open it, and come back to a shorter list. */
  function leaveAndComeBack(b: ReturnType<typeof stubBrowser>, shorterBy: number) {
    b.state.scrollY = 12805;
    const saint = b.link("/saints/papias-of-hierapolis/", 13105);
    noteLinkTap({ target: saint as unknown as EventTarget });
    b.goTo("/saints/papias-of-hierapolis/");
    keepPlace();
    // The list is put back with placeholders above the saint: it is shorter
    // there, and the browser restores the same scroll number.
    b.goTo("/saints/");
    saint.top -= shorterBy;
    return saint;
  }

  it("moves the page until the tapped link is where the thumb left it", () => {
    const b = stubBrowser();
    const saint = leaveAndComeBack(b, 3022);
    expect(saint.getBoundingClientRect().top).toBe(-2722);
    expect(returnToPlace()).toBe(true);
    // Before a single frame: it is corrected in the commit, ahead of the paint.
    expect(b.state.scrolls).toEqual([-3022]);
    expect(saint.getBoundingClientRect().top).toBe(300);
  });

  it("keeps correcting while the cards around it take their real heights", () => {
    const b = stubBrowser();
    const saint = leaveAndComeBack(b, 3022);
    returnToPlace();
    // The card above the saint is drawn and turns out 82px taller.
    saint.top += 82;
    b.frame();
    expect(saint.getBoundingClientRect().top).toBe(300);
    expect(b.state.scrolls).toEqual([-3022, 82]);
  });

  it("stays through the browser putting its own number back a few frames late", () => {
    const b = stubBrowser();
    const saint = leaveAndComeBack(b, 3022);
    returnToPlace();
    for (let i = 0; i < STEADY_FRAMES + 2; i++) b.frame();
    // Still watching: steady, but not yet past the settling frames.
    expect(b.waiting()).toBe(1);
    b.state.scrollY = 12805;
    b.frame();
    expect(saint.getBoundingClientRect().top).toBe(300);
  });

  it("lets go once the link has sat still, and leaves nothing behind", () => {
    const b = stubBrowser();
    leaveAndComeBack(b, 3022);
    returnToPlace();
    const ran = b.run();
    expect(ran).toBeGreaterThanOrEqual(SETTLE_FRAMES - 1);
    expect(ran).toBeLessThan(WATCH_FRAMES);
    expect(b.waiting()).toBe(0);
    for (const type of ["touchstart", "wheel", "keydown", "pointerdown"]) {
      expect(b.listening(type)).toBe(0);
    }
  });

  it("waits for a list that is fetched after the page arrives", () => {
    const b = stubBrowser("/community/");
    b.state.scrollY = 4000;
    const post = b.link("/saints/john-chrysostom/", 4300);
    noteLinkTap({ target: post as unknown as EventTarget });
    b.goTo("/saints/john-chrysostom/");
    keepPlace();
    b.goTo("/community/");
    // Back: the feed is not there yet.
    post.drawn = false;
    expect(returnToPlace()).toBe(true);
    for (let i = 0; i < 40; i++) b.frame();
    expect(b.state.scrolls).toEqual([]);
    // It arrives, 900px lower than it was.
    post.drawn = true;
    post.top += 900;
    b.frame();
    expect(post.getBoundingClientRect().top).toBe(300);
  });

  it("gives up on a link that never comes back", () => {
    const b = stubBrowser();
    const saint = leaveAndComeBack(b, 0);
    saint.drawn = false;
    returnToPlace();
    expect(b.run()).toBe(WATCH_FRAMES - 1);
    expect(b.state.scrolls).toEqual([]);
    expect(b.listening("touchstart")).toBe(0);
  });

  it("stops the moment the reader takes the page in hand", () => {
    const b = stubBrowser();
    const saint = leaveAndComeBack(b, 3022);
    returnToPlace();
    b.fire("touchstart");
    saint.top += 500;
    expect(b.frame()).toBe(false);
    expect(b.state.scrolls).toEqual([-3022]);
    expect(b.listening("wheel")).toBe(0);
  });

  it("has nothing to do on a page that was not left by a link", () => {
    const b = stubBrowser();
    b.link("/saints/papias-of-hierapolis/", 13105);
    expect(returnToPlace()).toBe(false);
    expect(b.state.scrolls).toEqual([]);
    expect(b.listening("touchstart")).toBe(0);
  });

  it("uses a place once: a second visit back is the browser's", () => {
    const b = stubBrowser();
    leaveAndComeBack(b, 3022);
    expect(returnToPlace()).toBe(true);
    endReturn();
    expect(returnToPlace()).toBe(false);
  });

  it("does not take a link in a bar, a sheet or a menu for the page's place", () => {
    const b = stubBrowser();
    b.state.scrollY = 5000;
    const tab = b.link("/bible/", 5780, { position: "fixed" });
    noteLinkTap({ target: tab as unknown as EventTarget });
    b.goTo("/bible/");
    keepPlace();
    b.goTo("/saints/");
    expect(returnToPlace()).toBe(false);
  });

  it("a tap on a bar forgets the link tapped before it", () => {
    const b = stubBrowser();
    b.state.scrollY = 5000;
    const saint = b.link("/saints/papias-of-hierapolis/", 5300);
    const tab = b.link("/bible/", 5780, { position: "sticky" });
    noteLinkTap({ target: saint as unknown as EventTarget });
    noteLinkTap({ target: tab as unknown as EventTarget });
    b.goTo("/bible/");
    keepPlace();
    b.goTo("/saints/");
    expect(returnToPlace()).toBe(false);
  });

  it("ignores a link to a place on the same page and a link out of the app", () => {
    const b = stubBrowser();
    for (const href of ["#v11", "https://example.org/", "mailto:someone@example.org", "tel:+15550100"]) {
      const a = b.link(href, 700);
      noteLinkTap({ target: a as unknown as EventTarget });
      b.goTo("/somewhere/");
      keepPlace();
      b.goTo("/saints/");
      expect(returnToPlace(), href).toBe(false);
    }
  });

  it("does not credit an old tap with a navigation it did not cause", () => {
    const b = stubBrowser();
    b.state.scrollY = 5000;
    const saint = b.link("/saints/papias-of-hierapolis/", 5300);
    noteLinkTap({ target: saint as unknown as EventTarget });
    vi.advanceTimersByTime(TAP_MS + 1);
    b.goTo("/bible/");
    keepPlace();
    b.goTo("/saints/");
    expect(returnToPlace()).toBe(false);
  });

  it("keeps a filtered list's place apart from the whole list's", () => {
    const b = stubBrowser("/shop/category/all/", "?sort=new");
    b.state.scrollY = 2000;
    const piece = b.link("/shop/icons/detail?slug=x", 2300);
    noteLinkTap({ target: piece as unknown as EventTarget });
    b.goTo("/shop/icons/detail/", "?slug=x");
    keepPlace();
    // Back to the same page under another query: not the page that was left.
    b.goTo("/shop/category/all/");
    expect(returnToPlace()).toBe(false);
    b.goTo("/shop/category/all/", "?sort=new");
    piece.top += 400;
    expect(returnToPlace()).toBe(true);
    expect(piece.getBoundingClientRect().top).toBe(300);
  });

  it("picks the same one of two links to the same page", () => {
    const b = stubBrowser();
    b.state.scrollY = 9000;
    const featured = b.link("/saints/theotokos/", 500);
    const inList = b.link("/saints/theotokos/", 9300);
    noteLinkTap({ target: inList as unknown as EventTarget });
    b.goTo("/saints/theotokos/");
    keepPlace();
    b.goTo("/saints/");
    inList.top -= 1000;
    returnToPlace();
    expect(inList.getBoundingClientRect().top).toBe(300);
    expect(featured.getBoundingClientRect().top).not.toBe(300);
  });

  it("does nothing where there is no window", () => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
    expect(returnToPlace()).toBe(false);
    expect(() => noteLinkTap({ target: null })).not.toThrow();
    expect(() => keepPlace()).not.toThrow();
  });
});
