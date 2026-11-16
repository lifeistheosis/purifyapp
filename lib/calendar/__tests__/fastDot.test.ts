// The dot beside a fasting rule (/prayers/today/, the Prayers index's day card)
// takes its fast's own colour token, as the calendar and /fasting/ do.
//
// Gate 6b (2026-11-16): checkMock's palette rule failed /prayers/today/ on
// Light on a fish day. The dot was bg-sage, rgb(123, 155, 143) on every
// palette, a colour typed in; fast-free's bg-emerald-400 was the same kind, and
// wine and oil wore the silver "gold" token where the calendar shows grape
// purple. The fasting page's own colours pass because they are tokens that
// follow the palette: the --fast-* triplets, which Light darkens to hold
// contrast on its ground (app/globals.css). This holds every kind to its token,
// the same one components/calendar/fastMeta.tsx names, and holds the token to
// the palette.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FAST_DOT } from "../fastDot";

const root = join(__dirname, "..", "..", "..");
const css = readFileSync(join(root, "app", "globals.css"), "utf8");
const meta = readFileSync(join(root, "components", "calendar", "fastMeta.tsx"), "utf8");

/** The --fast-* token fastMeta.tsx names for each kind: `fish: { ..., rgb: "var(--fast-fish)" }`. */
function metaTokens(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of meta.matchAll(/(?:"([\w-]+)"|([\w-]+)):\s*\{[^{}]*?rgb:\s*"var\((--fast-[\w-]+)\)"/g)) {
    out[m[1] ?? m[2]] = m[3];
  }
  return out;
}

/** What a selector's own block sets a custom property to (the first block that sets it). */
function valueIn(selector: string, prop: string): string | null {
  const at = (s: string) => {
    for (let i = css.indexOf(s); i !== -1; i = css.indexOf(s, i + 1)) {
      const open = css.indexOf("{", i);
      if (css.slice(i + s.length, open).trim() !== "") continue;
      const body = css.slice(open + 1, css.indexOf("}", open));
      const m = body.match(new RegExp(`(?:^|[;\\s])${prop}:\\s*([^;]+);`));
      if (m) return m[1].trim();
    }
    return null;
  };
  return at(selector);
}

describe("the fasting dot", () => {
  const tokens = metaTokens();
  const kinds = Object.keys(FAST_DOT);

  it("knows every kind fastMeta.tsx draws", () => {
    expect(Object.keys(tokens).sort()).toEqual(kinds.sort());
  });

  it("draws each kind in the token the calendar and /fasting/ use, never a colour typed in", () => {
    for (const kind of kinds) {
      expect(FAST_DOT[kind as keyof typeof FAST_DOT], kind).toBe(`bg-[rgb(var(${tokens[kind]}))]`);
    }
  });

  it("follows the palette: each token is set on Dark and set again, differently, on Light", () => {
    for (const kind of kinds) {
      const token = tokens[kind];
      const dark = valueIn(":root", token);
      const light = valueIn('html[data-reading-mode="parchment"]', token);
      expect(dark, `${token} on :root`).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
      expect(light, `${token} on Light`).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
      expect(light, `${token} is the same on Dark and Light`).not.toBe(dark);
    }
  });
});
