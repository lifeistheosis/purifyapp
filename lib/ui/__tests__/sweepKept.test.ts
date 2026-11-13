// Back returns the reader to where they were, a row's sweep included (the
// pre-build gate's first rule; lib/ui/sweepKept.ts).
//
// The walk of build 95 notes 18 and 27, 2026-11-13, at 390px in English and
// Arabic: Settings' reading modes swept to Councils (339px, and -338 in
// Arabic), Councils' goal tapped, a door in its sheet taken, then Back. The
// page came back to where it was (632px down) and the row stood at 0, Councils
// out of sight. What this holds, each of which that row failed:
//   - the sweep is kept by the page's address and the row's name, and given
//     back only to a reader who came back by a step through history;
//   - a visit that goes forward to the page begins as it always did, and lets
//     the kept sweep go;
//   - the row asks for it as it opens and gives it back at once, in place of
//     the move that brings the page that is on into sight, and holds it until
//     the reader's own hand is on the row;
//   - the sweep is kept as the row moves, by the reader or by that move.
// The walk on the export (Back from a door, English and Arabic) is the proof
// with real taps; this is the guard that fails on the old row.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const back = vi.hoisted(() => ({ came: false }));
vi.mock("@/lib/ui/scrollReset", () => ({ cameBack: () => back.came }));

import { forgetSweep, keepSweep, sweepKept } from "../sweepKept";

/** The session's storage, as a browser keeps it. */
function store(fail: { get?: boolean; set?: boolean } = {}) {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (k: string) => {
      if (fail.get) throw new Error("closed");
      return items.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (fail.set) throw new Error("full");
      items.set(k, String(v));
    },
    removeItem: (k: string) => void items.delete(k),
    clear: () => items.clear(),
    key: () => null,
    length: 0,
  };
}

const SETTINGS = "/settings modes";

beforeEach(() => {
  back.came = false;
  vi.stubGlobal("window", { sessionStorage: store() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a row's sweep, kept for the reader who comes back", () => {
  it("gives the sweep back after Back, as the walk left it: 339px, and -338 in Arabic", () => {
    keepSweep(SETTINGS, 339);
    back.came = true;
    expect(sweepKept(SETTINGS)).toBe(339);
    keepSweep(SETTINGS, -338);
    expect(sweepKept(SETTINGS)).toBe(-338);
  });

  it("gives nothing to a visit that went forward to the page, which opens as it always did", () => {
    keepSweep(SETTINGS, 339);
    back.came = false;
    expect(sweepKept(SETTINGS)).toBeNull();
  });

  it("lets the sweep go on a forward visit, so a later Back finds what that visit left", () => {
    keepSweep(SETTINGS, 339);
    forgetSweep(SETTINGS);
    back.came = true;
    expect(sweepKept(SETTINGS)).toBeNull();
  });

  it("keeps each row by its page's address and its name, the newest 24", () => {
    for (let i = 0; i < 30; i++) keepSweep(`/page-${i} modes`, i * 10);
    keepSweep(SETTINGS, 339);
    back.came = true;
    expect(sweepKept(SETTINGS)).toBe(339);
    expect(sweepKept("/page-29 modes")).toBe(290);
    expect(sweepKept("/page-0 modes")).toBeNull();
    expect(sweepKept("/elsewhere modes")).toBeNull();
    const raw = (window as unknown as { sessionStorage: ReturnType<typeof store> }).sessionStorage.items.get("purify.sweep");
    expect(Object.keys(JSON.parse(raw!))).toHaveLength(24);
  });

  it("opens as on a fresh visit where the storage is closed, full or holds something else", () => {
    vi.stubGlobal("window", { sessionStorage: store({ get: true, set: true }) });
    back.came = true;
    expect(() => keepSweep(SETTINGS, 339)).not.toThrow();
    expect(sweepKept(SETTINGS)).toBeNull();
    const odd = store();
    odd.items.set("purify.sweep", JSON.stringify({ [SETTINGS]: "339", other: [1] }));
    vi.stubGlobal("window", { sessionStorage: odd });
    expect(sweepKept(SETTINGS)).toBeNull();
    odd.items.set("purify.sweep", "not json");
    expect(sweepKept(SETTINGS)).toBeNull();
    expect(() => keepSweep(SETTINGS, Number.NaN)).not.toThrow();
    expect(sweepKept(SETTINGS)).toBeNull();
  });

  it("keeps nothing and gives nothing on the server", () => {
    vi.unstubAllGlobals();
    expect(typeof window).toBe("undefined");
    expect(() => keepSweep(SETTINGS, 339)).not.toThrow();
    expect(sweepKept(SETTINGS)).toBeNull();
  });
});

describe("Settings' reading modes keep their sweep across Back", () => {
  const ROOT = process.cwd();
  const PAGES = fs
    .readFileSync(path.join(ROOT, "components/settings/ReadingModePages.tsx"), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const hook = PAGES.slice(PAGES.indexOf("function useOnInSight("), PAGES.indexOf("export type ReadingMode"));

  it("names the row by the screen's own address", () => {
    expect(PAGES).toMatch(/useOnInSight\(row, [^\n]*`\$\{usePathname\(\)\} modes`\)/);
  });

  it("asks for the kept sweep as the row opens and gives it back at once, before the page that is on is brought into sight", () => {
    const ask = hook.indexOf("sweepKept(where)");
    const give = hook.indexOf('box.scrollTo({ left: back.current, behavior: "instant" })');
    const move = hook.indexOf("inSightBy(");
    expect(ask).toBeGreaterThan(-1);
    expect(give).toBeGreaterThan(ask);
    expect(move).toBeGreaterThan(give);
    expect(hook).toMatch(/useLayoutEffect\(\(\) => \{[\s\S]*?sweepKept\(where\)/);
  });

  it("lets the sweep an earlier visit left go on a visit that went forward", () => {
    expect(hook).toMatch(/if \(back\.current === null\) forgetSweep\(where\)/);
  });

  it("keeps the sweep as the row moves, and lets a given-back sweep go once the reader's hand is on the row", () => {
    expect(hook).toMatch(/addEventListener\("scroll", keep, \{ passive: true \}\)/);
    expect(hook).toMatch(/keepSweep\(where, box\.scrollLeft\)/);
    expect(hook).toMatch(/back\.current = null/);
    const hand = PAGES.match(/const HAND = \[([^\]]*)\]/)?.[1] ?? "";
    for (const type of ["touchstart", "wheel", "keydown", "pointerdown"]) expect(hand).toContain(`"${type}"`);
  });
});
