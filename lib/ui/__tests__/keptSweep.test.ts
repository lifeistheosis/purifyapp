// Back finds every sideways row where the reader left it (the pre-build gate's
// first rule; lib/ui/keptSweep.ts).
//
// Settings' reading modes kept their sweep from c77723ea (lib/ui/sweepKept.ts,
// its own test). Every other row swept sideways still opened at its start, or
// on what it centres, after Back: Updates 32 named them, and nobody had checked
// them. They are drawn by two rows, ScrollRail (the reading room's shelves of
// covers, the shop's rails, the chants, Prayers' pieces, the You page's shelf,
// the Plus showcase) and ChipScroller (the saints' centuries, a chapter's strip,
// the reading room's search, the chants' kinds, Saved, the journal), and the
// Reading mode page's gallery has shelves of its own. What this holds, each of
// which those rows failed:
//   - a row hands its sweep back to a reader who came back by a step through
//     history, at once, as it opens, and in a right-to-left row too;
//   - a row whose items are still arriving is given it again each frame until
//     it is wide enough to stand there, and never against the reader's hand;
//   - a visit that went forward opens as it always did and lets the sweep go;
//   - the sweep is kept as the row moves;
//   - each row is named by the page's address and its own name, its place
//     telling apart two rows of one name;
//   - the three rows hold it, and the first centring leaves it be.
// The tap walk on the export (a row swept, a card opened, Back) is the proof
// with real taps; this is the guard that fails on the old rows.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const back = vi.hoisted(() => ({ came: false }));
vi.mock("@/lib/ui/scrollReset", () => ({ cameBack: () => back.came }));

import { SWEEP_ATTR, WAIT_FRAMES, holdSweep, sweepWhere } from "../keptSweep";
import { keepSweep, sweepKept } from "../sweepKept";

/** The session's storage, as a browser keeps it. */
function store() {
  const items = new Map<string, string>();
  return {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => void items.set(k, String(v)),
    removeItem: (k: string) => void items.delete(k),
    clear: () => items.clear(),
    key: () => null,
    length: 0,
  };
}

let frames: Array<() => void> = [];
const flush = () => {
  const now = frames;
  frames = [];
  for (const f of now) f();
};

/** A row swept sideways: how far it can go (a right-to-left row's sweep runs below zero), and what listens to it. */
function row(max: number, rtl = false) {
  const on = new Map<string, Set<() => void>>();
  const r = {
    max,
    scrollLeft: 0,
    scrollTo({ left }: { left: number }) {
      const was = r.scrollLeft;
      r.scrollLeft = rtl ? Math.max(-r.max, Math.min(0, left)) : Math.max(0, Math.min(r.max, left));
      if (r.scrollLeft !== was) r.fire("scroll");
    },
    addEventListener: (type: string, f: () => void) => {
      if (!on.has(type)) on.set(type, new Set());
      on.get(type)!.add(f);
    },
    removeEventListener: (type: string, f: () => void) => void on.get(type)?.delete(f),
    fire: (type: string) => {
      for (const f of on.get(type) ?? []) f();
    },
    /** The reader sweeps it. */
    sweep(left: number) {
      r.fire("touchstart");
      r.scrollTo({ left });
    },
    listening: (type: string) => on.get(type)?.size ?? 0,
  };
  return r as typeof r & HTMLElement;
}

const SHELF = "/reading/ Fathers";

beforeEach(() => {
  back.came = false;
  frames = [];
  vi.stubGlobal("window", { sessionStorage: store() });
  vi.stubGlobal("requestAnimationFrame", (f: () => void) => frames.push(f));
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a sideways row, after Back", () => {
  it("is given back the sweep it was left at, at once, as it opens: 339px, and -338 in a right-to-left row", () => {
    keepSweep(SHELF, 339);
    back.came = true;
    const shelf = row(900);
    const hold = holdSweep(shelf, SHELF);
    expect(hold.given).toBe(true);
    expect(shelf.scrollLeft).toBe(339);

    keepSweep("/ar/reading/ Fathers", -338);
    const rtl = row(900, true);
    holdSweep(rtl, "/ar/reading/ Fathers");
    expect(rtl.scrollLeft).toBe(-338);
  });

  it("whose items are still arriving, is given it again each frame until it is wide enough", () => {
    keepSweep(SHELF, 339);
    back.came = true;
    const shelf = row(0);
    holdSweep(shelf, SHELF);
    expect(shelf.scrollLeft).toBe(0);
    flush();
    shelf.max = 200;
    flush();
    expect(shelf.scrollLeft).toBe(200);
    shelf.max = 900;
    flush();
    expect(shelf.scrollLeft).toBe(339);
    // Kept as it stands, on the frame after.
    flush();
    expect(sweepKept(SHELF)).toBe(339);
  });

  it("stops waiting once the reader's hand is on it, and after about a second and a half", () => {
    keepSweep(SHELF, 339);
    back.came = true;
    const shelf = row(0);
    holdSweep(shelf, SHELF);
    shelf.fire("touchstart");
    shelf.max = 900;
    flush();
    expect(shelf.scrollLeft).toBe(0);

    const late = row(0);
    holdSweep(late, SHELF);
    for (let i = 0; i < WAIT_FRAMES + 5; i++) flush();
    late.max = 900;
    flush();
    expect(late.scrollLeft).toBe(0);
    expect(frames).toEqual([]);
  });

  it("keeps the sweep as the reader moves it, once a frame", () => {
    back.came = true;
    const shelf = row(900);
    holdSweep(shelf, SHELF);
    shelf.sweep(120);
    shelf.sweep(480);
    expect(sweepKept(SHELF)).toBe(null);
    flush();
    expect(sweepKept(SHELF)).toBe(480);
  });

  it("lets everything go when it closes", () => {
    const shelf = row(900);
    const hold = holdSweep(shelf, SHELF);
    expect(shelf.listening("scroll")).toBe(1);
    hold.stop();
    for (const type of ["scroll", "touchstart", "wheel", "keydown", "pointerdown"]) expect(shelf.listening(type), type).toBe(0);
  });
});

describe("a sideways row, on a visit that went forward", () => {
  it("opens as it always did and lets the sweep an earlier visit left go", () => {
    keepSweep(SHELF, 339);
    const shelf = row(900);
    const hold = holdSweep(shelf, SHELF);
    expect(hold.given).toBe(false);
    expect(shelf.scrollLeft).toBe(0);
    back.came = true;
    expect(sweepKept(SHELF)).toBe(null);
  });
});

describe("where a row is kept", () => {
  const el = (name: string) => ({ getAttribute: (a: string) => (a === SWEEP_ATTR ? name : null) }) as unknown as Element;
  it("by the page's address, its query and the row's name, and its place among the page's rows of that name", () => {
    const a = el("More like this");
    const b = el("Fathers");
    const c = el("More like this");
    const page = { pathname: "/shop/icons/detail/", search: "?slug=christ-flag-greek" };
    expect(sweepWhere(a, "More like this", page, [a, b, c])).toBe("/shop/icons/detail/?slug=christ-flag-greek More like this");
    expect(sweepWhere(c, "More like this", page, [a, b, c])).toBe("/shop/icons/detail/?slug=christ-flag-greek More like this 2");
    expect(sweepWhere(b, "Fathers", { pathname: "/reading/", search: "" }, [a, b, c])).toBe("/reading/ Fathers");
  });
});

describe("the rows that hold it", () => {
  const code = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

  it("ScrollRail holds its sweep by its name, and its first centring leaves a sweep given back be", () => {
    const rail = code("components/ui/ScrollRail.tsx");
    expect(rail).toMatch(/const sweep = label \?\? "rail";\s*const given = useKeptSweep\(track, sweep\);/);
    expect(rail).toContain("data-sweep={sweep}");
    expect(rail).toMatch(/if \(!settled\.current && given\.current\) \{\s*settled\.current = true;/);
  });

  it("ChipScroller holds its sweep by its label, and its first centring leaves a sweep given back be", () => {
    const chips = code("components/ui/ChipScroller.tsx");
    expect(chips).toContain("const given = useKeptSweep(ref, label);");
    expect(chips).toContain("data-sweep={label}");
    expect(chips).toMatch(/if \(first && given\.current\) \{/);
  });

  it("the Reading mode page's shelves hold theirs", () => {
    const gallery = code("components/settings/ReadingModeGallery.tsx");
    expect(gallery).toContain("useKeptSweep(row, label);");
    expect(gallery).toMatch(/aria-label=\{label\} data-sweep=\{label\}/);
  });

  it("names the mark the rows carry as the hold reads it", () => {
    expect(SWEEP_ATTR).toBe("data-sweep");
  });
});
