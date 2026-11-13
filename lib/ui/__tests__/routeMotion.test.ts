// Every page switch moves (1.9, build 89 note 4; the standard is in
// CLAUDE.md). This holds the rules in lib/ui/routeMotion.ts and the wiring
// that calls them, since nothing else would say so if a piece went missing:
// a page would simply change at once again, which is the fault this was
// built to end.
//
// What a reader would notice if this broke: a card that opens its page with
// no transition; a chevron that leaves a page frozen; a tab bar that slides
// with the page; or, worst, a step back that is never taken.
//
// It cannot watch a transition (vitest runs with no browser here). The check
// that does is scripts/route-motion.mjs, on the export.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CARRIED,
  CARRIED_COVER,
  OVER,
  OVER_ATTR,
  ENTRANCE_MS,
  NOTE_MS,
  RETURN_HOLD_MS,
  SETTLE_MS,
  arrived,
  beginNav,
  canMove,
  carryIn,
  dropReturn,
  endNav,
  isReturning,
  kindOf,
  liftFrom,
  noteNav,
  quietEntrance,
  resetRouteMotionForTests,
  returnBy,
  samePage,
  setDown,
  standBeside,
  takeNav,
  untilSettled,
} from "../routeMotion";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

type Held = { update: () => unknown; skipped: boolean; finish: () => void; fail: () => void };

/** A document that has View Transitions, and says what was asked of it. */
function stubDocument(options: { motion?: string; transitions?: boolean; throws?: boolean } = {}) {
  const style = new Map<string, string>();
  const dataset: Record<string, string> = {};
  if (options.motion) dataset.motion = options.motion;
  const started: Held[] = [];
  const fades = [{ dataset: {} as Record<string, string> }, { dataset: { carried: "forward" } as Record<string, string> }];
  const doc: Record<string, unknown> = {
    documentElement: {
      dataset,
      style: {
        setProperty: (name: string, value: string) => void style.set(name, value),
        removeProperty: (name: string) => void style.delete(name),
      },
    },
    querySelectorAll: (selector: string) => (selector === ".route-fade" ? fades : []),
  };
  if (options.transitions !== false) {
    doc.startViewTransition = (update: () => unknown) => {
      if (options.throws) throw new Error("no transition now");
      let finish: () => void = () => {};
      let fail: () => void = () => {};
      const finished = new Promise<void>((resolve, reject) => {
        finish = resolve;
        fail = () => reject(new Error("skipped"));
      });
      const held: Held = { update, skipped: false, finish, fail };
      started.push(held);
      return {
        finished,
        ready: Promise.resolve(),
        skipTransition: () => {
          held.skipped = true;
        },
      };
    };
  }
  (globalThis as { document?: unknown }).document = doc;
  return { style, dataset, started, fades };
}

describe("which way a route change goes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRouteMotionForTests();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("two pages under the same page, at the same depth, stand side by side", () => {
    expect(standBeside("/bible/john/3", "/bible/john/4")).toBe(true);
    expect(standBeside("/saints/basil-the-great", "/saints/anthony-the-great")).toBe(true);
    expect(standBeside("/theology/doctrine", "/theology/creed")).toBe(true);
    // The export's trailing slash changes nothing.
    expect(standBeside("/bible/john/3/", "/bible/john/4")).toBe(true);
  });

  it("a page and the page it opens do not, and neither do two sections", () => {
    expect(standBeside("/saints", "/saints/basil-the-great")).toBe(false);
    expect(standBeside("/prayers", "/prayers/hours")).toBe(false);
    expect(standBeside("/bible/john/3", "/bible/mark/3")).toBe(false);
    // The first level is the tab bar's to say: a link from one section to
    // another inside a page goes somewhere.
    expect(standBeside("/prayers", "/bible")).toBe(false);
    expect(standBeside("/", "/discover")).toBe(false);
  });

  it("knows the same page through the export's trailing slash", () => {
    expect(samePage("/saints/", "/saints")).toBe(true);
    expect(samePage("/", "")).toBe(true);
    expect(samePage("/saints", "/saints/basil-the-great")).toBe(false);
  });

  it("with nothing said, the two addresses say: forward, or across", () => {
    expect(takeNav("/prayers", "/prayers/hours")).toBe("forward");
    expect(takeNav("/bible/john/3", "/bible/john/4")).toBe("swap");
  });

  it("what was said of a change is used once, and not after its time", () => {
    noteNav("back");
    expect(takeNav("/prayers/hours", "/prayers")).toBe("back");
    // Taken: the next change is its own.
    expect(takeNav("/prayers", "/prayers/hours")).toBe("forward");

    // A popstate for a #hash commits no route. Its note must not be worn by
    // the next real page.
    noteNav("traverse");
    vi.advanceTimersByTime(NOTE_MS + 1);
    expect(takeNav("/prayers", "/prayers/hours")).toBe("forward");
  });

  it("the tab bar's tap says the tabs stand side by side", () => {
    const src = read("lib/ui/routeTransition.ts");
    const body = src.slice(src.indexOf("export function beginRouteExit"), src.indexOf("export function endRouteExit"));
    expect(body).toContain('noteNav("swap");');
  });
});

describe("whether a page switch can be pictured", () => {
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
    resetRouteMotionForTests();
  });

  it("not on the server, not without View Transitions, not when motion is reduced", () => {
    expect(canMove()).toBe(false);
    stubDocument({ transitions: false });
    expect(canMove()).toBe(false);
    stubDocument({ motion: "reduce" });
    expect(canMove()).toBe(false);
    stubDocument({ motion: "full" });
    expect(canMove()).toBe(true);
  });
});

describe("a step back", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRouteMotionForTests();
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as { document?: unknown }).document;
    resetRouteMotionForTests();
  });

  it("is taken plainly, once, where it cannot be pictured", () => {
    const step = vi.fn();
    returnBy(step); // no document at all
    stubDocument({ motion: "reduce" });
    returnBy(step);
    stubDocument({ transitions: false });
    returnBy(step);
    expect(step).toHaveBeenCalledTimes(3);
    expect(isReturning()).toBe(false);
  });

  it("is taken inside the transition, after the page being left has been pictured", async () => {
    const { started, style } = stubDocument({ motion: "full" });
    const step = vi.fn();
    returnBy(step);
    expect(started).toHaveLength(1);
    // Not yet: the browser pictures the page first, then runs the update.
    expect(step).not.toHaveBeenCalled();
    expect(isReturning()).toBe(true);
    expect(style.get("view-transition-class")).toBe("nav-back");

    const held = started[0].update() as Promise<void>;
    expect(step).toHaveBeenCalledTimes(1);

    // The page behind commits: the picture is let go, never skipped.
    let released = false;
    void held.then(() => {
      released = true;
    });
    expect(arrived()).toBe(true);
    await Promise.resolve();
    expect(released).toBe(true);
    expect(started[0].skipped).toBe(false);

    // The transition ends: the page is itself again.
    started[0].finish();
    await vi.runAllTimersAsync();
    expect(isReturning()).toBe(false);
    expect(style.has("view-transition-class")).toBe(false);
    expect(step).toHaveBeenCalledTimes(1);
  });

  it("lets the page go when nothing is behind it, without cross-fading the page with itself", async () => {
    const { started } = stubDocument({ motion: "full" });
    const step = vi.fn();
    returnBy(step);
    const held = started[0].update() as Promise<void>;
    let released = false;
    void held.then(() => {
      released = true;
    });
    vi.advanceTimersByTime(RETURN_HOLD_MS - 1);
    await Promise.resolve();
    expect(released).toBe(false);
    vi.advanceTimersByTime(2);
    await Promise.resolve();
    expect(started[0].skipped).toBe(true);
    expect(released).toBe(true);
  });

  it("drops the picture at once when the step closed a sheet and brought no page", async () => {
    const { started } = stubDocument({ motion: "full" });
    returnBy(() => {});
    const held = started[0].update() as Promise<void>;
    let released = false;
    void held.then(() => {
      released = true;
    });
    dropReturn();
    await Promise.resolve();
    expect(started[0].skipped).toBe(true);
    expect(released).toBe(true);
  });

  it("is still taken when the browser refuses the transition, or never runs its update", async () => {
    stubDocument({ motion: "full", throws: true });
    const refused = vi.fn();
    returnBy(refused);
    expect(refused).toHaveBeenCalledTimes(1);
    expect(isReturning()).toBe(false);

    const { started } = stubDocument({ motion: "full" });
    const never = vi.fn();
    returnBy(never);
    // The transition ends without its update having been called.
    started[0].fail();
    await vi.runAllTimersAsync();
    expect(never).toHaveBeenCalledTimes(1);
    expect(isReturning()).toBe(false);
  });

  it("a second step while one is held is taken plainly, not stacked", () => {
    const { started } = stubDocument({ motion: "full" });
    returnBy(() => {});
    const second = vi.fn();
    returnBy(second);
    expect(second).toHaveBeenCalledTimes(1);
    expect(started).toHaveLength(1);
  });

  it("no route arriving outside a step back is taken for one", () => {
    stubDocument({ motion: "full" });
    expect(arrived()).toBe(false);
  });
});

describe("what the page is told while it changes", () => {
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
    resetRouteMotionForTests();
  });

  it("is named, so React keeps it in the picture, and classed with the way it moves", () => {
    const { style } = stubDocument({ motion: "full" });
    beginNav("forward");
    expect(style.get("view-transition-name")).toBe("root");
    expect(style.get("view-transition-class")).toBe("nav-forward");
    beginNav("swap");
    expect(style.get("view-transition-class")).toBe("nav-swap");
    endNav();
    expect(style.size).toBe(0);
  });

  it("a step back that is still held keeps what it was given", () => {
    const { style } = stubDocument({ motion: "full" });
    returnBy(() => {});
    endNav();
    expect(style.get("view-transition-class")).toBe("nav-back");
  });

  // A book takes a returning reader down to the paragraph they left
  // (components/saints/useWorkPlace.ts, useLanding). It asks this first, so
  // the page goes there after it has arrived, and not while the book's cover
  // is still travelling to its head.
  it("says how long until the page now arriving has arrived, and nothing when none is", () => {
    vi.useFakeTimers();
    try {
      stubDocument({ motion: "full" });
      expect(untilSettled()).toBe(0);
      beginNav("forward");
      expect(untilSettled()).toBe(SETTLE_MS);
      vi.advanceTimersByTime(200);
      expect(untilSettled()).toBe(SETTLE_MS - 200);
      vi.advanceTimersByTime(SETTLE_MS);
      expect(untilSettled()).toBe(0);
      // A step back is put back where it was left; nothing waits on it.
      returnBy(() => {});
      expect(untilSettled()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("never by an attribute the stylesheet matches: taken off early, it restarts the animation in flight", () => {
    const src = read("lib/ui/routeMotion.ts").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).not.toMatch(/dataset\.nav\b/);
    expect(read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/\[data-nav/);
  });

  it("the route's own fade is told how its page arrived, every wrapper, every time", () => {
    const { fades } = stubDocument({ motion: "full" });
    quietEntrance("back");
    expect(fades.map((f) => f.dataset.carried)).toEqual(["back", "back"]);
    quietEntrance("forward");
    expect(fades.map((f) => f.dataset.carried)).toEqual(["forward", "forward"]);
  });

  it("a page that has returned has its own entrances taken to their end, and only those", () => {
    // Prayers, back: its picture (1.1s), its verse (0.8s after 0.28s) and its
    // rule (0.6s after 0.46s) had each begun again. Beside them, a light that
    // breathes without end and a ring that fills for a minute, which are not
    // the page arriving.
    const { fades } = stubDocument({ motion: "full" });
    const finished: string[] = [];
    const one = (name: string, endTime: number, iterations = 1) => ({
      effect: { getComputedTiming: () => ({ endTime, iterations }) },
      finish: () => void finished.push(name),
    });
    const asked: unknown[] = [];
    const page = fades[0] as unknown as { getAnimations: (o: unknown) => unknown[] };
    page.getAnimations = (options) => {
      asked.push(options);
      return [one("picture", 1100), one("verse", 1080), one("rule", 1060), one("breathes", Infinity, Infinity), one("a minute", 60000), one("just in time", ENTRANCE_MS)];
    };
    quietEntrance("back");
    expect(finished).toEqual(["picture", "verse", "rule", "just in time"]);
    // Everything in the page, not the wrapper alone.
    expect(asked).toEqual([{ subtree: true }]);
  });

  it("a page that arrived by going forward keeps its entrances: they are how it arrives", () => {
    const { fades } = stubDocument({ motion: "full" });
    const finished: string[] = [];
    (fades[0] as unknown as { getAnimations: () => unknown[] }).getAnimations = () => [
      { effect: { getComputedTiming: () => ({ endTime: 600, iterations: 1 }) }, finish: () => void finished.push("rule") },
    ];
    quietEntrance("forward");
    quietEntrance("swap");
    expect(finished).toEqual([]);
  });

  it("an entrance that will not be finished is left, and the page is still told it returned", () => {
    const { fades } = stubDocument({ motion: "full" });
    (fades[0] as unknown as { getAnimations: () => unknown[] }).getAnimations = () => [
      { effect: { getComputedTiming: () => ({ endTime: 600, iterations: 1 }) }, finish: () => { throw new Error("no end"); } },
    ];
    (fades[1] as unknown as { getAnimations: () => unknown[] }).getAnimations = () => { throw new Error("not here"); };
    expect(() => quietEntrance("back")).not.toThrow();
    expect(fades.map((f) => f.dataset.carried)).toEqual(["back", "back"]);
  });
});

// ── A picture that leads to its own page ─────────────────────────────

type Fake = {
  kind: string;
  attrs: Record<string, string>;
  dataset: Record<string, string>;
  names: Map<string, string>;
  style: { setProperty: (n: string, v: string) => void; removeProperty: (n: string) => void };
  parentElement: Fake | null;
  children: Fake[];
  finished: string[];
  animations: { name: string; iterations: number }[];
  getAttribute: (n: string) => string | null;
  querySelector: (sel: string) => Fake | null;
  closest: (sel: string) => Fake | null;
  getAnimations: () => { effect: { getComputedTiming: () => { iterations: number } }; finish: () => void }[];
};

function fake(kind: string, attrs: Record<string, string> = {}, children: Fake[] = []): Fake {
  const names = new Map<string, string>();
  const el: Fake = {
    kind,
    attrs,
    dataset: {},
    names,
    style: { setProperty: (n, v) => void names.set(n, v), removeProperty: (n) => void names.delete(n) },
    parentElement: null,
    children,
    finished: [],
    animations: [],
    getAttribute: (n) => attrs[n] ?? null,
    querySelector: (sel) => {
      const want = sel === "[data-carry]" ? "data-carry" : null;
      const walk = (node: Fake): Fake | null => {
        for (const child of node.children) {
          if (want && want in child.attrs) return child;
          const deeper = walk(child);
          if (deeper) return deeper;
        }
        return null;
      };
      return walk(el);
    },
    closest: (sel) => {
      for (let node: Fake | null = el; node; node = node.parentElement) {
        if (sel === "a[href]" && node.kind === "a" && "href" in node.attrs) return node;
      }
      return null;
    },
    getAnimations: () =>
      el.animations.map((a) => ({
        effect: { getComputedTiming: () => ({ iterations: a.iterations }) },
        finish: () => void el.finished.push(a.name),
      })),
  };
  // data-carry and data-carry-into are read from the dataset, as the browser gives them.
  if ("data-carry" in attrs) el.dataset.carry = attrs["data-carry"];
  if ("data-carry-into" in attrs) el.dataset.carryInto = attrs["data-carry-into"];
  for (const child of children) child.parentElement = el;
  return el;
}

/** A page: what a selector finds on it, on a document that has View Transitions. */
function stage(nodes: Fake[], options: { motion?: string } = {}) {
  const base = stubDocument({ motion: options.motion ?? "full" });
  const all: Fake[] = [];
  const collect = (node: Fake) => {
    all.push(node);
    node.children.forEach(collect);
  };
  nodes.forEach(collect);
  const doc = (globalThis as unknown as { document: Record<string, unknown> }).document;
  doc.body = {};
  doc.querySelectorAll = (selector: string) => {
    if (selector === "a[href]") return all.filter((n) => n.kind === "a" && "href" in n.attrs);
    if (selector === "[data-carry-into]") return all.filter((n) => "data-carry-into" in n.attrs);
    return [];
  };
  return base;
}

/** Wears a travelling picture's name: the one every picture wears, or a cover's own. */
const wears = (el: Fake) => [CARRIED, CARRIED_COVER].includes(el.names.get("view-transition-name") ?? "");

describe("a picture that leads to its own page", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRouteMotionForTests();
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { window?: unknown }).window;
    resetRouteMotionForTests();
  });

  it("is lifted at the tap, so it is in the picture of the page being left", () => {
    const picture = fake("span", { "data-carry": "/icons/basil.jpg" });
    const words = fake("span");
    const card = fake("a", { href: "/saints/basil-the-great/" }, [picture, words]);
    stage([card]);
    // The tap lands on the words: the link's picture is the one that travels.
    liftFrom(words as unknown as EventTarget);
    expect(wears(picture)).toBe(true);
  });

  it("is not lifted from a link with no picture, from another site's, or where nothing moves", () => {
    const plain = fake("a", { href: "/saints/" }, [fake("span")]);
    const away = fake("a", { href: "https://example.org/" }, [fake("span", { "data-carry": "x" })]);
    stage([plain, away]);
    liftFrom(plain.children[0] as unknown as EventTarget);
    liftFrom(away.children[0] as unknown as EventTarget);
    expect(wears(away.children[0])).toBe(false);

    const picture = fake("span", { "data-carry": "x" });
    stage([fake("a", { href: "/saints/x/" }, [picture])], { motion: "reduce" });
    liftFrom(picture as unknown as EventTarget);
    expect(wears(picture)).toBe(false);
  });

  it("only one picture wears the name at a time, and a tap that goes nowhere leaves none", () => {
    const first = fake("span", { "data-carry": "a" });
    const second = fake("span", { "data-carry": "b" });
    stage([fake("a", { href: "/saints/a/" }, [first]), fake("a", { href: "/saints/b/" }, [second])]);
    liftFrom(first as unknown as EventTarget);
    liftFrom(second as unknown as EventTarget);
    expect([wears(first), wears(second)]).toEqual([false, true]);
    vi.advanceTimersByTime(NOTE_MS + 1);
    expect(wears(second)).toBe(false);
  });

  it("goes into the picture with its own key, before a head that takes whatever comes", () => {
    const picture = fake("span", { "data-carry": "/icons/hours/ninth.jpg" });
    const tile = fake("a", { href: "/prayers/hours/" }, [picture]);
    stage([tile]);
    liftFrom(picture as unknown as EventTarget);

    // The page arrives: three rows, each with its icon, and a head that takes any.
    const head = fake("div", { "data-carry-into": "" });
    const sixth = fake("span", { "data-carry-into": "/icons/hours/sixth.jpg" });
    const ninth = fake("span", { "data-carry-into": "/icons/hours/ninth.jpg" });
    stage([head, sixth, ninth]);
    carryIn("/prayers/hours");
    expect([wears(head), wears(sixth), wears(ninth)]).toEqual([false, false, true]);
    // What it lands in is marked, so nothing in it fades in under it.
    expect(ninth.dataset.carriedIn).toBe("");
    // The card's picture still wears the name it was pictured with.
    expect(wears(picture)).toBe(true);
  });

  it("goes into a head that takes whatever comes when nothing has its key", () => {
    const picture = fake("span", { "data-carry": "/icons/rule.jpg" });
    stage([fake("a", { href: "/prayers/personal/" }, [picture])]);
    liftFrom(picture as unknown as EventTarget);
    const head = fake("div", { "data-carry-into": "" });
    stage([head, fake("span", { "data-carry-into": "/icons/other.jpg" })]);
    carryIn("/prayers/personal/");
    expect(wears(head)).toBe(true);
  });

  it("with nowhere to go it names nothing on the new page, and leaves with its own", () => {
    const picture = fake("span", { "data-carry": "x" });
    stage([fake("a", { href: "/prayers/hours/" }, [picture])]);
    liftFrom(picture as unknown as EventTarget);
    const other = fake("span", { "data-carry-into": "y" });
    stage([other]);
    carryIn("/prayers/hours/");
    expect(wears(other)).toBe(false);
  });

  it("is set down when the page that arrives is not the one it was lifted for", () => {
    const picture = fake("span", { "data-carry": "x" });
    stage([fake("a", { href: "/prayers/hours/" }, [picture])]);
    liftFrom(picture as unknown as EventTarget);
    const head = fake("div", { "data-carry-into": "" });
    stage([head]);
    carryIn("/discover/");
    expect([wears(picture), wears(head)]).toEqual([false, false]);
  });

  it("what it lands in is already there: each one-shot entrance above it is taken to its end", () => {
    const picture = fake("span", { "data-carry": "x" });
    stage([fake("a", { href: "/saints/x/" }, [picture])]);
    liftFrom(picture as unknown as EventTarget);
    const taker = fake("img", { "data-carry-into": "x" });
    const hero = fake("div", {}, [taker]);
    const row = fake("div", {}, [hero]);
    taker.animations = [{ name: "img-in", iterations: 1 }];
    hero.animations = [{ name: "saint-icon-in", iterations: 1 }];
    row.animations = [{ name: "cascade-in", iterations: 1 }, { name: "shimmer", iterations: Infinity }];
    stage([row]);
    carryIn("/saints/x/");
    expect(taker.finished).toEqual(["img-in"]);
    expect(hero.finished).toEqual(["saint-icon-in"]);
    // An animation with no end is left running.
    expect(row.finished).toEqual(["cascade-in"]);
  });

  it("goes back into the card it came out of: the same link, the nth with that address", async () => {
    // Two cards for the same saint; the second was tapped.
    const firstPicture = fake("span", { "data-carry": "/icons/basil.jpg" });
    const secondPicture = fake("span", { "data-carry": "/icons/basil.jpg" });
    const list = [fake("a", { href: "/saints/basil/" }, [firstPicture]), fake("a", { href: "/saints/basil/" }, [secondPicture])];
    stage(list);
    liftFrom(secondPicture as unknown as EventTarget);
    const head = fake("img", { "data-carry-into": "/icons/basil.jpg" });
    stage([head]);
    carryIn("/saints/basil/");
    endNav();
    expect(wears(head)).toBe(false);

    // The chevron, on the saint's page.
    const { started } = stage([head]);
    (globalThis as { window?: unknown }).window = { location: { pathname: "/saints/basil/" } };
    returnBy(() => {});
    // Before the page being left is pictured, its head wears the name.
    expect(wears(head)).toBe(true);
    void started[0].update();

    // The list commits.
    stage(list);
    expect(arrived()).toBe(true);
    expect([wears(firstPicture), wears(secondPicture)]).toEqual([false, true]);

    // The transition ends: every name is given back.
    started[0].finish();
    await vi.runAllTimersAsync();
    expect([wears(head), wears(secondPicture)]).toEqual([false, false]);
    expect(secondPicture.dataset.carriedIn).toBeUndefined();
    // P10 (1.9): the card that took its picture back keeps a mark of it, and stays seen. The reading
    // room's covers wait unseen for their pictures, and a tile is shown at once while its cover travels
    // back into it; given the name back, one whose picture the phone had dropped from memory went unseen
    // again for a moment after the cover had landed. The card nothing landed on keeps no mark.
    expect(secondPicture.dataset.landed).toBe("");
    expect("landed" in firstPicture.dataset).toBe(false);
  });

  // A book read on, and then left: its cover is far up the page. The browser
  // pictures a named picture wherever it stands, and the cover came down into
  // its tile from beyond the top of the screen (the film, 2026-11-10).
  it("a head the reader has scrolled away from is not flown back in from off the screen", () => {
    const picture = fake("div", { "data-carry": "cover:Confessions" });
    const list = [fake("a", { href: "/saints/augustine-of-hippo/confessions/" }, [picture])];
    const head = fake("div", { "data-carry-into": "cover:Confessions" }) as Fake & { getBoundingClientRect?: () => { top: number; bottom: number } };
    const open = () => {
      stage(list);
      liftFrom(picture as unknown as EventTarget);
      stage([head]);
      carryIn("/saints/augustine-of-hippo/confessions/");
      endNav();
      stage([head]);
      (globalThis as { window?: unknown }).window = { location: { pathname: "/saints/augustine-of-hippo/confessions/" }, innerHeight: 844 };
    };

    // Scrolled 1,200px past it: nothing is lifted, and nothing is carried back.
    open();
    head.getBoundingClientRect = () => ({ top: -1360, bottom: -1120 });
    returnBy(() => {});
    expect(wears(head)).toBe(false);
    stage(list);
    expect(arrived()).toBe(true);
    expect(wears(picture)).toBe(false);
    resetRouteMotionForTests();

    // Its foot still on the screen: it goes back into its tile.
    open();
    head.getBoundingClientRect = () => ({ top: -200, bottom: 40 });
    returnBy(() => {});
    expect(wears(head)).toBe(true);
    resetRouteMotionForTests();

    // And one below the screen is no more in sight than one above it.
    open();
    head.getBoundingClientRect = () => ({ top: 900, bottom: 1140 });
    returnBy(() => {});
    expect(wears(head)).toBe(false);
  });

  it("the card it goes back into is drawn for the change, where a long list had left it undrawn", async () => {
    const picture = fake("span", { "data-carry": "/icons/arsenius.jpg" });
    const link = fake("a", { href: "/saints/arsenius/" }, [picture]);
    const card = fake("li", {}, [link]);
    const list = fake("ul", {}, [card]);
    stage([list]);
    liftFrom(picture as unknown as EventTarget);
    const head = fake("img", { "data-carry-into": "/icons/arsenius.jpg" });
    stage([head]);
    carryIn("/saints/arsenius/");
    endNav();

    const { started } = stage([head]);
    (globalThis as { window?: unknown }).window = { location: { pathname: "/saints/arsenius/" } };
    returnBy(() => {});
    void started[0].update();
    stage([list]);
    // The list's rule: a card is drawn once it is near the screen.
    (globalThis as { getComputedStyle?: unknown }).getComputedStyle = (el: Fake) => ({ contentVisibility: el === card ? "auto" : "visible" });
    try {
      expect(arrived()).toBe(true);
      expect(card.names.get("content-visibility")).toBe("visible");
      expect(list.names.has("content-visibility")).toBe(false);
      // After the change the card is the list's own again.
      started[0].finish();
      await vi.runAllTimersAsync();
      expect(card.names.has("content-visibility")).toBe(false);
    } finally {
      delete (globalThis as { getComputedStyle?: unknown }).getComputedStyle;
    }
  });

  it("a step back from a page no picture was carried into lifts nothing", () => {
    const head = fake("img", { "data-carry-into": "" });
    stage([head]);
    (globalThis as { window?: unknown }).window = { location: { pathname: "/saints/basil/" } };
    returnBy(() => {});
    expect(wears(head)).toBe(false);
  });

  // What stands on a picture in its card (1.9, P6). A tile's shade, name and
  // line are drawn over its picture, and the travelling picture is drawn over
  // the page: the Akathists tile's picture came back bare, with no shade and
  // no name on it, and the words stood on it again only when the change was
  // over, all at once (the film, 2026-11-11).
  function tile() {
    const picture = fake("span", { "data-carry": "/prayers/icons/akathist.jpg" });
    const shade = fake("span", { [OVER_ATTR]: "" });
    const name = fake("h3", { [OVER_ATTR]: "" });
    const line = fake("p", { [OVER_ATTR]: "" });
    const ring = fake("span");
    const card = fake("a", { href: "/prayers/akathists/" }, [picture, shade, name, line, ring]);
    return { picture, shade, name, line, ring, card };
  }
  const named = (el: Fake) => el.names.get("view-transition-name") ?? null;

  it("what stands on the picture in its card is pictured apart while the picture is lifted, in the order it stands", () => {
    const t = tile();
    stage([t.card]);
    liftFrom(t.name as unknown as EventTarget);
    expect(wears(t.picture)).toBe(true);
    expect([named(t.shade), named(t.name), named(t.line)]).toEqual([...OVER]);
    // Only what says it stands on the picture: the tile's ring stays in the page's picture.
    expect(named(t.ring)).toBeNull();
    // And whatever wears the name says so in a mark of its own.
    expect(t.picture.dataset.carrying).toBe("");
    expect("carrying" in t.shade.dataset).toBe(false);
    // All of it is given back with the picture's name.
    setDown();
    expect([named(t.picture), named(t.shade), named(t.name), named(t.line)]).toEqual([null, null, null, null]);
    expect("carrying" in t.picture.dataset).toBe(false);
  });

  it("and again when the picture comes back into its card, which is where it was missed", async () => {
    const t = tile();
    stage([t.card]);
    liftFrom(t.picture as unknown as EventTarget);
    const head = fake("img", { "data-carry-into": "/prayers/icons/akathist.jpg" });
    stage([head]);
    carryIn("/prayers/akathists/");
    endNav();
    expect([named(t.shade), named(t.name), named(t.line)]).toEqual([null, null, null]);

    const { started } = stage([head]);
    (globalThis as { window?: unknown }).window = { location: { pathname: "/prayers/akathists/" } };
    returnBy(() => {});
    void started[0].update();
    stage([t.card]);
    expect(arrived()).toBe(true);
    // The page behind is in place, and is about to be pictured: the picture wears the name, and its words theirs.
    expect(wears(t.picture)).toBe(true);
    expect([named(t.shade), named(t.name), named(t.line)]).toEqual([...OVER]);
    started[0].finish();
    await vi.runAllTimersAsync();
    expect([named(t.picture), named(t.shade), named(t.name), named(t.line)]).toEqual([null, null, null, null]);
  });

  it("a tile with only a name gives out one name, and nothing wears a fourth", () => {
    const picture = fake("span", { "data-carry": "/covers/john.v1.jpg" });
    const name = fake("h3", { [OVER_ATTR]: "" });
    stage([fake("a", { href: "/florilegium/begin/prologue/" }, [picture, name])]);
    liftFrom(picture as unknown as EventTarget);
    expect(named(name)).toBe(OVER[0]);
    setDown();

    const many = [0, 1, 2, 3, 4].map(() => fake("span", { [OVER_ATTR]: "" }));
    const other = fake("span", { "data-carry": "/x.jpg" });
    stage([fake("a", { href: "/x/" }, [other, ...many])]);
    liftFrom(other as unknown as EventTarget);
    expect(many.map(named)).toEqual([...OVER, null, null]);
    expect(new Set(OVER).size).toBe(OVER.length);
  });

  it("the tiles say what stands on their pictures, and the stylesheet brings it in as the picture lands", () => {
    const tiles = read("components/mobile/SoftTiles.tsx");
    const pictureTile = tiles.slice(tiles.indexOf("export function PictureTile("), tiles.indexOf("export function FeatureBand("));
    // The shade, the name and the line: three, which is as many names as there are.
    expect(pictureTile.match(/data-carry-over=""/g) ?? []).toHaveLength(OVER.length);
    expect(pictureTile).toContain('<span aria-hidden data-carry-over="" className="tile-shade absolute inset-0 rounded-[inherit]" />');
    expect(pictureTile).toMatch(/<Heading data-carry-over="" className="tile-name /);
    expect(pictureTile).toMatch(/<p data-carry-over="" className=\{cn\("tile-line /);
    // Beside the picture, in the same card: that is where the helper looks.
    expect(pictureTile.indexOf("data-carry={picture}")).toBeLessThan(pictureTile.indexOf('data-carry-over=""'));
    // A starter's tile on the Florilegium: its name, and whichever line stands under it.
    const hub = read("components/florilegium/FlorilegiaHub.tsx");
    expect(hub).toMatch(/<h3 data-carry-over="" className="relative font-serif/);
    expect(hub.match(/<p data-carry-over="" className="relative mt-1/g) ?? []).toHaveLength(2);

    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const each = (side: string) => OVER.map((name) => `::view-transition-${side}(${name}):only-child`).join(",\n");
    const out = css.indexOf(`${each("old")} {`);
    const back = css.indexOf(`${each("new")} {`);
    expect(out).toBeGreaterThan(-1);
    expect(back).toBeGreaterThan(out);
    // Going out, gone as the picture lifts; coming back, whole as it lands, in the second half of its way.
    expect(css.slice(out, css.indexOf("}", out))).toContain("animation: route-leave 110ms var(--ease-house) both;");
    const lands = /animation: route-arrive (\d+)ms var\(--ease-house\) (\d+)ms both;/.exec(css.slice(back, css.indexOf("}", back)))!;
    const travels = Number(/::view-transition-group\(carried\) \{\s*animation-duration: (\d+)ms;/.exec(css)![1]);
    expect(Number(lands[2])).toBeGreaterThanOrEqual(travels * 0.4);
    expect(Number(lands[1]) + Number(lands[2])).toBe(travels);
  });

  it("setDown gives every name back", () => {
    const picture = fake("span", { "data-carry": "x" });
    stage([fake("a", { href: "/saints/x/" }, [picture])]);
    liftFrom(picture as unknown as EventTarget);
    setDown();
    expect(wears(picture)).toBe(false);
  });

  // A cover is one poster at both ends, with words on it: passed into each
  // other, the two titles stood one over the other for the first frames (the
  // film, 2026-11-10). So a cover says it is one, and the stylesheet draws
  // only the cover it is becoming.
  it("a picture of a kind wears its kind beside the name, and one known by its address wears none", () => {
    expect(kindOf("cover:Confessions")).toBe("cover");
    expect(kindOf("way:creed")).toBe("way");
    expect(kindOf("/icons/basil.jpg")).toBeNull();
    expect(kindOf("https://purifyapp.net/covers/basil.jpg")).toBeNull();
    expect(kindOf("")).toBeNull();

    const cover = fake("div", { "data-carry": "cover:Confessions" });
    const tile = fake("a", { href: "/saints/augustine-of-hippo/confessions/" }, [cover]);
    const icon = fake("span", { "data-carry": "/icons/basil.jpg" });
    const card = fake("a", { href: "/saints/basil-the-great/" }, [icon]);
    stage([tile, card]);
    liftFrom(icon as unknown as EventTarget);
    expect(icon.names.has("view-transition-class")).toBe(false);
    // A cover says it is one by a name of its own, and by no class (P7, 1.9):
    // an iPhone on iOS 18.0 or 18.1 has the transitions and not the class, so
    // a rule that told a cover by its class did not match there, the two
    // covers passed into each other, and the title was read twice.
    liftFrom(cover as unknown as EventTarget);
    expect(cover.names.get("view-transition-name")).toBe(CARRIED_COVER);
    expect(cover.names.has("view-transition-class")).toBe(false);
    expect(CARRIED_COVER).not.toBe(CARRIED);

    // The cover at the head of the book's page takes it, and says the same.
    const head = fake("div", { "data-carry-into": "cover:Confessions" });
    stage([head]);
    carryIn("/saints/augustine-of-hippo/confessions/");
    expect(head.names.get("view-transition-name")).toBe(CARRIED_COVER);
    expect(head.names.has("view-transition-class")).toBe(false);
    expect("carriedIn" in head.dataset).toBe(true);

    // And both are given back with the name.
    setDown();
    expect(cover.names.size).toBe(0);
    expect(head.names.size).toBe(0);
    // The one a picture landed on keeps a mark of it, and stays seen (P10);
    // the one it left, which nothing landed on, keeps none.
    expect("carriedIn" in head.dataset).toBe(false);
    expect(head.dataset.landed).toBe("");
    expect("landed" in cover.dataset).toBe(false);

    // Any other kind wears the name every picture wears, with its kind beside it.
    const plate = fake("span", { "data-carry": "way:creed" });
    stage([fake("a", { href: "/theology/creed/" }, [plate])]);
    liftFrom(plate as unknown as EventTarget);
    expect(plate.names.get("view-transition-name")).toBe(CARRIED);
    expect(plate.names.get("view-transition-class")).toBe("carried-way");
  });

  it("the pictures say so themselves: the attributes are on the shared components", () => {
    const has = (file: string, mark: string) => expect(read(file), `${file}: ${mark}`).toContain(mark);
    // Out of a card.
    // Under the picture's own address, or a name the tile is given (Your rule's, below).
    has("components/mobile/SoftTiles.tsx", "data-carry={carry ?? picture}");
    // All prayers' pieces wear the icons Practices' tiles do, and go where
    // they go (build 89 note 10 made them pictures, the same night).
    has("components/prayers/PrayerPieces.tsx", "data-carry={p.art?.src}");
    // A starter's tile on the Florilegium, into the head of its own page (notes 6 and 12).
    has("components/florilegium/FlorilegiaHub.tsx", "<span data-carry={picture.src}");
    has("components/florilegium/StarterPage.tsx", "data-carry-into={picture.src}");
    has("components/saints/SaintIcon.tsx", "data-carry={saint.iconUrl || undefined}");
    has("components/theology/TheologyLibrary.tsx", "data-carry={`way:${w.key}`}");
    // Into a page.
    has("components/saints/SaintHeroPicture.tsx", "data-carry-into={iconUrl}");
    // Only where the page shows the same picture. A saint's wide picture is
    // another picture, with words over it: a picture carried there covered
    // the words until the change was over. Your rule's head was the same,
    // until its tile wore the half the page opens on (the arbiter's call of
    // 2026-11-11, P1): the head's picture, as the half shown, takes the tile's, by
    // the half's own name (lib/prayers/serviceArt.ts, ruleCarry).
    has("components/prayers/mine/RuleHead.tsx", "data-carry-into={takes ? ruleCarry(takes) : undefined}");
    has("components/mobile/PrayersMobile.tsx", "carry={rulePart ? ruleCarry(rulePart) : undefined}");
    // A saint whose page opens on a wide picture shows his own icon in the box until that picture has come: the
    // card's icon lands on that icon (P2, the arbiter's call of 2026-11-11: "where the saint's page shows his icon
    // anywhere, the card's icon flies to it"), never on the wide picture. So two takers in the file, one a page.
    expect(read("components/saints/SaintHeroPicture.tsx").match(/data-carry-into=\{iconUrl\}/g) ?? []).toHaveLength(2);
    has("components/saints/SaintHeroPicture.tsx", 'data-hero-stand-in=""');
    has("components/theology/WayPage.tsx", "data-carry-into={`way:${way}`}");
    // Both: the same plate, the same poster, at two sizes.
    has("components/prayers/ArtPlate.tsx", "data-carry={art.src}");
    has("components/prayers/ArtPlate.tsx", "data-carry-into={art.src}");
    expect(read("components/covers/WorkCover.tsx").match(/data-carry=\{carried\} data-carry-into=\{carried\}/g) ?? []).toHaveLength(2);
  });

  it("the bridge lifts on a capturing tap and carries in once the page is named", () => {
    const bridge = read("components/nav/RouteTransition.tsx");
    // Lifted first, before anything else the tap does (the address it opens is noted after it: lib/nav/addressOpening.ts).
    expect(bridge).toMatch(/const onTap = \(event: MouseEvent\) => \{\s*liftFrom\(event\.target\);/);
    expect(bridge).toContain('document.addEventListener("click", onTap, true);');
    const effect = bridge.slice(bridge.indexOf("useIsoLayoutEffect(() => {"), bridge.indexOf("}, [pathname]);"));
    expect(effect.indexOf("carryIn(pathname);")).toBeGreaterThan(effect.indexOf("beginNav(note);"));
  });

  it("the stylesheet moves it with the page, and lets it leave or arrive with its page when it is alone", () => {
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/::view-transition-group\(carried\) \{\s*animation-duration: 320ms;\s*animation-timing-function: var\(--ease-house\);\s*\}/);
    expect(css).toMatch(/::view-transition-old\(carried\):only-child \{\s*animation: route-leave var\(--duration-route-exit\) var\(--ease-house\) both;\s*\}/);
    expect(css).toMatch(/::view-transition-new\(carried\):only-child \{\s*animation: route-arrive var\(--duration-route-enter\) var\(--ease-house\) 40ms both;\s*\}/);
    expect(css).toMatch(/\[data-carried-in\],\s*\[data-carried-in\] \* \{\s*transition: none !important;\s*\}/);
  });

  it("a cover travels as the one it is becoming, alone, so its words are never read twice", () => {
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    // The one being left is not drawn while both are there; the one arriving is, from the first frame.
    expect(css).toMatch(/@keyframes carried-unseen \{\s*from \{ opacity: 0; \}\s*to \{ opacity: 0; \}\s*\}/);
    expect(css).toMatch(/::view-transition-old\(carried-cover\) \{\s*animation: carried-unseen 320ms both;\s*\}/);
    expect(css).toMatch(/::view-transition-new\(carried-cover\) \{\s*animation: none;\s*\}/);
    // For as long as the picture travels: a cover's own name is given the travel every picture has.
    const travels = /::view-transition-group\(carried\) \{\s*animation-duration: (\d+)ms;/.exec(css)![1];
    expect(travels).toBe("320");
    expect(css).toMatch(new RegExp(`::view-transition-group\\(carried-cover\\) \\{\\s*animation-duration: ${travels}ms;\\s*animation-timing-function: var\\(--ease-house\\);\\s*\\}`));
    // Cut to its frame as it changes shape, as every travelling picture is, and to a poster's corners.
    expect(css).toMatch(/::view-transition-old\(carried-cover\),\s*::view-transition-new\(carried-cover\) \{\s*block-size: 100%;\s*object-fit: cover;\s*overflow: clip;\s*border-radius: 6px;\s*mix-blend-mode: normal;\s*\}/);
    // P7 (1.9): told by its name alone. No rule tells a cover by a class, which iOS 18.0 and 18.1 do not have.
    expect(css).not.toMatch(/carried\.carried-cover/);
    expect(read("lib/ui/routeMotion.ts")).toContain('el.style.setProperty("view-transition-name", kind === "cover" ? CARRIED_COVER : CARRIED);');
    // Alone, it leaves or arrives with its page, said after so it holds.
    const both = css.indexOf("::view-transition-new(carried-cover) {");
    const leaves = css.indexOf("::view-transition-old(carried-cover):only-child {");
    const arrives = css.indexOf("::view-transition-new(carried-cover):only-child {");
    expect(leaves).toBeGreaterThan(both);
    expect(arrives).toBeGreaterThan(leaves);
    expect(css.slice(leaves, css.indexOf("}", leaves))).toContain("animation: route-leave var(--duration-route-exit) var(--ease-house) both;");
    expect(css.slice(arrives, css.indexOf("}", arrives))).toContain("animation: route-arrive var(--duration-route-enter) var(--ease-house) 40ms both;");
    // The cover it is becoming is whole from the first frame: seen, and its picture shown.
    expect(css).toMatch(/\[data-carried-in\]\[data-cover\],\s*\[data-carried-in\] \[data-cover-picture\] \{\s*opacity: 1;\s*\}/);
    // And it stays seen once it has landed, with its own motion its own again (P10).
    expect(css).toMatch(/\[data-landed\]\[data-cover\],\s*\[data-landed\] \[data-cover-picture\] \{\s*opacity: 1;\s*\}/);
    expect(css).not.toMatch(/\[data-landed\][^{]*\{[^}]*transition: none/);
    expect(read("lib/ui/routeMotion.ts")).toContain('if ("carriedIn" in el.dataset) el.dataset.landed = "";');
    // And the cover's own marks are still what the stylesheet looks for.
    const cover = read("components/covers/WorkCover.tsx");
    expect(cover).toContain('data-cover=""');
    expect(cover).toContain('data-cover-picture={shown ? "shown" : "waiting"}');
    expect(cover).toContain("const carried = `cover:${title}`;");
  });
});

describe("the wiring", () => {
  const bridge = read("components/nav/RouteTransition.tsx");

  it("Next pictures route changes with no flag, in the website's build and in the apps'", () => {
    // Until 16.3 this was experimental.viewTransition, in both builds. From
    // 16.3 view transitions need no configuration, and 16.4 refuses the flag
    // (node_modules/next/dist/docs, the version 16 upgrade guide).
    const config = read("next.config.ts").replace(/\/\/.*$/gm, "");
    expect(config).not.toMatch(/viewTransition\s*:/);
    // This reads the Next that is installed, not the one the branch asks for,
    // so it is the one line here that can be red while every file is right:
    // a checkout that pulled the move to 16.4.6 (2346e7cc) and did not install
    // again still runs 16.2.6. It was reported as a broken page switch on
    // 2026-11-11 for that reason, so the failure now says what to do.
    const installed = JSON.parse(read("node_modules/next/package.json")).version as string;
    const asked = (JSON.parse(read("package.json")).dependencies as Record<string, string>).next;
    const [major, minor] = installed.split(".").map(Number);
    expect(
      major > 16 || (major === 16 && minor >= 3),
      `Next ${installed} is installed here, and route changes are pictured without a flag only from 16.3. package.json asks for ${asked}: run npm ci, this checkout's packages are older than its lockfile`,
    ).toBe(true);
  });

  it("one bridge at the root, after the two it depends on", () => {
    const frame = read("components/layout/RootFrame.tsx");
    const at = (mark: string) => frame.indexOf(mark);
    expect(at("<RouteTransition />")).toBeGreaterThan(-1);
    expect(at("<RouteExitBridge />")).toBeLessThan(at("<RouteTransition />"));
    expect(at("<ScrollResetBridge />")).toBeLessThan(at("<RouteTransition />"));
    expect(frame.match(/<RouteTransition \/>/g) ?? []).toHaveLength(1);
  });

  it("React pictures a change of address, and nothing else a page does", () => {
    // A search answering or a list arriving inside a page is a React
    // transition too, and must never be pictured as a page switch. So the
    // mark is alone in its <ViewTransition>, carries the address and nothing
    // else, and answers to no other kind of change (`default="none"`).
    const inside = bridge.slice(bridge.indexOf("<ViewTransition default="), bridge.indexOf("</ViewTransition>"));
    expect(inside.match(/<[a-zA-Z]/g) ?? []).toHaveLength(2);
    expect(inside).toContain('<span aria-hidden data-route-mark={pathname} className="route-mark" />');
  });

  it("and the mark asks for a picture only while the address is changing", () => {
    // Being alone in its <ViewTransition> was not enough. On every change
    // React may picture, it names every <ViewTransition> standing beside
    // what changed, in case it moved, and starts a transition to find out:
    // one that shows nothing, runs its full length, and holds React's next
    // change until it is over. Measured on the export on 2026-11-11, a page
    // whose script was there 450ms after the tap: three transitions for the
    // one tap, the page on screen 0.6s late. A mark that says "none" is
    // passed over.
    expect(bridge).toContain("const [settled, setSettled] = useState(pathname);");
    expect(bridge).toContain("const changing = !samePage(settled, pathname);");
    expect(bridge).toContain('<ViewTransition default="none" update={changing && canMove() ? "route-mark" : "none"}>');
    // Said in the layout effect, first thing, whatever kind of change it
    // was: React draws again at once for a layout effect, before any other
    // change can commit, and leaves a plain effect until the picture is over.
    const effect = bridge.slice(bridge.indexOf("useIsoLayoutEffect(() => {"), bridge.indexOf("}, [pathname]);"));
    expect(effect.indexOf("setSettled(pathname);")).toBeGreaterThan(-1);
    expect(effect.indexOf("setSettled(pathname);")).toBeLessThan(effect.indexOf("if (samePage(from, pathname)) return;"));
    expect(bridge.match(/setSettled\(/g) ?? []).toHaveLength(1);
  });

  it("which is how React decides what to name (read from the React that Next ships)", () => {
    // If this fails after an upgrade, React has changed how it finds the
    // boundaries beside a change. Run `node scripts/route-motion.mjs` on the
    // export: its walk "a part that arrives a beat late" says whether a
    // second transition is back, and the mark is mended by what it shows.
    const react = read("node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.production.js");
    expect(react).toMatch(/function commitNestedViewTransitions\(\w+\) \{[\s\S]{0,400}getViewTransitionClassName\(props\.default, props\.update\);[\s\S]{0,120}"none" !== props &&\s+applyViewTransitionToHostInstances\(/);
  });

  it("a change of page takes every outline's copy with it, before anything is pictured", () => {
    // An outline that leaves WITH its page is in the page switch's own
    // picture; its copy must not be left over the next page (lib/ui/outlineLeave.ts).
    const effect = bridge.slice(bridge.indexOf("useIsoLayoutEffect(() => {"), bridge.indexOf("}, [pathname]);"));
    const order = ["if (samePage(from, pathname)) return;", "outlinesForgotten();", "takeNav(from, pathname)", "if (arrived())"].map((mark) => effect.indexOf(mark));
    expect(order.every((at) => at > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("the layout effect lifts the dim, lets a step back go on, and leaves the browser's own Back alone", () => {
    const effect = bridge.slice(bridge.indexOf("useIsoLayoutEffect(() => {"), bridge.indexOf("}, [pathname]);"));
    const order = ["endRouteExit();", "takeNav(from, pathname)", "if (arrived())", 'note === "traverse" || !canMove()', "beginNav(note);"].map((mark) => effect.indexOf(mark));
    expect(order.every((at) => at > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("the page is handed back in an effect of its own", () => {
    expect(bridge).toMatch(/useEffect\(\(\) => \{\s*endNav\(\);\s*\}, \[pathname\]\);/);
  });

  it("the browser's own Back and Forward are noted, so they are not pictured", () => {
    expect(bridge).toContain('window.addEventListener("popstate", onStep);');
    expect(bridge).toContain('noteNav("traverse");');
    expect(bridge).toContain("if (samePage(window.location.pathname, here.current)) dropReturn();");
  });

  it("the chevron steps back inside a transition, and its floor returns as a page behind would", () => {
    const back = read("lib/nav/goBack.ts")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(back).toContain("returnBy(() => router.back());");
    expect(back.match(/noteNav\("back"\);\s*router\.push\(floor\);/g) ?? []).toHaveLength(2);
    // The one bare router.back() left is the step itself.
    expect(back.match(/router\.back\(\)/g) ?? []).toHaveLength(1);
    expect(read("components/nav/AppNav.tsx")).toContain("returnBy(() => router.back())");
  });

  it("the phone's Back button steps back from here, and a sheet that has taken it keeps it", () => {
    const listener = bridge.slice(bridge.indexOf('App.addListener("backButton"'), bridge.indexOf("if (disposed)"));
    expect(listener).toContain("if (overlayOwnsBack()) return;");
    expect(listener).toContain("if (canGoBack) returnBy(() => window.history.back());");
    const hook = read("lib/platform/useAndroidBack.ts");
    const effect = hook.slice(hook.indexOf("if (!active || !isNativeClient()) return;"), hook.indexOf("}, [active]);"));
    // Counted as the sheet becomes active, not when its listener registers.
    expect(effect.indexOf("owners += 1;")).toBeGreaterThan(-1);
    expect(effect.indexOf("owners += 1;")).toBeLessThan(effect.indexOf("await import"));
    expect(effect).toContain("owners -= 1;");
  });

  it("React still keeps a named page in the picture (read from the React that Next ships)", () => {
    // beginNav names <html> so React does not leave the page itself out of
    // the transition. That is how react-dom is written today, not a promise
    // it makes. If this fails after an upgrade, the check that watches a real
    // transition is `node scripts/route-motion.mjs` on the export: run it,
    // and fix beginNav or this line by what it shows.
    const react = read("node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.production.js");
    expect(react).toMatch(/"" === \w+\.style\.viewTransitionName[\s\S]{0,600}::view-transition-group\(root\)/);
  });
});

describe("the stylesheet", () => {
  const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
  /** The body of the rule whose selector is exactly this, at the start of a line. */
  const rule = (selector: string) => {
    const at = `\n${css}`.indexOf(`\n${selector} {`);
    if (at < 0) throw new Error(`no rule for ${selector}`);
    return css.slice(at, css.indexOf("}", at));
  };
  const ms = (value: string) => {
    const m = /^\s*([\d.]+)(ms|s)\s*$/.exec(value);
    if (!m) throw new Error(`not a time: ${value}`);
    return Number(m[1]) * (m[2] === "s" ? 1000 : 1);
  };
  const token = (name: string) => ms(new RegExp(`${name}:\\s*([^;]+);`).exec(css)![1]);

  it("says how each of the three moves, for the page leaving and the page arriving", () => {
    for (const kind of ["forward", "back", "swap"]) {
      for (const side of ["old", "new"]) {
        expect(css, `${side} ${kind}`).toContain(`::view-transition-${side}(root.nav-${kind})`);
      }
    }
    expect(rule("::view-transition-new(root.nav-forward)")).toContain("animation-name: route-settle;");
    expect(rule("::view-transition-old(root.nav-back)")).toContain("animation-name: route-sink;");
  });

  it("a page switch is over inside about a third of a second", () => {
    const leave = token("--duration-route-exit");
    const arrive = token("--duration-route-enter");
    const wait = ms(/::view-transition-new\(root\.nav-swap\) \{[^}]*animation-delay:\s*([^;]+);/.exec(css)![1]);
    const forward = ms(/::view-transition-new\(root\.nav-forward\) \{\s*animation-name: route-settle;\s*animation-duration:\s*([^;]+);/.exec(css)![1]);
    expect(Math.max(leave, wait + arrive, wait + forward)).toBeLessThanOrEqual(350);
    // The page being left is nearly gone before the next shows.
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThan(leave);
  });

  it("a page is said to have arrived when the stylesheet has finished moving it, and not long after", () => {
    const wait = ms(/::view-transition-new\(root\.nav-swap\) \{[^}]*animation-delay:\s*([^;]+);/.exec(css)![1]);
    const forward = ms(/::view-transition-new\(root\.nav-forward\) \{\s*animation-name: route-settle;\s*animation-duration:\s*([^;]+);/.exec(css)![1]);
    const carried = ms(/::view-transition-group\(carried\) \{\s*animation-duration:\s*([^;]+);/.exec(css)![1]);
    const longest = Math.max(wait + token("--duration-route-enter"), wait + forward, carried);
    expect(SETTLE_MS).toBeGreaterThanOrEqual(longest);
    // No more than two frames past it: a reader coming back to a book waits this long for their place.
    expect(SETTLE_MS - longest).toBeLessThanOrEqual(34);
  });

  it("pages move up and down, never sideways, so nothing has to turn in Arabic", () => {
    for (const name of ["route-settle", "route-sink"]) {
      const frames = new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`).exec(css)![1];
      const moves = [...frames.matchAll(/translate:\s*([^;]+);/g)].map((m) => m[1].trim());
      expect(moves.length, name).toBeGreaterThan(0);
      for (const move of moves) expect(move, name).toMatch(/^0 \d+px$/);
      expect(frames, name).not.toMatch(/transform|translateX/);
    }
  });

  it("the tab bar is pictured apart from the page, so it stands still", () => {
    // On the bar itself: the stylesheet's rules on [data-tab-bar] are the
    // ones that move it on a reading screen (lib/bible/__tests__/
    // readerScreen.test.ts holds them to that).
    const bar = read("components/nav/MobileTabBar.tsx");
    const nav = bar.slice(bar.indexOf("<nav"), bar.indexOf("className={cn(", bar.indexOf("<nav")));
    expect(nav).toContain("data-tab-bar");
    expect(nav).toContain('style={{ viewTransitionName: "tab-bar" }}');
  });

  it("and so is the website's header", () => {
    expect(rule("[data-appnav]")).toContain("view-transition-name: app-nav;");
    expect(read("components/nav/AppNav.tsx")).toContain("data-appnav");
  });

  it("a carried route's own fade is off, and a returning page is not assembled again", () => {
    expect(rule(".route-fade[data-carried]")).toMatch(/animation: none;/);
    expect(rule(".route-fade[data-carried]")).not.toMatch(/transform|translate/);
    // Set into its past, never taken away: giving an animation back starts it.
    const rows = rule('.route-fade[data-carried="back"] .cascade > *');
    expect(rows).toMatch(/animation-delay: -1s;/);
    expect(rows).not.toMatch(/animation: none|animation-name/);
  });

  it("nothing in a page that arrived in a transition waits for the wrapper's fade, which is off there (Gate 2.0, cause 1)", () => {
    // Every entrance that waits for `.route-fade`'s own fade, found as the
    // stylesheet says it: a start of var(--duration-route-enter) under
    // `.route-fade`. With the fade off in a carried route, each such wait was
    // the screen standing empty between the page left and the page arriving
    // (104 page switches of 200 to 400ms, the motion walk of 2026-11-13).
    const waits = [...css.matchAll(/\n(\.route-fade [^{\n]+) \{\s*(--[\w-]+): var\(--duration-route-enter\);\s*\}/g)].map((m) => ({ selector: m[1], name: m[2] }));
    // The three the walk proved: the rows, a page's opening words, a saint's head.
    expect(waits.map((w) => w.name).sort()).toEqual(["--cascade-start", "--page-open-start", "--saint-head-start"]);
    for (const { selector, name } of waits) {
      const carried = selector.replace(/^\.route-fade /, ".route-fade[data-carried] ");
      // Said after the wait it lifts, and more particular than it, so it holds.
      expect(css.indexOf(`\n${carried} {`), carried).toBeGreaterThan(css.indexOf(`\n${selector} {`));
      expect(rule(carried), carried).toMatch(new RegExp(`${name}: 0ms;`));
    }
  });
});
