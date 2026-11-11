// A page's outline waits a moment before it shows (1.9, build 89 note 4;
// lib/ui/loadingGrace.ts has the why and the measurements).
//
// What a reader would notice if this broke: grey boxes flashing between two
// pages, the real page arriving a third of a second late behind them; or, the
// other way, a page that is already on screen going blank because its outline
// held off where nothing was on its way; or a page that was slow to come cut
// in over its outline, and its outline cut in before it.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GRACE_MS, KEEP_MS, momentFor, onTheWay, resetLoadingGraceForTests } from "../loadingGrace";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

function loadingFiles(dir = path.join(ROOT, "app")): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...loadingFiles(full));
    else if (entry.name === "loading.tsx") out.push(path.relative(ROOT, full).replace(/\\/g, "/"));
  }
  return out.sort();
}

describe("when an outline holds off", () => {
  it("while the reader is on their way: the page being rendered is not yet the address in the bar", () => {
    expect(onTheWay("/discover", "/prayers")).toBe(true);
    expect(onTheWay("/saints/basil-the-great", "/saints/")).toBe(true);
  });

  it("never for a page already on screen, which is not a transition and has nothing to keep in front of the reader", () => {
    expect(onTheWay("/discover", "/discover")).toBe(false);
    // The export's trailing slash is the same page.
    expect(onTheWay("/discover", "/discover/")).toBe(false);
  });

  it("never on the server", () => {
    expect(onTheWay("/discover", null)).toBe(false);
  });
});

describe("the moment", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetLoadingGraceForTests();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is one promise for as long as the reader is on their way to a page", () => {
    const first = momentFor("/discover");
    expect(momentFor("/discover")).toBe(first);
    expect(momentFor("/discover/")).toBe(first);
  });

  it("passes after the grace, and not before", async () => {
    let passed = false;
    void momentFor("/discover").then(() => {
      passed = true;
    });
    await vi.advanceTimersByTimeAsync(GRACE_MS - 1);
    expect(passed).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(passed).toBe(true);
  });

  it("is a new one for another page, and for the same page later", () => {
    const first = momentFor("/discover");
    expect(momentFor("/saints")).not.toBe(first);
    const again = momentFor("/discover");
    expect(again).not.toBe(first);
    vi.advanceTimersByTime(KEEP_MS + 1);
    expect(momentFor("/discover")).not.toBe(again);
  });

  it("is short: a slow page still answers the tap before a reader wonders", () => {
    expect(GRACE_MS).toBeGreaterThanOrEqual(120);
    expect(GRACE_MS).toBeLessThanOrEqual(250);
  });
});

describe("the wiring", () => {
  it("every route's outline is wrapped, so none can flash or be pictured as a page", () => {
    const files = loadingFiles();
    expect(files.length).toBeGreaterThanOrEqual(12);
    for (const file of files) {
      const src = read(file);
      const exported = /export default function \w+\(\) \{\s*return \(\s*<AfterAMoment>\s*<\w+ \/>\s*<\/AfterAMoment>\s*\);\s*\}/.test(src);
      expect(exported, `${file}: its default export must be its outline inside <AfterAMoment>`).toBe(true);
      expect(src, file).toContain('import { AfterAMoment } from "@/components/ui/AfterAMoment";');
    }
  });

  it("the wrapper waits only in a browser and only on the way, and draws nothing itself", () => {
    const src = read("components/ui/AfterAMoment.tsx");
    expect(src).toContain('if (typeof window !== "undefined" && onTheWay(pathname, window.location.pathname)) {');
    expect(src).toContain("use(momentFor(pathname));");
    expect(src).toContain('<div ref={outline} data-route-loading="" className="contents">');
  });

  it("an outline that did come first is pictured as its page arriving: it is not cut in", () => {
    // It was left out of the picture until the week 1.9 was finished, and so
    // was put in place with no motion at all (the mark's own picture takes no
    // time: the rule below). Whatever arrives is pictured now.
    const bridge = read("components/nav/RouteTransition.tsx");
    const effect = bridge.slice(bridge.indexOf("useIsoLayoutEffect(() => {"), bridge.indexOf("}, [pathname]);"));
    expect(effect).not.toContain("data-route-loading");
    expect(effect).toMatch(/if \(note === "traverse" \|\| !canMove\(\)\) return;\s*(\/\/[^\n]*\n\s*)*beginNav\(note\);/);
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/::view-transition-group\(\.route-mark\),\s*::view-transition-old\(\.route-mark\),\s*::view-transition-new\(\.route-mark\) \{\s*animation-duration: 0s;\s*\}/);
  });

  it("picturing it keeps the page back by next to nothing: React keeps an outline it has shown for 300ms whatever we do", () => {
    // The reason it was once left out of the picture: React holds its next
    // change until a picture is over, and the page behind the outline would
    // wait out the outline's 340ms. But React already keeps a shown outline
    // for 300ms (an outline that flashed would be worse than none), so the
    // picture costs the difference and no more. Read from the React that Next
    // ships: if this number moves, measure again with scripts/route-motion.mjs.
    const react = read("node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.production.js");
    expect(react).toMatch(/globalMostRecentFallbackTime \+ 300 - now\(\)/);
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    // The page arriving: 40ms held, 300ms settling.
    expect(css).toMatch(/::view-transition-new\(root\.nav-forward\) \{\s*animation-name: route-settle;\s*animation-duration: 300ms;\s*\}/);
  });

  it("and it says when it is taken out, from its own cleanup, while it still stands in the page", () => {
    const src = read("components/ui/AfterAMoment.tsx");
    expect(src).toMatch(/useIsoLayoutEffect\(\(\) => \{\s*const el = outline\.current;\s*return \(\) => \{\s*if \(el\) outlineLeft\(el\);\s*\};\s*\}, \[\]\);/);
    // A layout effect, not an effect: an effect's cleanup runs after React has taken the outline out.
    expect(src).toContain('const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;');
  });
});
