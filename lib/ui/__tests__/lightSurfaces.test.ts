import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * A surface painted dark with a literal must say what it does on Light.
 *
 * WHY THIS EXISTS. The reading palettes re-colour the app through tokens:
 * `bg-night`, `text-paper` and the rest flip when a reader picks Light. A
 * background written as a literal does not. On 2026-09-25 the owner sent two
 * screenshots from Light mode, the home page's "Paths to walk" cards and the
 * Purify Plus card, each dark ink on a dark card, unreadable. An audit of 38
 * pages found the same fault in the nav, the footer, both plan pages,
 * Discover and the phone hub tiles: every one a gradient or a hex typed into
 * a component, with token text on top of it. Light is free and it is the
 * palette asked for by readers who get dizzy on dark ones.
 *
 * The fixes live in app/globals.css, "Light mode: surfaces drawn for dark":
 * an lm-* class makes a surface follow the palette, `dark-island` keeps a set
 * piece dark and puts its tokens back. This test holds the line in two
 * places. A file that paints a dark literal surface must use one of them (or
 * be listed below with the reason it is safe), and every lm-* class a
 * component uses must exist in the stylesheet, so a typo cannot quietly
 * leave a card dark.
 */

const ROOT = process.cwd();
const ROOTS = ["app", "components"];
const SKIP = new Set(["node_modules", ".next", "out", "__tests__", ".native-export-stash", "admin", "owner"]);

function files(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) files(p, acc);
    else if (/\.tsx$/.test(entry)) acc.push(p);
  }
  return acc;
}

/** Dark enough that ink on it is unreadable: #000000 to #3fffff. */
const DARK_HEX = "#[0-3][0-9a-fA-F]{5}\\b";
const DARK_SURFACE = [
  // A gradient with a dark stop, in a style prop or a string.
  new RegExp(`(?:linear|radial)-gradient\\([^"'\`]*${DARK_HEX}`),
  // A dark hex as a whole background.
  new RegExp(`background(?:Color)?:\\s*["'\`][^"'\`]*${DARK_HEX}`),
  // A dark hex as a Tailwind background.
  new RegExp(`\\bbg-\\[${DARK_HEX}\\]`),
  // Solid black, not a translucent overlay.
  /\bbg-black(?![\w/-])/,
];

/** Dark by design and safe on every palette, with the reason. */
const SAFE: Record<string, string> = {
  "app/icon.tsx": "the generated favicon, an image",
  "app/apple-icon.tsx": "the generated home screen icon, an image",
  "components/saints/SaintIcon.tsx": "a gilded icon stand-in: gold on dark on every palette, its letters in fixed cream",
  "components/prayers/PrayerIcon.tsx": "the frame behind an icon image, with nothing written on it",
  "components/prayers/PrayerSlideshow.tsx": "the frame behind an icon image, with nothing written on it",
  "components/ui/PurifyBadge.tsx": "the brand mark, a black tile with a white cross on every palette",
};

const CSS = readFileSync(join(ROOT, "app", "globals.css"), "utf8");

describe("surfaces drawn for dark say what they do on Light", () => {
  const all = ROOTS.flatMap((r) => files(join(ROOT, r)));
  const rel = (p: string) => relative(ROOT, p).split(sep).join("/");

  it("finds the component tree", () => {
    expect(all.length).toBeGreaterThan(200);
  });

  it("every file with a dark literal surface follows the palette, is an island, or is known safe", () => {
    const offenders: string[] = [];
    for (const f of all) {
      // Comments out: "why this is not bg-black" is advice, not a surface.
      // The // strip leaves a URL's scheme alone.
      const src = readFileSync(f, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
      if (!DARK_SURFACE.some((re) => re.test(src))) continue;
      const name = rel(f);
      if (SAFE[name]) continue;
      if (/\blm-[a-z-]+\b/.test(src) || /\bdark-island\b/.test(src)) continue;
      offenders.push(name);
    }
    expect(offenders, "add an lm-* class or dark-island (see globals.css), or list it in SAFE with a reason").toEqual([]);
  });

  it("every lm-* class a component uses has a Light rule", () => {
    const used = new Set<string>();
    for (const f of all) {
      for (const m of readFileSync(f, "utf8").matchAll(/(?<![\w-])lm-([a-z]+(?:-[a-z]+)*)\b/g)) used.add(`lm-${m[1]}`);
    }
    expect(used.size).toBeGreaterThan(3);
    const missing = [...used].filter(
      (c) => !CSS.includes(`html[data-reading-mode="parchment"] .${c}`),
    );
    expect(missing).toEqual([]);
  });

  it("the island puts back every token the Light palette changes for text", () => {
    const island = CSS.slice(
      CSS.indexOf('html[data-reading-mode="parchment"] .dark-island {'),
    );
    const block = island.slice(0, island.indexOf("}"));
    for (const token of [
      "--color-night:",
      "--color-paper:",
      "--color-gold:",
      "--color-premium-ink:",
      "--color-crimson-soft:",
      "--color-link:",
      "--color-emerald-200:",
      "--color-on-paper:",
    ]) {
      expect(block, token).toContain(token);
    }
  });
});
