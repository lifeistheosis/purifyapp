// The one search arrives and leaves as a page does (build 95 note 5).
//
// His word, 2026-11-13 07:28 UTC, on build 96, with a screenshot of Discover:
// "pressing the search created a weird visual bug and isn't smooth when
// transitioning to that acreen". CLAUDE.md: every page switch is a
// transition, in the house's motion; reduced motion stays still.
//
// Filmed on the export of 95e9706c at 390 and 412, with touch and motion on
// (docs/1.9-build/notes/build-95.md, note 5):
//   1. The frame after the tap was an empty dark screen with only the field
//      at its foot. The screen, its ground and its field were drawn whole in
//      the tap's frame and only the words faded in (.search-in, on the body
//      alone), so Discover was cut away at once and the words came after.
//   2. The screen left by a cut: one frame and Discover was back, and a row
//      chosen cut back to Discover before its own page came.
//
// Read as text: the screen is a client component and vitest runs in node
// (vitest.config.ts). The frames are measured on the built app by
// scripts/search-motion-walk.mjs.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
const code = (file: string) =>
  read(file)
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

/** Every rule whose selector list is exactly `selector`, its body joined. */
const rule = (selector: string) => {
  const out: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const selectors = m[1].split(",").map((s) => s.trim());
    if (selectors.includes(selector)) out.push(m[2]);
  }
  return out.join("\n");
};
const keyframes = (name: string) => new RegExp(`@keyframes ${name} \\{([^}]*\\})\\s*\\}`).exec(css)?.[1] ?? "";

const SCREEN = "components/search/CommandPalette.tsx";
const screen = code(SCREEN);

/** The screen's own element: its opening tag, from `<div` to the first `>` that closes it. */
const screenTag = (() => {
  const at = screen.indexOf('data-search-screen=""');
  const open = screen.lastIndexOf("<div", at);
  return at < 0 || open < 0 ? "" : screen.slice(open, screen.indexOf("\n    >", at));
})();

/** The body of a function declared as `const <name> = ...`, up to the next declaration at its depth. */
const fn = (name: string) => {
  const at = screen.indexOf(`const ${name} = `);
  if (at < 0) return "";
  const next = screen.slice(at + 1).search(/\n {2}(const|function|useEffect|useLayoutEffect|if \(|\/\*)/);
  return screen.slice(at, next < 0 ? undefined : at + 1 + next);
};

describe("the one search arrives as a page does (build 95 note 5)", () => {
  it("covers the page whole, its ground and its field with it, in the time a page takes to leave", () => {
    expect(/className="([^"]*)"/.exec(screenTag)?.[1].split(" ")).toContain("search-screen");
    const arrive = rule(".search-screen");
    expect(arrive).toMatch(/animation:\s*search-cover var\(--duration-route-exit\) var\(--ease-house\) backwards;/);
    expect(keyframes("search-cover")).toMatch(/^\s*from \{ opacity: 0; \}\s*$/);
    // Never `both`: a fill that outlives the fade leaves a stacking context
    // for good (lib/ui/__tests__/noPermanentStackingContext.test.ts).
    expect(arrive).not.toMatch(/\bboth\b/);
  });

  it("brings its words and its field in after the ground, in the time a page takes to arrive, still with no rise", () => {
    expect(rule(".search-in")).toMatch(/animation:\s*search-in var\(--duration-route-enter\) var\(--ease-house\) 40ms backwards;/);
    expect(keyframes("search-in")).toMatch(/^\s*from \{ opacity: 0; \}\s*$/);
    expect(screen).toContain('className="search-in flex min-h-0 flex-1 flex-col overflow-y-auto');
    // The field stands where the tab bar fades: drawn with the ground, the
    // two read through each other for two frames (the mend's own film).
    expect(screen).toContain('data-search-dock="" className={cn("search-in search-dock shrink-0"');
  });
});

describe("the one search leaves as a page does (build 95 note 5)", () => {
  it("lets its words and field go first, its ground 40ms after, lets a finger through, and is gone when the fade ends", () => {
    const leave = rule(".search-screen[data-leaving]");
    expect(leave).toMatch(/animation:\s*search-uncover var\(--duration-route-exit\) var\(--ease-house\) 40ms forwards;/);
    expect(leave).toMatch(/pointer-events:\s*none;/);
    // Faded whole at once, its words read through the page's for two frames
    // (the mend's own film): the words go first, as a page being left does.
    expect(rule(".search-screen[data-leaving] .search-in")).toMatch(/animation:\s*search-uncover var\(--duration-route-exit\) var\(--ease-house\) forwards;/);
    expect(keyframes("search-uncover")).toMatch(/^\s*to \{ opacity: 0; \}\s*$/);
    expect(screenTag).toContain("data-leaving={leaving || undefined}");
    expect(screenTag).toMatch(/onAnimationEnd=\{\(e\) => \{\s*if \(e\.target === e\.currentTarget && e\.animationName === "search-uncover"\) gone\(\);\s*\}\}/);
    // A fade that never ends (the app put away mid-fade) still lets it go.
    expect(screen).toMatch(/if \(!leaving\) return;\s*const grace = window\.setTimeout\(gone, LEAVE_GRACE_MS\);/);
  });

  it("leaves that way however the reader leaves: the plate, Back, Escape, the shade, Cmd+K, a row chosen", () => {
    const close = fn("close");
    expect(close).toContain("setLeaving(true)");
    // The keyboard goes with the screen, not while it fades: let go of
    // mid-fade, it turned the words being typed into the results under it.
    expect(close).not.toContain(".blur()");
    // setOpen(false) is said in one place, `gone`: as the fade ends, or at
    // once under the motion switch.
    expect(screen.match(/setOpen\(false\)/g)?.length).toBe(1);
    expect(fn("gone")).toContain("setOpen(false)");
    for (const way of ["go", "goTo"]) {
      expect(fn(way)).toContain("close();");
      expect(fn(way)).not.toContain("setOpen(false)");
    }
    expect(screen).toMatch(/if \(covering\) \{\s*close\(\);/);
    expect(screen).toMatch(/onClick=\{close\} className="absolute inset-0 bg-night\/90 max-md:hidden"/);
  });

  it("gives the page back as it begins to leave: the tab bar comes back with it, the page scrolls, Back is the page's", () => {
    expect(screen).toContain("const covering = open && !leaving;");
    expect(screen).toMatch(/useEffect\(\(\) => \{\s*if \(!covering\) return;\s*setOverlayOpen\(true\);\s*lockBodyScroll\(\);/);
    expect(screen).toContain("useAndroidBack(covering, close);");
  });

  it("opened again as it goes, it stays", () => {
    const show = fn("show");
    expect(show).toContain("setLeaving(false)");
    expect(show).toContain("setOpen(true)");
  });
});

describe("the one search is still under the motion switch (build 95 note 5)", () => {
  it("arrives and leaves at once, the stylesheet and the screen alike", () => {
    // Weighed as the rules they quiet: the leaving rule's two classes are
    // matched by an escape of two (lib/ui/__tests__/motionDoctrine.test.ts).
    expect(rule(':where([data-motion="reduce"]) .search-screen')).toMatch(/animation:\s*none;/);
    expect(rule(':where([data-motion="reduce"]) .search-screen[data-leaving]')).toMatch(/animation:\s*none;/);
    expect(rule(':where([data-motion="reduce"]) .search-screen[data-leaving] .search-in')).toMatch(/animation:\s*none;/);
    expect(rule(':where([data-motion="reduce"]) .search-in')).toMatch(/animation:\s*none;/);
    expect(fn("close")).toMatch(/if \(document\.documentElement\.dataset\.motion === "reduce"\) \{\s*gone\(\);\s*return;\s*\}/);
  });
});
