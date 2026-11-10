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

import { PREPAINT_LOOKS_DARK, PREPAINT_LOOKS_LIGHT, PREPAINT_THEME_IDS, THEME_PREPAINT } from "@/lib/reader/prepaint";
import { READING_THEMES, READING_THEME_KEY, themeAttributes, type ReadingTheme } from "@/lib/reader/readingModes";

const css = fs.readFileSync(path.resolve(__dirname, "../../../app/globals.css"), "utf8");

/** Does globals.css carry a token block for this palette id? A look's is under its own attribute. */
export function hasTokenBlock(id: string): boolean {
  const look = READING_THEMES.some((t) => t.id === id && t.look);
  return css.includes(look ? `html[data-look="${id}"] {` : `html[data-reading-mode="${id}"] {`);
}

/** The script, run against a device that stored `stored`: what it leaves on <html>. */
function prepaint(stored: string | null): Record<string, string> {
  const attrs: Record<string, string> = {};
  const storage = { getItem: (k: string) => (k === READING_THEME_KEY ? stored : null) };
  const doc = { documentElement: { setAttribute: (k: string, v: string) => void (attrs[k] = v) } };
  new Function("localStorage", "document", THEME_PREPAINT)(storage, doc);
  return attrs;
}

describe("the pre-paint allowlist", () => {
  it("names every READING_THEMES id except default, a look in the list of what it is worn over", () => {
    for (const t of READING_THEMES) {
      if (t.id === "default") continue;
      const list = t.look === "dark" ? PREPAINT_LOOKS_DARK : t.look === "light" ? PREPAINT_LOOKS_LIGHT : PREPAINT_THEME_IDS;
      expect(list, `${t.id} is missing from its pre-paint list`).toContain(t.id);
    }
  });

  it("names nothing READING_THEMES does not, and nothing twice", () => {
    const known = new Set<string>(READING_THEMES.map((t) => t.id));
    const all = [...PREPAINT_THEME_IDS, ...PREPAINT_LOOKS_DARK, ...PREPAINT_LOOKS_LIGHT];
    for (const id of all) expect(known.has(id), id).toBe(true);
    expect(new Set(all).size).toBe(all.length);
  });

  it("leaves on the page exactly what the controller would, for every palette", () => {
    for (const t of READING_THEMES) {
      const { mode, look } = themeAttributes(t.id as ReadingTheme);
      const want: Record<string, string> = {};
      if (mode) want["data-reading-mode"] = mode;
      if (look) want["data-look"] = look;
      expect(prepaint(t.id), t.id).toEqual(want);
    }
    expect(prepaint("rose")).toEqual({ "data-reading-mode": "parchment", "data-look": "rose" });
    expect(prepaint("athos")).toEqual({ "data-look": "athos" });
    expect(prepaint("sepia")).toEqual({});
    expect(prepaint(null)).toEqual({});
  });

  it("is what the script actually checks, under the real storage key", () => {
    expect(THEME_PREPAINT).toContain(`'${READING_THEME_KEY}'`);
    for (const id of [...PREPAINT_THEME_IDS, ...PREPAINT_LOOKS_DARK, ...PREPAINT_LOOKS_LIGHT]) expect(THEME_PREPAINT).toContain(`"${id}"`);
    expect(THEME_PREPAINT).toContain("data-reading-mode");
    expect(THEME_PREPAINT).toContain("data-look");
  });
});

describe("the token blocks", () => {
  it("exist in globals.css for every palette except default", () => {
    for (const t of READING_THEMES) {
      if (t.id === "default") continue;
      expect(hasTokenBlock(t.id), `no token block for ${t.id}`).toBe(true);
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
