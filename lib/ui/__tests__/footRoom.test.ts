// The foot of every page makes room for the mini player as well as the tab
// bar. Until build 80 it made room for the tab bar alone, so the now-playing
// card, which stands above the bar, covered each page's last lines (the
// owner, 2026-10-29: "it hides the bottom... where it says show words").

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

describe("the page's foot", () => {
  it("makes room for the mini player as well as the tab bar", () => {
    for (const cls of ["safe-pb", "safe-pb-reader"]) {
      const rule = css.match(new RegExp(`html\\.is-native \\.${cls} \\{[^}]*\\}`))?.[0];
      expect(rule, cls).toBeDefined();
      expect(rule, cls).toContain("var(--tab-bar-h)");
      expect(rule, cls).toContain("var(--now-playing-h)");
      expect(rule, cls).toContain("var(--readings-flow-h)");
    }
  });

  it("raises everything that floats over the foot above the readings bar too", () => {
    // Build 81, the owner's photo: today's readings bar ("Next: Gospel")
    // stood over the Bible's chapter pill, which rose for the mini player
    // only. Every piece placed above the tab bar and the mini player names
    // the readings bar's height as well.
    const walk = (dir: string): string[] =>
      fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true }).flatMap((e) => {
        const rel = path.posix.join(dir, e.name);
        if (e.isDirectory()) return e.name === "__tests__" ? [] : walk(rel);
        return /\.tsx?$/.test(e.name) ? [rel] : [];
      });
    const offenders: string[] = [];
    for (const rel of walk("components")) {
      const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
      for (const m of src.matchAll(/calc\(var\(--tab-bar-h\) \+ var\(--now-playing-h\)[^"`]*/g)) {
        if (!m[0].includes("--readings-flow-h")) offenders.push(`${rel}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
    expect(css).toMatch(/:root \{[^}]*--readings-flow-h: 0px;/);
  });

  it("keeps no tab bar room under a layer that covers the tab bar", () => {
    // The welcome questions cover the tab bar, so their foot makes room for
    // the screen's edge only, and their way on reaches down over that edge.
    // With the tab bar's room it stood about 100px clear of the bottom, the
    // cards showing under it (build 81, the owner's photo).
    const edge = css.match(/html\.is-native \.safe-pb-edge \{[^}]*\}/)?.[0];
    expect(edge).toBeDefined();
    expect(edge).toContain("var(--inset-bottom)");
    expect(edge).not.toContain("--tab-bar-h");
    const flow = fs.readFileSync(path.join(process.cwd(), "components/onboarding/OnboardingFlow.tsx"), "utf8");
    expect(flow).toMatch(/fixed inset-0 z-\[100\][^`]*\bsafe-pb-edge\b/);
    expect(flow).not.toMatch(/fixed inset-0 z-\[100\][^`]*\bsafe-pb(?!-)\b/);
    const foot = fs.readFileSync(path.join(process.cwd(), "components/onboarding/LookingFor.tsx"), "utf8");
    expect(foot).toMatch(/className="ob-foot [^"]*\bsticky\b/);
    expect(css).toMatch(/\.ob-foot \{[^}]*bottom: calc\(-1 \* var\(--inset-bottom, 0px\)\)/);
  });

  it("gives the card no room when no card is showing", () => {
    // The default is 0, set before any rule that raises it.
    expect(css).toMatch(/--now-playing-h:\s*0px;/);
  });
});
