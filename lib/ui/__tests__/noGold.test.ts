// No gold, yellow or amber in Purify (1.8, refinement 2), held for good.
//
// The owner, 2026-10-28: "stop using that yellow too as that contrast color
// just use a glowly white. that yellow is vibe coded." He had said it before
// (2026-10-02, 1.7.1, the shop, the Premium pill), and each time a sweep
// took the gold out and the next piece of work brought some back: a ring
// typed as rgba(212,175,55,...), a checkbox's accent, a placeholder's olive
// wood. Then, 2026-10-31: "gold is allowed for the community profiles by the
// way but only exclusive to plus members".
//
// So this walks what the app is made of (app/, components/, lib/, public/,
// the Android widgets' resources and the iOS widgets) and measures every
// colour written there, however it is written: a hex, rgb(), hsl(), oklch(),
// an "R G B" triplet, a CSS colour name, a Tailwind amber or yellow class.
// Gold is what lib/ui/goldTone.ts says it is, the same measure that makes a
// gold profile banner a Plus colour (lib/profile/cosmetics.ts). Comments are
// left out: a note on the gold that went is not gold.
//
// A gold is allowed in the places below and nowhere else, each with its
// reason, and a place that has no gold left must come off the list, so the
// list stays exactly as long as the gold. The admin is not walked (out of
// scope: the owner's own panel). data/ is not walked: it is content, and
// carries no colour.
//
// What a reader would notice if this broke: a yellow or gold mark on a screen
// that is meant to be black, white and grey, or a free reader's profile in
// gold.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { isGoldTone, oklchOf, rgbOfHex, rgbOfOklch, type Rgb } from "@/lib/ui/goldTone";

const ROOT = path.resolve(__dirname, "..", "..", "..");

/** Where the app is. */
const ROOTS = ["app", "components", "lib", "public", "android/app/src/main/res", "ios/App", "capacitor-shell"];
const ROOT_FILES = ["capacitor.config.ts"];
/** Not walked: build output, tests, and the admin (out of scope for this rule). */
const SKIP_DIRS = new Set(["node_modules", ".next", "out", "__tests__", ".native-export-stash", "Pods", "build"]);
const SKIP_PATHS = new Set(["app/admin", "components/admin", "lib/admin"]);
const TEXT = /\.(css|ts|tsx|js|mjs|cjs|jsx|json|svg|html|xml|swift|webmanifest)$/;

/**
 * The places gold may stay, each with its reason. A file named here may
 * carry gold anywhere in it, so each is one whose whole job is the allowed
 * thing; a file that only has a corner of it is fixed instead.
 */
const ALLOWED: Record<string, string> = {
  // Gold on a Community profile, for Plus members only (his word of 2026-10-31).
  "lib/profile/cosmetics.ts":
    "Plus profile cosmetics: the gold banner colour (a Plus colour, bannerNeedsPlus) and the gilded theme",
  "components/community/profile/AvatarFrame.tsx":
    "Plus profile cosmetics: the frames (the laurel, the halo, the candle and its flame)",
  // The quote share pictures take colour (his word of 2026-10-30), a flame's
  // among them. Their looks are listed in lib/share/verseCard.ts, whose warm
  // ones are orange and olive and so need no place here; the drawing has gold.
  "lib/share/drawVerseCard.ts": "the quote share pictures' looks, drawn: the Fire look's embers and the candle's rim",
  // His own exception for the highlighter.
  "lib/bible/highlightPalette.ts":
    "the yellow highlighter, his word of 2026-10-19: 'bring back yellow highlight option (just for highlighting text)'",
  // Not Purify's to recolour.
  "components/auth/OAuthButtons.tsx": "Google's own G mark, drawn in Google's colours as Google requires",
  // The owner's own tool, not a reader's screen; its amber kept by his word.
  "lib/drop/page.ts": "the drop kit, the owner's own tool in its violet house look (its 'warn' amber)",
  // Not here, by his word of 2026-10-31 ("fix all of them"): the Discord
  // status's season colours and the investor overview's metal, both silver
  // since 1.8.
};

/**
 * Rules of app/globals.css that draw the Plus profile cosmetics, which may be
 * gold: the profile effects (gold dust, candlelight, Paschal embers), the name
 * colours (gold, gilded, dawn, royal) and the moving banners (shimmer, glow).
 */
const PLUS_CSS = /\.(?:pfx|name-color|banner-motion|banner-drift)\b|@keyframes\s+(?:pfx-|bm-|af-)/;

// ── Reading a file ────────────────────────────────────────────────────────

/** Blanks out a span, keeping its line breaks so line numbers still hold. */
const blank = (s: string) => s.replace(/[^\n]/g, " ");

/**
 * Where a string or a template's text ends, from just inside its opening
 * quote: the index of the closing quote, or of the `${` that interrupts a
 * template. A quote or apostrophe string also ends at its line's end, so a
 * stray apostrophe in JSX text spoils one line at most.
 */
function stringEnd(src: string, from: number, quote: string): number {
  const stop = quote === "`" ? /[`\\$]/g : quote === '"' ? /["\\\n]/g : /['\\\n]/g;
  let j = from;
  for (;;) {
    stop.lastIndex = j;
    const m = stop.exec(src);
    if (!m) return src.length;
    const at = m.index;
    if (src[at] === "\\") j = at + 2;
    else if (src[at] === "$" && src[at + 1] !== "{") j = at + 1;
    else return at;
  }
}

/** Comments out of JavaScript, TypeScript or Swift, strings left whole. */
function stripScriptComments(src: string): string {
  const parts: string[] = [];
  const special = /[/"'`{}]/g;
  const templates: number[] = []; // the brace depth outside each open ${ … }
  let depth = 0;
  let i = 0;
  /** From inside a template's text: copy it up to its end or its next ${. */
  const templateText = (from: number) => {
    const end = stringEnd(src, from, "`");
    if (src[end] === "$") {
      parts.push(src.slice(i, end + 2));
      templates.push(depth);
      depth = 0;
      i = end + 2;
    } else {
      parts.push(src.slice(i, end + 1));
      i = end + 1;
    }
  };
  while (i < src.length) {
    special.lastIndex = i;
    const m = special.exec(src);
    if (!m) {
      parts.push(src.slice(i));
      break;
    }
    if (m.index > i) parts.push(src.slice(i, m.index));
    i = m.index;
    const c = src[i];
    const n = src[i + 1];
    if (c === "/" && (n === "/" || n === "*")) {
      const end = n === "/" ? src.indexOf("\n", i) : src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : n === "/" ? end : end + 2;
      parts.push(blank(src.slice(i, stop)));
      i = stop;
    } else if (c === "`") {
      templateText(i + 1);
    } else if (c === '"' || c === "'") {
      const end = stringEnd(src, i + 1, c);
      parts.push(src.slice(i, end + 1));
      i = end + 1;
    } else if (c === "}" && templates.length > 0 && depth === 0) {
      // The end of a ${ … }: back into the template's text.
      depth = templates.pop() ?? 0;
      templateText(i + 1);
    } else {
      if (c === "{") depth++;
      else if (c === "}") depth--;
      parts.push(c);
      i++;
    }
  }
  return parts.join("");
}

function stripComments(src: string, ext: string): string {
  if (ext === "css") return src.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (ext === "html" || ext === "svg" || ext === "xml") {
    return src.replace(/<!--[\s\S]*?-->/g, blank).replace(/\/\*[\s\S]*?\*\//g, blank);
  }
  if (ext === "json" || ext === "webmanifest") return src;
  return stripScriptComments(src);
}

// ── Finding colours ───────────────────────────────────────────────────────

type Found = { line: number; literal: string; context: string };

const NAMED: Record<string, Rgb> = {
  gold: [255, 215, 0],
  goldenrod: [218, 165, 32],
  darkgoldenrod: [184, 134, 11],
  palegoldenrod: [238, 232, 170],
  yellow: [255, 255, 0],
  lightyellow: [255, 255, 224],
  lightgoldenrodyellow: [250, 250, 210],
  khaki: [240, 230, 140],
  darkkhaki: [189, 183, 107],
  orange: [255, 165, 0],
  darkorange: [255, 140, 0],
};
const NAME = Object.keys(NAMED).join("|");

function hslRgb(h: number, s: number, l: number): Rgb {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round((l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return [f(0), f(8), f(4)];
}

const channel = (v: string) => (v.endsWith("%") ? (parseFloat(v) * 255) / 100 : parseFloat(v));

/** Every way a colour is written, with how to read it. A match that reads as gold is a hit. */
const READERS: { re: RegExp; exts: RegExp; rgb: (m: RegExpMatchArray) => Rgb | "gold" | null }[] = [
  // #rgb, #rrggbb and their alpha forms.
  {
    re: /(?<![\w&#$])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g,
    exts: /./,
    rgb: (m) => rgbOfHex(m[0]),
  },
  // A hex inside an SVG data URI in a stylesheet: %23rrggbb.
  { re: /%23([0-9a-fA-F]{6})(?![0-9a-fA-F])/g, exts: /./, rgb: (m) => rgbOfHex(`#${m[1]}`) },
  // rgb() and rgba(), with commas or spaces.
  {
    re: /rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)/gi,
    exts: /./,
    rgb: (m) => [channel(m[1]), channel(m[2]), channel(m[3])].map(Math.round) as unknown as Rgb,
  },
  // Swift's rgb(…) helper in the widgets is caught above; UIColor/Color(red:) as fractions.
  {
    re: /red:\s*([\d.]+)\s*(?:\/\s*255(?:\.0)?)?\s*,\s*green:\s*([\d.]+)\s*(?:\/\s*255(?:\.0)?)?\s*,\s*blue:\s*([\d.]+)/g,
    exts: /swift/,
    rgb: (m) => {
      const v = [m[1], m[2], m[3]].map(Number);
      return (v.every((x) => x <= 1) ? v.map((x) => Math.round(x * 255)) : v) as unknown as Rgb;
    },
  },
  {
    re: /hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/gi,
    exts: /./,
    rgb: (m) => hslRgb(Number(m[1]), Number(m[2]), Number(m[3])),
  },
  {
    re: /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/gi,
    exts: /./,
    rgb: (m) => rgbOfOklch({ L: m[2] ? Number(m[1]) / 100 : Number(m[1]), C: Number(m[3]), h: Number(m[4]) }),
  },
  // "R G B" triplets for rgb(var(--x) / a), as the calendar's tones are written.
  {
    re: /--[\w-]+\s*:\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*(?=[;}])/g,
    exts: /css/,
    rgb: (m) => [Number(m[1]), Number(m[2]), Number(m[3])] as unknown as Rgb,
  },
  // A colour named in a stylesheet declaration, within its own line.
  {
    re: new RegExp(
      `(?:color|background|fill|stroke|border|outline|shadow|stop-color|--[\\w-]+)[\\w-]*\\s*:[^;{}\\n<>"']*?(?<![\\w-])(${NAME})(?![\\w-])`,
      "g",
    ),
    exts: /css|html|svg/,
    rgb: (m) => NAMED[m[1]] ?? null,
  },
  // …or in markup or a style object, where a bare `color:` key is too often an id to read.
  {
    re: new RegExp(
      `(?:\\b(?:fill|stroke|stopColor|stop-color|floodColor|color)=\\{?["'\`]|\\b(?:backgroundColor|borderColor|outlineColor|textDecorationColor|caretColor|accentColor|stopColor|floodColor|fillStyle|strokeStyle|shadowColor)\\s*[:=]\\s*["'\`])(${NAME})["'\`]`,
      "g",
    ),
    exts: /tsx?|jsx?|mjs|html|svg|xml/,
    rgb: (m) => NAMED[m[1]] ?? null,
  },
  // A Tailwind amber or yellow utility, or one of those palettes' tokens: gold by name.
  {
    re: /(?<![\w-])(?:[\w-]+:)*(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:amber|yellow)-\d{2,3}\b|--color-(?:amber|yellow)-\d{2,3}\b/g,
    exts: /./,
    rgb: () => "gold",
  },
];

/** Where each stylesheet rule starts and ends, for a hit's context. */
function cssContexts(src: string): { at: number; headers: string[] }[] {
  const out: { at: number; headers: string[] }[] = [{ at: 0, headers: [] }];
  const stack: string[] = [];
  let last = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "{") {
      stack.push(src.slice(last, i).trim());
      out.push({ at: i, headers: [...stack] });
      last = i + 1;
    } else if (c === "}") {
      stack.pop();
      out.push({ at: i, headers: [...stack] });
      last = i + 1;
    } else if (c === ";") {
      last = i + 1;
    }
  }
  return out;
}

/** Anything that could be a colour at all; most files have none, and are passed over. */
const MAYBE = new RegExp(`#[0-9a-fA-F]{3}|%23|rgba?\\(|hsla?\\(|oklch\\(|red:|amber-|yellow-|--[\\w-]+\\s*:\\s*\\d|\\b(?:${NAME})\\b`);

/** The gold written in one source text (the scanner's own test below feeds it samples). */
function findGold(raw: string, ext: string): Found[] {
  if (!MAYBE.test(raw)) return [];
  const src = stripComments(raw.replace(/\r\n/g, "\n"), ext);
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") lineStarts.push(i + 1);
  const lineOf = (at: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= at) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  const contexts = ext === "css" ? cssContexts(src) : null;
  const contextOf = (at: number) => {
    if (!contexts) return "";
    let lo = 0;
    let hi = contexts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (contexts[mid].at <= at) lo = mid;
      else hi = mid - 1;
    }
    return contexts[lo].headers.join(" > ");
  };
  const found: Found[] = [];
  for (const { re, exts, rgb } of READERS) {
    if (!exts.test(ext)) continue;
    for (const m of src.matchAll(re)) {
      const colour = rgb(m);
      if (colour === null) continue;
      if (colour !== "gold" && !isGoldTone(oklchOf(colour))) continue;
      found.push({ line: lineOf(m.index ?? 0), literal: m[0].trim().slice(0, 60), context: contextOf(m.index ?? 0) });
    }
  }
  return found;
}

// ── The walk ──────────────────────────────────────────────────────────────

function walk(rel: string, acc: string[]): string[] {
  const abs = path.join(ROOT, rel);
  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const child = rel ? `${rel}/${entry}` : entry;
    if (SKIP_PATHS.has(child)) continue;
    const st = statSync(path.join(ROOT, child));
    if (st.isDirectory()) walk(child, acc);
    else if (TEXT.test(entry) && !/\.test\.[cm]?[jt]sx?$/.test(entry)) acc.push(child);
  }
  return acc;
}

function scan() {
  const files = [...ROOTS.flatMap((r) => walk(r, [])), ...ROOT_FILES];
  const hits: (Found & { file: string })[] = [];
  for (const file of files) {
    const ext = path.extname(file).slice(1);
    for (const f of findGold(readFileSync(path.join(ROOT, file), "utf8"), ext)) hits.push({ ...f, file });
  }
  return { files, hits };
}

const allowedHit = (h: Found & { file: string }) =>
  Boolean(ALLOWED[h.file]) || (h.file === "app/globals.css" && PLUS_CSS.test(h.context));

// ── The tests ─────────────────────────────────────────────────────────────

describe("the gold scanner", () => {
  it("sees each way a colour is written, and not a comment", () => {
    const css = [
      "/* was #c9a25a, the antique gold */",
      ".a { color: #c9a25a; }",
      ".b { background: rgb(201 162 90 / 0.4); }",
      ".c { --x: oklch(92.4% 0.12 95.746); }",
      ".d { --tone: 176 138 46; }",
      ".e { border-color: goldenrod; }",
      '.f { background: url("data:image/svg+xml,%3Csvg fill=%27%23d4af37%27/%3E"); }',
      ".g { box-shadow: 0 0 6px hsl(45 70% 55%); }",
      ".h { color: #eaeaec; background: rgb(70 52 20 / 0.3); --tone-gold: 236 236 239; }",
      ".gold-dust { color: white; }",
    ].join("\n");
    // Every gold line but the comment (1) and the greys and browns (9, 10).
    expect(findGold(css, "css").map((f) => f.line).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7, 8]);

    const tsx = [
      "// the old #d4af37 ring",
      'const ring = "shadow-[0_0_0_1px_rgba(212,175,55,0.22)]";',
      'const url = "https://example.com/#cafe"; /* image/* */',
      '<path stroke="gold" />',
      "const dot = cond && 'bg-amber-300';",
      "const season = { color: \"gold\", reason: \"pascha\" };",
      "const tw = `text-yellow-200 ${x}`;",
    ].join("\n");
    // The ring, the stroke, the two classes; not the comment, the address, or the season's id.
    expect(findGold(tsx, "tsx").map((f) => f.line).sort((a, b) => a - b)).toEqual([2, 4, 5, 7]);
  });

  it("knows a stylesheet rule's selector, so the Plus cosmetics' rules can be told apart", () => {
    const css = ".pfx-gold-dust .pfx-p { background: #efd9a3; }\n.shop-lit { color: #efd9a3; }";
    const found = findGold(css, "css");
    expect(found.map((f) => PLUS_CSS.test(f.context))).toEqual([true, false]);
  });
});

describe("no gold, yellow or amber in the app", () => {
  const { files, hits } = scan();

  it("walks the app (the scan finds its files)", () => {
    expect(files.length).toBeGreaterThan(2000);
    expect(files).toContain("app/globals.css");
    expect(files).toContain("components/community/profile/AvatarFrame.tsx");
    expect(files.some((f) => f.startsWith("components/admin/"))).toBe(false);
  });

  it("finds gold only in the places allowed it", () => {
    const offenders = hits.filter((h) => !allowedHit(h)).map((h) => `${h.file}:${h.line} ${h.literal}`);
    expect(offenders, "make it white, grey or a token (--color-gold is the silver accent), or add the place to ALLOWED with its reason").toEqual([]);
  });

  it("names no place on its list that has no gold left", () => {
    const stale = Object.keys(ALLOWED).filter((file) => !hits.some((h) => h.file === file));
    expect(stale, "these have no gold left: take them off ALLOWED").toEqual([]);
  });

  it("leaves the Plus profile cosmetics their gold in the stylesheet, and only those rules", () => {
    const css = hits.filter((h) => h.file === "app/globals.css");
    expect(css.length).toBeGreaterThan(5);
    expect(css.every((h) => PLUS_CSS.test(h.context)), css.map((h) => `${h.line} ${h.context}`).join("\n")).toBe(true);
    for (const rule of [".pfx-gold-dust", ".name-color-gold", ".name-color-gilded", ".banner-motion-shimmer"]) {
      expect(css.some((h) => h.context.includes(rule)), rule).toBe(true);
    }
  });
});
