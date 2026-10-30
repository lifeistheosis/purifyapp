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

  it("follows the card as it draws in to its pill, so nothing is left under either", () => {
    // 1.8, the owner's pick B of r3-05: on a scroll down the card draws in to
    // a 40px pill over the tabs, and every page's foot keeps room for it as it
    // is at that moment, full or drawn in. In the apps the room is the card
    // itself; on the web it carries its own 6px pad.
    const room = (selector: string) =>
      css.match(new RegExp(`(?:^|\\n)${selector} \\{\\s*--now-playing-h: (\\d+)px;\\s*\\}`))?.[1];
    expect(room("html\\.is-native\\.has-now-playing")).toBe("56");
    expect(room("html\\.is-native\\.has-now-playing\\.now-playing-drawn")).toBe("40");
    expect(room("html\\.has-now-playing")).toBe("62");
    expect(room("html\\.has-now-playing\\.now-playing-drawn")).toBe("46");
    // The surface is as tall as the room says: 3.5rem is 56px, 2.5rem 40px.
    expect(css).toMatch(/\n\.mini-player \{[^}]*height: 3\.5rem;/);
    expect(css).toMatch(/\[data-mini-player\]\[data-drawn\] \.mini-player \{[^}]*height: 2\.5rem;/);
    // The class that gives the room back goes on and off with the pill, and
    // what it gives back is the difference, 16px, on the web and in the apps.
    const bar = fs.readFileSync(path.join(process.cwd(), "components/prayers/NowPlayingBar.tsx"), "utf8");
    expect(bar).toMatch(/if \(!drawn\) return;[\s\S]*?root\.classList\.add\("now-playing-drawn"\);[\s\S]*?root\.classList\.remove\("now-playing-drawn"\);/);
    const given = Number(bar.match(/const ROOM_GIVEN_BACK = (\d+);/)?.[1]);
    expect(given).toBe(16);
    expect(Number(room("html\\.is-native\\.has-now-playing")) - Number(room("html\\.is-native\\.has-now-playing\\.now-playing-drawn"))).toBe(given);
    expect(Number(room("html\\.has-now-playing")) - Number(room("html\\.has-now-playing\\.now-playing-drawn"))).toBe(given);
  });

  it("keeps the card's room at a page's very end, rather than move the page under the reader", () => {
    // Giving 16px back there would make the browser move the page to its new
    // end as the pill forms. The watchers are told whenever the foot moves,
    // so a move the page makes is never read as the reader scrolling up.
    const bar = fs.readFileSync(path.join(process.cwd(), "components/prayers/NowPlayingBar.tsx"), "utf8");
    expect(bar).toMatch(/const left = root\.scrollHeight - \(window\.scrollY \+ window\.innerHeight\);\s*if \(left < ROOM_GIVEN_BACK\) return;/);
    expect(bar.match(/noteFootMoved\(\);/g)?.length).toBe(4);
  });

  it("gives the card no room when no card is showing", () => {
    // The default is 0, set before any rule that raises it.
    expect(css).toMatch(/--now-playing-h:\s*0px;/);
  });
});
