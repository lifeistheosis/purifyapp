// A page reads its place from the address it is opened at, never from the
// address of the page being left (1.9, Gate 2.0's jumps as pages arrive).
//
// Next writes a new address to the window as the page arriving commits,
// after that page has rendered. The council's canons, opened at Canon I
// (`#s2`) from a heresy's page, read the heresy's address as they rendered:
// no place, so their first chapter, and the book's cover over it
// (components/reading/OpeningCover.tsx). Then the address came, the chapter
// was Canon I, the cover was no longer over the chapter the book opened on,
// and it went: the page jumped up 270px under the reader's eyes, five ways
// in (docs/1.9-build/notes/gate-2/run-tip.md, 162, 164, 173, 174, 184).
//
// What it holds: the tap names the address it opens (lib/nav/
// addressOpening.ts, from components/nav/RouteTransition.tsx), the page
// arriving reads its place from that until the window says it, the chapter
// the book opened on is the one asked for from the first read, and the page
// being left still reads its own.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onOpeningNow, targetNow } from "@/components/saints/useWorkPlace";
import { hashFor, noteOpening, openingWritten } from "@/lib/nav/addressOpening";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const code = (rel: string) =>
  fs
    .readFileSync(path.join(ROOT, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const ORIGIN = "https://localhost";
let loc: { pathname: string; hash: string; href: string; origin: string };
/** The window at an address, as the router leaves it. */
function at(address: string) {
  const url = new URL(address, ORIGIN);
  loc.pathname = url.pathname;
  loc.hash = url.hash;
  loc.href = url.href;
}

beforeEach(() => {
  loc = { pathname: "/", hash: "", href: `${ORIGIN}/`, origin: ORIGIN };
  const kept = new Map<string, string>();
  vi.stubGlobal("window", { location: loc, addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => kept.get(k) ?? null,
    setItem: (k: string, v: string) => void kept.set(k, v),
    removeItem: (k: string) => void kept.delete(k),
  });
  openingWritten();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const CANONS = "/councils/first-constantinople/the-seven-canons/";

describe("a council's canons opened at Canon I from a heresy's page", () => {
  it("open on Canon I, with the cover over it, from the first read to the address written", () => {
    at("/heresies/apollinarianism/");
    noteOpening(`${CANONS}#s2`);
    // Rendered before the router has written the address: the tapped one is read.
    expect(targetNow("councils/first-constantinople", "the-seven-canons", CANONS)).toBe("#s2");
    expect(onOpeningNow("councils/first-constantinople", "the-seven-canons", 1, CANONS)).toBe(true);
    // The address is written as the page commits.
    at(`${CANONS}#s2`);
    openingWritten();
    expect(targetNow("councils/first-constantinople", "the-seven-canons", CANONS)).toBe("#s2");
    // The same chapter the book opened on: the cover stays where it was drawn.
    expect(onOpeningNow("councils/first-constantinople", "the-seven-canons", 1, CANONS)).toBe(true);
  });

  it("opened plainly, open on the first chapter, the cover over it, before and after", () => {
    const DOC = "/councils/ancyra-314/the-twenty-five-canons/";
    at("/councils/ancyra-314/");
    noteOpening(DOC);
    expect(targetNow("councils/ancyra-314", "the-twenty-five-canons", DOC)).toBe("first");
    expect(onOpeningNow("councils/ancyra-314", "the-twenty-five-canons", 1, DOC)).toBe(true);
    at(DOC);
    openingWritten();
    expect(onOpeningNow("councils/ancyra-314", "the-twenty-five-canons", 1, DOC)).toBe(true);
  });
});

describe("the address being opened", () => {
  it("is the window's once it is the page's own", () => {
    at("/saints/basil-the-great/on-the-holy-spirit/#s4");
    noteOpening("/saints/gregory-the-dialogist/morals-on-the-book-of-job/#s7");
    expect(hashFor("/saints/basil-the-great/on-the-holy-spirit/")).toBe("#s4");
    // The page being left, drawn again while the next is on its way, keeps its own place.
    expect(targetNow("basil-the-great", "on-the-holy-spirit", "/saints/basil-the-great/on-the-holy-spirit/")).toBe("#s4");
  });

  it("is the tapped one while it is on its way, whatever the trailing slash", () => {
    at("/reading/collections/anger/");
    noteOpening("/saints/john-of-damascus/exact-exposition-of-the-orthodox-faith/#s3");
    expect(hashFor("/saints/john-of-damascus/exact-exposition-of-the-orthodox-faith")).toBe("#s3");
  });

  it("is none for a page no tap named, and for a link that leaves the app", () => {
    at("/discover/");
    expect(hashFor("/councils/ephesus/the-third-letter-of-cyril/")).toBe("");
    noteOpening("https://en.wikisource.org/wiki/Philokalia#s2");
    expect(hashFor("/wiki/Philokalia")).toBe("");
  });

  it("is forgotten once the router has written an address", () => {
    at("/heresies/origenism/");
    noteOpening(`${CANONS}#s3`);
    openingWritten();
    expect(hashFor(CANONS)).toBe("");
  });
});

describe("the wiring", () => {
  it("every tap names the link it opens, before anything the tap does, and the commit forgets it", () => {
    const route = code("components/nav/RouteTransition.tsx");
    const tap = /const onTap = \(event: MouseEvent\) => \{([\s\S]*?)\n {4}\};/.exec(route);
    expect(tap, "the tap listener").not.toBeNull();
    expect(tap![1]).toMatch(/closest\("a\[href\]"\)/);
    expect(tap![1]).toMatch(/noteOpening\(link\.href\)/);
    expect(route).toMatch(/document\.addEventListener\("click", onTap, true\)/);
    const layout = /useIsoLayoutEffect\(\(\) => \{([\s\S]*?)\}, \[pathname\]\);/.exec(route);
    expect(layout![1]).toMatch(/openingWritten\(\)/);
  });

  it("both readers and the cover read the place with the page's own path", () => {
    const place = code("components/saints/useWorkPlace.ts");
    const target = /export function targetNow\(([\s\S]*?)\n\}/.exec(place);
    expect(target![1]).toMatch(/const hash = hashFor\(pathname\);/);
    expect(target![1]).not.toMatch(/location/);
    expect(place.match(/const pathname = usePathname\(\) \?\? "";/g)).toHaveLength(2);
  });
});
