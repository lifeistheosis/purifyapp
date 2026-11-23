// What stands on the screen over a part at the end of a long page, in pieces
// (lib/ui/inPageMove.ts, piecesBefore). A day's Done is answered by its card
// at the end of a council's page (components/onboarding/DayFrame.tsx): the
// page goes with the card in the same move, so what stands over it has to
// glide. partsBefore would name the whole article, seven thousand pixels of
// it, for the few lines the screen shows.
//
// What a reader would notice if this broke: the lines over the card fading
// out at one place and in at another as the day is kept, or a phone that
// stalls on the tap while it pictures a whole page.

import { afterEach, describe, expect, it, vi } from "vitest";

import { HEAD_SHARE, piecesBefore, stuckOver } from "../inPageMove";

type El = {
  tagName: string;
  top: number;
  height: number;
  position?: string;
  display?: string;
  name?: string;
  parentElement: El | null;
  previousElementSibling: El | null;
  lastElementChild: El | null;
  getBoundingClientRect: () => { top: number; bottom: number; width: number; height: number };
};
const body = { tagName: "BODY" } as El;

/** An element with its parts in order; each part's parent and neighbours are set here. */
function el(top: number, height: number, parts: El[] = [], more: Partial<El> = {}): El {
  const made: El = {
    tagName: "DIV",
    top,
    height,
    parentElement: null,
    previousElementSibling: null,
    lastElementChild: parts.at(-1) ?? null,
    getBoundingClientRect: () => ({ top: made.top, bottom: made.top + made.height, width: 360, height: made.height }),
    ...more,
  };
  parts.forEach((part, i) => {
    part.parentElement = made;
    part.previousElementSibling = parts[i - 1] ?? null;
  });
  return made;
}

function stub() {
  vi.stubGlobal("window", { innerHeight: 844 });
  vi.stubGlobal("document", { body });
  vi.stubGlobal("getComputedStyle", (e: El) => ({ display: e.display ?? "block", position: e.position ?? "static", viewTransitionName: e.name ?? "none" }));
}

afterEach(() => vi.unstubAllGlobals());

describe("the pieces on the screen over a part at the end of a long page", () => {
  it("enters a part taller than the screen and takes its own parts on the screen, the nearest first", () => {
    stub();
    const far = el(-6000, 5800); // the article's head and most of its length, above the screen
    const near = el(-200, 400); // a section half on the screen
    const links = el(220, 180);
    const credit = el(520, 20);
    const article = el(-6000, 6560, [far, near, links, credit]);
    const end = el(600, 120);
    const section = el(-6000, 6800, [article, end]);
    el(-6100, 7000, [el(-6100, 51, [], { position: "sticky" }), section], { tagName: "MAIN" });
    expect(piecesBefore(end as unknown as Element)).toEqual([credit, links, near]);
  });

  it("takes a part no taller than the screen whole, as partsBefore does", () => {
    stub();
    const prayer = el(380, 160); // "pray to God for us"
    const shell = el(-3000, 3300, [el(-3000, 2800), el(-200, 300), el(140, 200)]);
    const hero = el(-3400, 380);
    const end = el(560, 120);
    const column = el(-3400, 4100, [hero, shell, prayer, end]);
    el(-3400, 4200, [column], { tagName: "MAIN" });
    const [first, ...rest] = piecesBefore(end as unknown as Element);
    expect(first).toBe(prayer);
    expect(rest.map((p) => (p as unknown as El).top)).toEqual([140, -200]);
  });

  it("never takes what is off the screen, fixed or stuck, hidden, or already named, at any depth", () => {
    stub();
    const stuck = el(51, 60, [], { position: "sticky" }); // a saint's doors, stuck under the bar
    const named = el(200, 40, [], { name: "in-page-grows-1" });
    const hidden = el(260, 40, [], { display: "none" });
    const empty = el(300, 0);
    const shown = el(320, 100);
    const below = el(900, 100); // under the screen
    const tall = el(-2000, 3000, [stuck, named, hidden, empty, shown, below]);
    const end = el(1000, 120);
    const column = el(-2000, 3200, [tall, end]);
    el(-2000, 3300, [column], { tagName: "MAIN" });
    expect(piecesBefore(end as unknown as Element)).toEqual([shown]);
  });

  it("looks inside a box that draws nothing of its own, whatever its size", () => {
    stub();
    const a = el(100, 80);
    const b = el(200, 80);
    const wrapper = el(0, 0, [a, b], { display: "contents" });
    const end = el(300, 120);
    const column = el(0, 500, [wrapper, end]);
    el(0, 600, [column], { tagName: "MAIN" });
    expect(piecesBefore(end as unknown as Element)).toEqual([b, a]);
  });

  it("stops at the number it is given, and is empty with nothing to start from", () => {
    stub();
    const parts = Array.from({ length: 12 }, (_, i) => el(60 * i, 50));
    const tall = el(-4000, 4720, parts);
    const end = el(730, 100);
    const column = el(-4000, 4900, [tall, end]);
    el(-4000, 5000, [column], { tagName: "MAIN" });
    expect(piecesBefore(end as unknown as Element, 5)).toHaveLength(5);
    expect(piecesBefore(null)).toEqual([]);
  });
});

describe("what stands over the page at the head of the screen", () => {
  type Box = { name: string; position?: string; vt?: string; parentElement: Box | null; contains: (x: unknown) => boolean };
  const box = (name: string, parent: Box | null, more: Partial<Box> = {}): Box => ({ name, parentElement: parent, contains: () => false, ...more });

  /** A screen 390 by 844 whose points answer from `under.at(x, y)`: the boxes under that point, the nearest first. */
  function screen() {
    const html = box("html", null);
    const bodyBox = box("body", html);
    const under: { at: (x: number, y: number) => Box[] } = { at: () => [] };
    vi.stubGlobal("window", { innerWidth: 390, innerHeight: 844 });
    vi.stubGlobal("document", { body: bodyBox, documentElement: html, elementsFromPoint: (x: number, y: number) => under.at(x, y) });
    vi.stubGlobal("getComputedStyle", (e: Box) => ({ position: e.position ?? "static", viewTransitionName: e.vt ?? "none" }));
    return { bodyBox, under };
  }

  it("finds the page's bar and a row pinned under it, each once, and nothing that only lies under them", () => {
    const { bodyBox, under } = screen();
    const main = box("main", bodyBox);
    const words = box("words", main);
    const bar = box("bar", main, { position: "sticky" });
    const title = box("title", bar);
    const pin = box("pin", main, { position: "fixed" });
    const door = box("door", pin);
    under.at = (_x, y) => (y < 51 ? [title, bar, words, main] : y < 107 ? [door, pin, words, main] : [words, main]);
    const from = box("end", main);
    expect(stuckOver(from as unknown as Element).map((e) => (e as unknown as Box).name)).toEqual(["bar", "pin"]);
  });

  it("leaves what is named already, and what holds the part itself", () => {
    const { bodyBox, under } = screen();
    const tabs = box("tabs", bodyBox, { position: "fixed", vt: "tab-bar" });
    const sheet = box("sheet", bodyBox, { position: "fixed", contains: () => true });
    under.at = () => [tabs, sheet];
    expect(stuckOver(box("end", sheet) as unknown as Element)).toEqual([]);
  });

  it("looks only across the head of the screen, and is empty with nothing to start from", () => {
    const { bodyBox, under } = screen();
    const ys: number[] = [];
    under.at = (_x, y) => {
      ys.push(y);
      return [];
    };
    expect(stuckOver(box("end", bodyBox) as unknown as Element)).toEqual([]);
    expect(Math.max(...ys)).toBeLessThan(844 * HEAD_SHARE);
    expect(Math.min(...ys)).toBe(8);
    expect(stuckOver(null)).toEqual([]);
  });
});
