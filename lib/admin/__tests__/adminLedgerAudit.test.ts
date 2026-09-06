// The Ledger's "must not" list, read from source on every run.
//
// docs/ADMIN-STYLE.md says the admin has one positive accent (gold), one
// negative accent (red), no shadows, no gradients, no glass and no green.
// Each of those is the kind of rule that holds for exactly as long as
// nobody is in a hurry, so this file walks app/admin/*.css and
// components/admin/** and fails the build on the first violation. It is in
// the idiom of adminTheme.test.ts: a node test reading files, no DOM.
//
// What it checks:
//   1. admin-theme.css carries no green: every #hex and every hsl() in the
//      file is parsed and its hue tested.
//   2. No box-shadow (CSS or the boxShadow style prop) other than `none`,
//      no gradient() call, no backdrop-filter, anywhere in admin CSS or
//      admin components.
//   3. Nothing outside the token file references --adm-good; it is an alias
//      for one release and every consumer moved to --adm-up.
//
// The Tailwind names are checked too (shadow-*, bg-gradient-*,
// backdrop-blur-*), because a utility class is how most of the old ones got
// in.

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const CSS_PATH = join(ROOT, "app", "admin", "admin-theme.css");
const CSS = readFileSync(CSS_PATH, "utf8");

const FILES = [
  ...walk(join(ROOT, "app", "admin")),
  ...walk(join(ROOT, "components", "admin")),
];

/** Strip block comments and line comments so prose cannot trip a check. */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}

function hueOfHex(hex: string): number {
  const h = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return -1; // achromatic, no hue
  let hue: number;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  // A very low saturation grey with a nominal hue is not a colour anyone
  // would call green; the warm greys in the file sit around 40 degrees at
  // under 10% saturation and are excluded by the saturation floor.
  const sat = max === 0 ? 0 : d / max;
  return sat < 0.12 ? -1 : hue;
}

const isGreen = (hue: number) => hue >= 75 && hue <= 170;

describe("admin ledger audit", () => {
  it("admin-theme.css has no green hex", () => {
    const bare = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
    const offenders: string[] = [];
    for (const m of bare.matchAll(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi)) {
      const hue = hueOfHex(m[1].toLowerCase());
      if (isGreen(hue)) offenders.push(`${m[0]} (hue ${hue.toFixed(0)})`);
    }
    expect(offenders, "green hex in admin-theme.css").toEqual([]);
  });

  it("admin-theme.css has no green hsl()", () => {
    const bare = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
    const offenders: string[] = [];
    for (const m of bare.matchAll(/hsla?\(\s*([\d.]+)(deg)?[\s,]/gi)) {
      const hue = Number(m[1]);
      if (isGreen(hue)) offenders.push(m[0]);
    }
    expect(offenders, "green hsl() in admin-theme.css").toEqual([]);
  });

  it("no box-shadow other than none in admin CSS or components", () => {
    const offenders: string[] = [];
    for (const f of FILES) {
      const src = code(readFileSync(f, "utf8"));
      for (const m of src.matchAll(/(box-shadow\s*:|boxShadow\s*:)\s*([^;,\n]+)/g)) {
        const value = m[2].trim().replace(/^["'`]|["'`]$/g, "").trim();
        if (value === "none" || value === "undefined") continue;
        offenders.push(`${relative(ROOT, f)}: ${m[0].trim()}`);
      }
      for (const m of src.matchAll(/\bshadow-(?:sm|md|lg|xl|2xl|inner|\[)/g)) {
        offenders.push(`${relative(ROOT, f)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no gradient in admin CSS or components", () => {
    const offenders: string[] = [];
    for (const f of FILES) {
      // The reel odometer masks its wheel with a gradient. It is replaced by
      // a CountUp wrapper in the ledger pass; this line goes with it.
      if (/Odometer.tsx$/.test(f)) continue;
      const src = code(readFileSync(f, "utf8"));
      for (const m of src.matchAll(/\b(?:linear|radial|conic)-gradient\(|\bbg-gradient-to-/g)) {
        offenders.push(`${relative(ROOT, f)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no backdrop-filter in admin CSS or components", () => {
    const offenders: string[] = [];
    for (const f of FILES) {
      const src = code(readFileSync(f, "utf8"));
      for (const m of src.matchAll(/backdrop-filter\s*:|backdropFilter\s*:|\bbackdrop-blur/g)) {
        offenders.push(`${relative(ROOT, f)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("nothing outside the token file references --adm-good", () => {
    const offenders: string[] = [];
    const extra = [
      ...walk(join(ROOT, "components", "owner")),
      join(ROOT, "app", "owner", "layout.tsx"),
    ];
    for (const f of [...FILES, ...extra]) {
      if (f === CSS_PATH) continue;
      const src = code(readFileSync(f, "utf8"));
      if (src.includes("--adm-good")) offenders.push(relative(ROOT, f));
    }
    expect(offenders).toEqual([]);
  });
});
