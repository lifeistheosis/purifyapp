// The way out of a reader: a chapter's round button, a chevron named Back,
// returns the reader where they were before the reader. The rule and why are
// in ../readerWay.ts. Until 1.9 it was a door to the whole list of books and
// nothing else, so every path here but "nothing behind" fails on that code:
// the module was not there, and the button was a plain link.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const said: string[] = [];
const returnedTo: number[] = [];
let pictured = 0;

vi.mock("@/lib/ui/routeMotion", () => ({
  noteNav: (kind: string) => void said.push(kind),
  // The step is taken inside a transition; here, at once.
  returnBy: (step: () => void) => {
    pictured += 1;
    step();
  },
}));
vi.mock("@/lib/ui/scrollReset", () => ({
  noteReturn: (down: number) => void returnedTo.push(down),
}));

import { BACK_FALLBACK_MS } from "../backBar";
import { ROOMS, leaveBy, noteWayRoute, noteWayTap, resetReaderWayForTests, wayOf, type RouteKind } from "../readerWay";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

type Listener = () => void;

/**
 * A phone's history: the entries, where the reader is among them, and the
 * page's scroll. `api: false` is a browser with no Navigation API (an iPhone
 * before iOS 26.2); `stuck` is a history that will not step.
 */
function phone(start: string, { api = true, stuck = false }: { api?: boolean; stuck?: boolean } = {}) {
  const entries = [start];
  let at = 0;
  const listeners = new Map<string, Set<Listener>>();
  const pushes: { href: string; scroll?: boolean }[] = [];
  const steps: number[] = [];
  const split = (address: string) => {
    const [rest] = address.split("#");
    const [pathname, query] = rest.split("?");
    return { pathname, search: query ? `?${query}` : "" };
  };
  const win = {
    scrollY: 0,
    location: split(start),
    history: {
      go: (by: number) => {
        steps.push(by);
        if (stuck || at + by < 0 || at + by >= entries.length) return;
        at += by;
        win.location = split(entries[at]);
        for (const fn of [...(listeners.get("popstate") ?? [])]) fn();
      },
    },
    addEventListener: (type: string, fn: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Listener) => void listeners.get(type)?.delete(fn),
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number,
    navigation: api
      ? {
          entries: () => entries.map((url, index) => ({ url: `https://localhost${url}`, index })),
          get currentEntry() {
            return { url: `https://localhost${entries[at]}`, index: at };
          },
        }
      : undefined,
  };
  type W = Parameters<typeof leaveBy>[3];
  const w = win as unknown as W;
  const router = {
    push: (href: string, options?: { scroll?: boolean }) => {
      pushes.push({ href, scroll: options?.scroll });
      entries.splice(at + 1, entries.length, href);
      at += 1;
      win.location = split(href);
    },
  };
  noteWayTap(w);
  return {
    router,
    pushes,
    steps,
    w,
    /** The reader taps something with the page `down` px down, and a page opens: by a link, across, or as a floor. */
    open: (href: string, kind: RouteKind = "forward", down = 0) => {
      win.scrollY = down;
      noteWayTap(w);
      router.push(href);
      pushes.pop();
      win.scrollY = 0;
      noteWayRoute(kind, w);
    },
    /** An entry a page makes for itself, with no route: a verse's own address. */
    entry: (href: string) => {
      entries.splice(at + 1, entries.length, href);
      at += 1;
      win.location = split(href);
    },
    /** The phone's own Back (or Forward): a step through history, and the route it brings. */
    step: (by: number) => {
      at += by;
      win.location = split(entries[at]);
      noteWayRoute("traverse", w);
    },
    here: () => entries[at],
    leave: (floor = "/bible") => leaveBy(router, "bible", floor, w),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  resetReaderWayForTests();
  said.length = 0;
  returnedTo.length = 0;
  pictured = 0;
});

afterEach(() => {
  resetReaderWayForTests();
  vi.useRealTimers();
});

describe("which pages are a reader's", () => {
  it("a chapter is, with or without its last slash; the list, a book alone and several references are not", () => {
    for (const address of ["/bible/john/1/", "/bible/john/1", "/bible/1-kings/22/", "/bible/psalms/150"]) expect(ROOMS.bible.test(address), address).toBe(true);
    for (const address of ["/bible/", "/bible", "/bible/john/", "/bible/multi/", "/bible/john/1/notes/", "/plans/bible/1/"]) expect(ROOMS.bible.test(address), address).toBe(false);
  });
});

describe("the chapter's Back returns the reader where they were", () => {
  it("from a row of the list, to the list, by a true step that is pictured as any step back", () => {
    const p = phone("/bible/");
    p.open("/bible/1-kings/1/", "forward", 697);
    expect(wayOf("bible")).toEqual({ came: "/bible/", down: 697 });
    expect(p.leave()).toBe(true);
    expect(p.steps).toEqual([-1]);
    expect(p.here()).toBe("/bible/");
    expect(pictured).toBe(1);
    // A step, not a new page: nothing was opened, and the list's own place is the step's to put back.
    expect(p.pushes).toEqual([]);
    expect(returnedTo).toEqual([]);
    vi.advanceTimersByTime(BACK_FALLBACK_MS + 1);
    expect(p.pushes).toEqual([]);
  });

  it("chapters turned inside the reader are not steps: one tap leaves it", () => {
    const p = phone("/bible/");
    p.open("/bible/john/1/");
    p.open("/bible/john/2/", "swap");
    p.open("/bible/john/3/", "swap");
    expect(p.leave()).toBe(true);
    expect(p.steps).toEqual([-3]);
    expect(p.here()).toBe("/bible/");
  });

  it("nor is an entry a verse's own address made, which no count of chapters would have known of", () => {
    const p = phone("/bible/");
    p.open("/bible/john/1/");
    p.entry("/bible/john/1/#v14");
    p.open("/bible/john/2/", "swap");
    expect(p.leave()).toBe(true);
    expect(p.steps).toEqual([-3]);
    expect(p.here()).toBe("/bible/");
  });

  it("from anywhere else, to that place and not to the list: Today's reading, a saint's page, a search", () => {
    for (const from of ["/", "/saints/john-chrysostom/", "/search/?q=light"]) {
      const p = phone(from);
      p.open("/bible/john/1/");
      p.open("/bible/john/2/", "swap");
      expect(p.leave(), from).toBe(true);
      expect(p.here(), from).toBe(from);
      resetReaderWayForTests();
    }
  });

  it("with nothing behind, it is the door to the whole list, as it was: the caller's own link is left to open", () => {
    // A fresh open or a shared link: the chapter is the visit's first page.
    const fresh = phone("/bible/john/1/");
    expect(fresh.leave()).toBe(false);
    expect(fresh.steps).toEqual([]);
    expect(fresh.pushes).toEqual([]);
    resetReaderWayForTests();

    // The Bible tab: the tabs stand side by side, and Today is not behind the chapter it opened.
    const tab = phone("/");
    tab.open("/bible/john/1/", "swap");
    expect(wayOf("bible")).toBeNull();
    expect(tab.leave()).toBe(false);
    expect(tab.steps).toEqual([]);
    expect(pictured).toBe(0);
  });

  it("the Bible tab after a visit from the list forgets the list: it is no longer behind", () => {
    const p = phone("/bible/");
    p.open("/bible/john/1/");
    expect(wayOf("bible")).not.toBeNull();
    p.open("/", "swap");
    p.open("/bible/john/1/", "swap");
    expect(p.leave()).toBe(false);
  });

  it("a reader who went on from the chapter and stepped back into it still has the list behind them", () => {
    const p = phone("/bible/");
    p.open("/bible/john/1/");
    p.open("/saints/john-chrysostom/");
    p.step(-1);
    expect(p.here()).toBe("/bible/john/1/");
    expect(p.leave()).toBe(true);
    expect(p.here()).toBe("/bible/");
  });

  it("and one who opens a chapter from the page they went on to comes back to that page", () => {
    const p = phone("/bible/");
    p.open("/bible/john/1/");
    p.open("/saints/john-chrysostom/");
    p.open("/bible/matthew/5/");
    expect(p.leave()).toBe(true);
    expect(p.here()).toBe("/saints/john-chrysostom/");
  });

  it("does nothing on the strength of a page it does not find behind it", () => {
    // What is remembered and what the browser has behind the reader disagree: the door, as before.
    const p = phone("/bible/");
    p.open("/bible/john/1/");
    resetReaderWayForTests();
    noteWayTap({ ...p.w!, location: { pathname: "/reading/", search: "" } } as typeof p.w);
    noteWayRoute("forward", p.w);
    expect(wayOf("bible")).toEqual({ came: "/reading/", down: 0 });
    expect(p.leave()).toBe(false);
    expect(p.steps).toEqual([]);
  });

  it("nothing is remembered across a reload", () => {
    const p = phone("/bible/");
    p.open("/bible/john/1/");
    resetReaderWayForTests();
    expect(p.leave()).toBe(false);
  });

  it("a step that moved nothing by its time sends the reader to the list, never nowhere", () => {
    const p = phone("/bible/", { stuck: true });
    p.open("/bible/john/1/");
    expect(p.leave()).toBe(true);
    expect(p.steps).toEqual([-1]);
    expect(p.pushes).toEqual([]);
    vi.advanceTimersByTime(BACK_FALLBACK_MS + 1);
    expect(said).toEqual(["back"]);
    expect(p.pushes).toEqual([{ href: "/bible", scroll: undefined }]);
  });

  it("where the browser cannot say how far back the page is, it is opened as the page behind would return, where the reader left it", () => {
    const p = phone("/bible/", { api: false });
    p.open("/bible/1-kings/1/", "forward", 697);
    p.open("/bible/1-kings/2/", "swap");
    expect(p.leave()).toBe(true);
    // No step is taken on a guess of how many.
    expect(p.steps).toEqual([]);
    // It moves as a return, it is not put at its top, and its place is to be put back.
    expect(said).toEqual(["back"]);
    expect(returnedTo).toEqual([697]);
    expect(p.pushes).toEqual([{ href: "/bible/", scroll: false }]);
    expect(p.here()).toBe("/bible/");
  });

  it("is not asked of a page that is not of the room", () => {
    const p = phone("/bible/");
    p.open("/bible/john/1/");
    p.step(-1);
    expect(p.leave()).toBe(false);
  });
});

describe("the wiring", () => {
  it("only the chapter's page says it leaves a room, and its door is still the whole list", () => {
    const chapter = read("app/(app)/bible/[book]/[chapter]/page.tsx");
    const bar = /<MobileTopBar\b[\s\S]*?\/>\s*\}/.exec(chapter)?.[0] ?? "";
    expect(bar).toContain('back="/bible"');
    expect(bar).toContain('leaves="bible"');
    // No other page's top bar changes.
    const others: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (/\.tsx$/.test(entry.name) && /\bleaves=/.test(read(file))) others.push(file.replaceAll(path.sep, "/"));
      }
    };
    walk("app");
    walk("components");
    expect(others).toEqual(["app/(app)/bible/[book]/[chapter]/page.tsx"]);
  });

  it("the top bar asks only when it is told the room, and leaves a tap that is the browser's to the browser", () => {
    const bar = read("components/nav/MobileTopBar.tsx");
    expect(bar).toContain('import { leaveBy, type Room } from "@/lib/nav/readerWay";');
    const link = bar.slice(bar.indexOf("<Link\n        href={back}"), bar.indexOf("<ChevronLeft", bar.indexOf("<Link\n        href={back}")));
    expect(link).toContain('aria-label={t("nav.back")}');
    expect(link).toMatch(/onClick=\{\s*leaves\s*\?/);
    expect(link).toContain("if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;");
    expect(link).toContain("if (leaveBy(router, leaves, back)) event.preventDefault();");
    expect(link).toMatch(/:\s*undefined\s*\}/);
    // The other way back, a button with no address, is untouched.
    expect(bar).toContain('onClick={() => goBack(router, backFallback ?? "/")}');
  });

  it("every route is told to it with how it came, a step through history as a step, and every tap", () => {
    const bridge = read("components/nav/RouteTransition.tsx");
    const effect = bridge.slice(bridge.indexOf("useIsoLayoutEffect(() => {"), bridge.indexOf("}, [pathname]);"));
    const order = ["takeNav(from, pathname)", "if (arrived())", 'noteWayRoute("traverse");', "noteWayRoute(note);", 'note === "traverse" || !canMove()'].map((mark) => effect.indexOf(mark));
    expect(order.every((at) => at > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(bridge).toContain("const onWay = () => noteWayTap();");
    expect(bridge).toContain('document.addEventListener("click", onWay, true);');
    expect(bridge).toContain('document.removeEventListener("click", onWay, true);');
  });

  it("a page opened again as the page behind keeps its place, by its link or by how far down it stood", () => {
    const bridge = read("components/nav/ScrollResetBridge.tsx");
    const effect = bridge.slice(bridge.indexOf('if (onRouteCommitted() === "traversal") {'), bridge.indexOf("} else keepPlace();"));
    expect(effect).toContain("const placed = returnToPlace();");
    expect(effect).toContain("const down = takeReturnDown();");
    expect(effect).toContain('if (!placed && down !== null) window.scrollTo({ top: down, left: 0, behavior: "instant" });');
  });
});
