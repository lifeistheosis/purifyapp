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
  isReturning,
  keepPlace,
  noteLinkTap,
  resetReturnPlaceForTests,
  returnToPlace,
} from "../returnPlace";

type Listener = () => void;

/** An animation on something that holds a link: whether it is under way, and when it ends (Infinity: never). */
type FakeAnimation = { playState: string; effect: { getComputedTiming: () => { endTime: number } } };

type FakeLink = {
  href: string;
  /** Distance from the top of the PAGE. The screen's top is `top - scrollY`. */
  top: number;
  drawn: boolean;
  position: string;
  parentElement: FakeLink | null;
  getAnimations?: () => FakeAnimation[];
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

  /** Something of the page that holds links: a part that may be brought in with an entrance of its own. */
  function part(): FakeLink & { animations: FakeAnimation[] } {
    const el = {
      href: "",
      top: 0,
      drawn: true,
      position: "static",
      parentElement: body,
      animations: [] as FakeAnimation[],
      getAttribute: () => null,
      closest: () => null,
      getBoundingClientRect: () => ({ top: 0 }),
      getClientRects: () => [{}],
      getAnimations: () => el.animations,
    };
    return el as unknown as FakeLink & { animations: FakeAnimation[] };
  }

  function link(href: string, top: number, { position = "static", drawn = true, within = body }: { position?: string; drawn?: boolean; within?: FakeLink } = {}): FakeLink {
    const el: FakeLink = {
      href,
      top,
      drawn,
      position,
      parentElement: within,
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
    part,
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

  it("says it is moving the page while it does, so a page with a place of its own waits", () => {
    // Orthodox History's own row (lib/history/scroll.ts) stands aside for it.
    const b = stubBrowser();
    expect(isReturning()).toBe(false);
    leaveAndComeBack(b, 3022);
    returnToPlace();
    expect(isReturning()).toBe(true);
    b.run();
    expect(isReturning()).toBe(false);
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

  // The link has to be the one that was tapped, never another that leads to
  // the same place (1.9, build 93 note 1). The owner's walk: on the First
  // Council of Nicaea's page he chose St Alexander in the Holy Fathers row,
  // opened him by the card, and came back. The row had begun again at St
  // Athanasius, so the card was gone; the page names St Alexander once more,
  // as a link deep in its account, and that link was taken for the card. The
  // page came back 3,424px down ("it just randomly places you at the
  // bottom"). These numbers are the ones measured on the export.
  it("does not take another link to the same place for the one that was tapped", () => {
    const b = stubBrowser("/councils/first-nicaea/");
    const card = b.link("/saints/alexander-of-alexandria/", 394);
    const inAccount = b.link("/saints/alexander-of-alexandria/", 3818);
    noteLinkTap({ target: card as unknown as EventTarget });
    b.goTo("/saints/alexander-of-alexandria/");
    keepPlace();
    // Back. The browser has put the page where it was, at its top, and the
    // card now opens the Father the row begins on.
    b.goTo("/councils/first-nicaea/");
    card.href = "/saints/athanasius-the-great/";
    b.state.scrollY = 0;
    expect(returnToPlace()).toBe(true);
    b.run();
    // The page is not moved at all: it is where the reader left it.
    expect(b.state.scrolls).toEqual([]);
    expect(b.state.scrollY).toBe(0);
    expect(inAccount.getBoundingClientRect().top).toBe(3818);
    // And it is let go once the watch is over.
    expect(isReturning()).toBe(false);
  });

  it("nor a link the page has gained since, to the same place", () => {
    // A shelf of what was last opened: the book tapped in the list now stands on it too, above the list.
    const b = stubBrowser("/reading/");
    b.state.scrollY = 2000;
    const inList = b.link("/saints/john-chrysostom/paschal-homily/", 2300);
    noteLinkTap({ target: inList as unknown as EventTarget });
    b.goTo("/saints/john-chrysostom/paschal-homily/");
    keepPlace();
    b.goTo("/reading/");
    const onShelf = b.link("/saints/john-chrysostom/paschal-homily/", 240);
    // The shelf's link comes first in the page.
    b.links.unshift(b.links.pop()!);
    expect(b.links[0]).toBe(onShelf);
    returnToPlace();
    b.run();
    // Two links to the book where there was one: which was tapped cannot be said, so the page stays at the reader's own number.
    expect(b.state.scrolls).toEqual([]);
    expect(b.state.scrollY).toBe(2000);
  });

  it("waits while a page that is still arriving has fewer links to that place, and takes the tapped one when all are there", () => {
    const b = stubBrowser("/community/");
    b.state.scrollY = 1000;
    const pinnedPost = b.link("/community/post/abc/", 200);
    const inFeed = b.link("/community/post/abc/", 1300);
    noteLinkTap({ target: inFeed as unknown as EventTarget });
    b.goTo("/community/post/abc/");
    keepPlace();
    // Back: the top of the page is there at once, the feed is fetched.
    b.goTo("/community/");
    b.links.length = 0;
    b.links.push(pinnedPost);
    returnToPlace();
    for (let i = 0; i < 5; i += 1) b.frame();
    // The one link that is there is not the one that was tapped, and is not treated as it.
    expect(b.state.scrolls).toEqual([]);
    // The feed arrives, taller above the post than it was.
    inFeed.top = 1750;
    b.links.push(inFeed);
    b.run();
    expect(inFeed.getBoundingClientRect().top).toBe(300);
  });

  it("still finds the tapped one when the page is as it was, the other link to the same place and all", () => {
    const b = stubBrowser("/councils/first-nicaea/");
    const card = b.link("/saints/alexander-of-alexandria/", 394);
    const inAccount = b.link("/saints/alexander-of-alexandria/", 3818);
    noteLinkTap({ target: card as unknown as EventTarget });
    b.goTo("/saints/alexander-of-alexandria/");
    keepPlace();
    // Back to a page that still shows him on the card, a little further down than it was.
    b.goTo("/councils/first-nicaea/");
    card.top += 60;
    inAccount.top += 60;
    returnToPlace();
    b.run();
    expect(card.getBoundingClientRect().top).toBe(394);
    expect(b.state.scrollY).toBe(60);
  });

  // The link has to have arrived (1.9, the sweep after build 93 note 1).
  // Prayers brings its rule in as the page opens: it rises 8px into place
  // over 600ms, held low for 460ms first, and it does so again when the page
  // comes back. Measured on the export: the reader left with the page 36px
  // down and the rule's link 330px from the top; back, the link stood at 338,
  // the page was moved 8px to meet it, the watch let go, and the rule then
  // rose to 322. The page was 8px from where it had been left.
  const entrance = (endTime: number, playState = "running"): FakeAnimation => ({ playState, effect: { getComputedTiming: () => ({ endTime }) } });

  it("does not move the page to meet a link that is still being brought in", () => {
    const b = stubBrowser("/prayers/");
    const rule = b.part();
    b.state.scrollY = 36;
    const link = b.link("/prayers/personal/", 366, { within: rule });
    noteLinkTap({ target: link as unknown as EventTarget });
    b.goTo("/prayers/personal/");
    keepPlace();
    // Back: the browser puts the page where it was, and the rule is held 8px low before it rises.
    b.goTo("/prayers/");
    link.top = 374;
    rule.animations = [entrance(1060)];
    expect(returnToPlace()).toBe(true);
    for (let i = 0; i < 60; i += 1) b.frame();
    expect(b.state.scrolls).toEqual([]);
    // It is still watched: it has not been still, it has been on its way.
    expect(isReturning()).toBe(true);
    // The rule lands, where it was when the reader left.
    link.top = 366;
    rule.animations = [];
    b.run();
    expect(b.state.scrolls).toEqual([]);
    expect(b.state.scrollY).toBe(36);
    expect(link.getBoundingClientRect().top).toBe(330);
    expect(isReturning()).toBe(false);
  });

  it("puts the page right once the link has landed, if it has landed somewhere else", () => {
    const b = stubBrowser("/prayers/");
    const rule = b.part();
    b.state.scrollY = 36;
    const link = b.link("/prayers/personal/", 366, { within: rule });
    noteLinkTap({ target: link as unknown as EventTarget });
    b.goTo("/prayers/personal/");
    keepPlace();
    b.goTo("/prayers/");
    link.top = 374;
    rule.animations = [entrance(1060)];
    returnToPlace();
    for (let i = 0; i < 40; i += 1) b.frame();
    expect(b.state.scrolls).toEqual([]);
    // It lands 120px lower than it was: something above it is taller now.
    link.top = 486;
    rule.animations = [];
    b.run();
    expect(b.state.scrolls).toEqual([120]);
    expect(link.getBoundingClientRect().top).toBe(330);
  });

  it("does not wait for a motion that never ends, nor for one that is over", () => {
    const b = stubBrowser("/saints/");
    const list = b.part();
    b.state.scrollY = 5000;
    const saint = b.link("/saints/papias-of-hierapolis/", 5300, { within: list });
    noteLinkTap({ target: saint as unknown as EventTarget });
    b.goTo("/saints/papias-of-hierapolis/");
    keepPlace();
    b.goTo("/saints/");
    saint.top -= 900;
    // A light that breathes for ever, and an entrance set into its past (a returned page's rows).
    list.animations = [entrance(Infinity), entrance(600, "finished")];
    returnToPlace();
    // At once, before the page is painted.
    expect(b.state.scrolls).toEqual([-900]);
    expect(saint.getBoundingClientRect().top).toBe(300);
  });

  it("does nothing where there is no window", () => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
    expect(returnToPlace()).toBe(false);
    expect(() => noteLinkTap({ target: null })).not.toThrow();
    expect(() => keepPlace()).not.toThrow();
  });
});
