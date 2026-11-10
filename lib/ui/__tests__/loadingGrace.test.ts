// A page's outline waits a moment before it shows (1.9, build 89 note 4;
// lib/ui/loadingGrace.ts has the why and the measurements).
//
// What a reader would notice if this broke: grey boxes flashing between two
// pages, the real page arriving a third of a second late behind them; or, the
// other way, a page that is already on screen going blank because its outline
// held off where nothing was on its way.

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
    expect(src).toContain('<div data-route-loading="" className="contents">');
  });

  it("an outline that did come first is not pictured as a page arriving", () => {
    const bridge = read("components/nav/RouteTransition.tsx");
    const effect = bridge.slice(bridge.indexOf("useIsoLayoutEffect(() => {"), bridge.indexOf("}, [pathname]);"));
    const held = effect.indexOf('if (document.querySelector("[data-route-loading]")) return;');
    expect(held).toBeGreaterThan(-1);
    expect(held).toBeLessThan(effect.indexOf("beginNav(note);"));
    // And the transition React started for it is over at once.
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/::view-transition-group\(\.route-mark\),\s*::view-transition-old\(\.route-mark\),\s*::view-transition-new\(\.route-mark\) \{\s*animation-duration: 0s;\s*\}/);
  });
});
