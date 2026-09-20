// The pre-paint script applies a stored palette before React runs, from a
// hand-kept list of ids. A palette added to READING_THEMES but not to that
// list would flash: the default palette first, then the chosen one a frame
// after hydration, which is the one thing the script exists to prevent.
//
// The second half holds the CSS side: every palette id has to have its
// token block in app/globals.css, or setting the attribute does nothing and
// a reader who chose it sees the default palette with no error anywhere.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PREPAINT_THEME_IDS, THEME_PREPAINT } from "@/lib/reader/prepaint";
import { READING_THEMES, READING_THEME_KEY } from "@/lib/reader/readingModes";

const css = fs.readFileSync(path.resolve(__dirname, "../../../app/globals.css"), "utf8");

/** Does globals.css carry a token block for this palette id? */
export function hasTokenBlock(id: string): boolean {
  return css.includes(`html[data-reading-mode="${id}"] {`);
}

describe("the pre-paint allowlist", () => {
  it("names every READING_THEMES id except default", () => {
    for (const t of READING_THEMES) {
      if (t.id === "default") continue;
      expect(PREPAINT_THEME_IDS, `${t.id} is missing from PREPAINT_THEME_IDS`).toContain(t.id);
    }
  });

  it("names nothing READING_THEMES does not", () => {
    const known = new Set<string>(READING_THEMES.map((t) => t.id));
    for (const id of PREPAINT_THEME_IDS) expect(known.has(id), id).toBe(true);
  });

  it("is what the script actually checks, under the real storage key", () => {
    expect(THEME_PREPAINT).toContain(`'${READING_THEME_KEY}'`);
    for (const id of PREPAINT_THEME_IDS) expect(THEME_PREPAINT).toContain(`"${id}"`);
    expect(THEME_PREPAINT).toContain("data-reading-mode");
  });
});

describe("the token blocks", () => {
  it("exist in globals.css for every palette except default", () => {
    for (const t of READING_THEMES) {
      if (t.id === "default") continue;
      expect(hasTokenBlock(t.id), `no html[data-reading-mode="${t.id}"] block`).toBe(true);
    }
  });

  it("remap the six palette tokens in every collection palette", () => {
    for (const t of READING_THEMES.filter((t) => t.collection)) {
      const start = css.indexOf(`html[data-reading-mode="${t.id}"] {`);
      const block = css.slice(start, css.indexOf("}", start));
      for (const token of [
        "--color-night:",
        "--color-night-soft:",
        "--color-night-deep:",
        "--color-paper:",
        "--color-gold:",
        "--color-gold-soft:",
        "--color-gold-pale:",
      ]) {
        expect(block, `${t.id} lacks ${token}`).toContain(token);
      }
    }
  });
});
