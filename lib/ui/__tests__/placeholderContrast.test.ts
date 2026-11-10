// Every field's placeholder, and the app's other stepped-back words, legible
// on every palette (1.9, the arbiter's sweep of 2026-11-09).
//
// What it holds, by the stylesheet's own arithmetic (as faintText.test.ts
// does for faint text): every placeholder in app/ and components/ is a share
// each palette draws at 4.5:1 or more on the page, a card and the fills the
// fields sit on; a field with no placeholder colour of its own takes the base
// layer's default, which passes the same way; the admin's fields keep their
// own (56 percent, and .adm ::placeholder on --adm-ink-3, from the admin's
// own commits 621702e and 9624cdf). And three more that stepped back too far
// once: Candlelight's verses not being read (86 percent, not 58), the day's
// hours not current (his pick "Lifted": the words grey, never the row faded),
// and the mini player keeping the reader's bars' pace.
//
// What a reader would notice if this broke: a field's hint too faint to read
// on Light, or an hour's name gone grey past reading.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const CSS = read("app/globals.css");
const BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

type Rgb = [number, number, number];

function hex(raw: string): Rgb {
  const m = /#([0-9a-f]{6})\b/i.exec(raw);
  if (!m) throw new Error(`not a colour: ${raw}`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as Rgb;
}

/** A custom property's value in the first rule whose selector is exactly `selector`. */
function token(selector: string, name: string): string | null {
  for (const m of BARE.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if ((m[1].split(";").pop() ?? "").trim() !== selector) continue;
    const d = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(m[2]);
    if (d) return d[1].trim();
  }
  return null;
}

const MODES = ["default", "parchment", "black", "candlelight", "monastery", "councils", "cappadocian"] as const;
type Mode = (typeof MODES)[number];

function colour(mode: Mode, name: string): Rgb {
  const own = mode === "default" ? null : token(`html[data-reading-mode="${mode}"]`, name);
  const raw = own ?? token("@theme", name) ?? token(":root", name);
  if (!raw) throw new Error(`${mode}: no ${name}`);
  return hex(raw);
}

const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const mix = (fg: Rgb, bg: Rgb, a: number): Rgb => fg.map((v, i) => v * a + bg[i] * (1 - a)) as Rgb;
const ratio = (a: Rgb, b: Rgb) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Every .tsx under a folder, but tests. */
function sources(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "__tests__" && e.name !== "node_modules") out.push(...sources(p));
    } else if (e.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}
const FILES = [...sources("app"), ...sources("components")];
const ADMIN = (f: string) => /(^|\/)(app|components)\/admin\//.test(f);

/** The share a palette finally draws a placeholder of `placeholder:text-paper/<share>` at, from the stylesheet's rules. */
function drawnPlaceholder(mode: Mode, share: number): number {
  if (mode === "default") return share;
  const rule = new RegExp(
    `:where\\(html\\[data-reading-mode="${mode}"\\]\\)\\s*\\.placeholder\\\\:text-paper\\\\\\/${share}::placeholder\\s*\\{\\s*color:\\s*color-mix\\(in oklab, var\\(--color-paper\\) (\\d+)%`,
  );
  const m = rule.exec(BARE);
  return m ? Number(m[1]) : share;
}

/** The share the base layer's default draws a field's placeholder at, on a palette. */
function drawnDefault(mode: Mode): number {
  const base = BARE.slice(BARE.lastIndexOf("@layer base {"));
  const own = mode === "default" ? null : new RegExp(`:where\\(html\\[data-reading-mode="${mode}"\\]\\) ::placeholder \\{\\s*color: color-mix\\(in oklab, var\\(--color-paper\\) (\\d+)%`).exec(base);
  if (own) return Number(own[1]);
  const all = /\n ::placeholder \{\s*color: color-mix\(in oklab, var\(--color-paper\) (\d+)%/.exec(base);
  if (!all) throw new Error("no base placeholder default");
  return Number(all[1]);
}

/** The fills a field with a placeholder class sits on: its own bg-paper share, beside the page and a card. */
const FILLS = (() => {
  const fills = new Set<number>([0.04]);
  for (const f of FILES) {
    if (ADMIN(f)) continue;
    for (const line of read(f).split("\n")) {
      if (!line.includes("placeholder:text-")) continue;
      for (const m of line.matchAll(/\bbg-paper\/(?:\[(0?\.\d+)\]|(\d+))/g)) fills.add(m[1] ? Number(m[1]) : Number(m[2]) / 100);
    }
  }
  return [...fills].sort();
})();

function shortOf(at: (mode: Mode) => number, label: string): string[] {
  const short: string[] = [];
  for (const mode of MODES) {
    const night = colour(mode, "--color-night");
    const soft = colour(mode, "--color-night-soft");
    const paper = colour(mode, "--color-paper");
    const share = at(mode) / 100;
    const grounds: [string, Rgb][] = [
      ["the page", night],
      ["a card", soft],
      ...FILLS.flatMap((a): [string, Rgb][] => [
        [`a ${Math.round(a * 100)}% field on the page`, mix(paper, night, a)],
        [`a ${Math.round(a * 100)}% field on a card`, mix(paper, soft, a)],
      ]),
    ];
    for (const [where, ground] of grounds) {
      const r = ratio(mix(paper, ground, share), ground);
      if (r < 4.5) short.push(`${mode}: ${label} at ${Math.round(share * 100)}% on ${where}: ${r.toFixed(2)}:1`);
    }
  }
  return short;
}

describe("placeholders, on every palette", () => {
  it("every reader's field uses the house caption share, 55 percent, which each palette draws at its own", () => {
    const shares = new Map<string, number>();
    for (const f of FILES) {
      if (ADMIN(f)) continue;
      for (const m of read(f).matchAll(/placeholder:text-([a-z-]+)(?:\/(\d+))?/g)) shares.set(`${m[1]}/${m[2] ?? ""}`, (shares.get(`${m[1]}/${m[2] ?? ""}`) ?? 0) + 1);
    }
    expect([...shares.keys()]).toEqual(["paper/55"]);
    // A floor, so that a scan that stops finding fields does not pass by finding none. It counts
    // the places the share is written, not the fields: the Florilegium's four fields (a
    // gathering's name on its first page and in the sheet that picks one, a note, and the
    // button's old menu, which is gone) write it once since 1.9, in
    // components/florilegium/florStyle.ts (FLOR_FIELD), which took the count under the 60 this
    // floor stood at (58 on 2026-11-10).
    expect(shares.get("paper/55")).toBeGreaterThanOrEqual(56);
    // And those four are still held to it: the one place they share says 55 percent.
    expect(read("components/florilegium/florStyle.ts")).toContain("placeholder:text-paper/55");
  });

  it("each palette draws it at 4.5:1 or more on the page, a card, and every fill a field sits on", () => {
    expect(FILLS.length).toBeGreaterThan(1);
    const short = shortOf((mode) => drawnPlaceholder(mode, 55), "placeholder:text-paper/55");
    expect(short, short.join("\n")).toEqual([]);
  });

  it("a field with no placeholder colour of its own takes the base layer's default, which passes the same way", () => {
    const base = CSS.slice(CSS.lastIndexOf("@layer base {"));
    expect(base).toMatch(/@layer base \{\s*::placeholder \{/);
    expect([drawnDefault("default"), drawnDefault("parchment"), drawnDefault("candlelight")]).toEqual([55, 70, 60]);
    const short = shortOf(drawnDefault, "the default placeholder");
    expect(short, short.join("\n")).toEqual([]);
  });

  it("the admin keeps its own: its five fields at 56 percent, and .adm ::placeholder on --adm-ink-3, legible on both of its themes", () => {
    const admin = FILES.filter(ADMIN).flatMap((f) => [...read(f).matchAll(/placeholder:text-paper\/(\d+)/g)].map((m) => Number(m[1])));
    expect(admin).toEqual([56, 56, 56, 56, 56]);
    const theme = read("app/admin/admin-theme.css");
    expect(theme).toMatch(/\.adm ::placeholder \{\s*color: var\(--adm-ink-3\);/);
    // Dark and light: the ink against the ground and, tightest, the wells.
    for (const [ink, grounds] of [
      ["#939393", ["#0a0a0a", "#191919"]],
      ["#6b6b6b", ["#ffffff", "#f3f3f3"]],
    ] as const) {
      expect(theme).toContain(`--adm-ink-3: ${ink};`);
      for (const ground of grounds) expect(ratio(hex(ink), hex(ground)), `${ink} on ${ground}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("words stepped back, on every palette", () => {
  it("Candlelight's verses not being read step back to 86 percent, not 58, and their numbers stand at 72", () => {
    expect(BARE).toMatch(/\.candle-reading \[data-verse\]:not\(\[data-lit\]\):not\(:has\(\[data-verse-strip\]\)\) \{\s*opacity: 0\.86;/);
    expect(BARE).toMatch(/\.candle-reading \[data-verse\] sup\.text-paper\\\/55 \{\s*color: color-mix\(in oklab, var\(--color-paper\) 72%, transparent\);/);
    const ground = colour("candlelight", "--color-night");
    const paper = colour("candlelight", "--color-paper");
    const red = colour("candlelight", "--color-comment");
    // The words, the red commentary numbers (which decide the floor) and the plain numbers.
    expect(ratio(mix(paper, ground, 0.86), ground)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(mix(red, ground, 0.86), ground)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(mix(paper, ground, 0.86 * 0.72), ground)).toBeGreaterThanOrEqual(4.5);
  });

  it("the day's hours not current step back in their words, never by fading the row (his pick, Lifted)", () => {
    const timeline = read("components/prayers/DayTimeline.tsx");
    expect(timeline).not.toContain("opacity-70");
    expect(timeline).toContain('on ? "text-paper" : quiet ? "text-paper/70" : "text-paper/85"');
    expect(timeline).toContain('quiet && !on ? "text-paper/70" : "text-paper/80"');
    // 70 percent of the ink reads on every palette, on the page and a card.
    const short = shortOf(() => 70, "text-paper/70");
    expect(short, short.join("\n")).toEqual([]);
  });

  it("the mini player draws in at the reader's bars' pace, and comes back at theirs", () => {
    expect(BARE).toMatch(/\[data-mini-player\]\[data-drawn\] \.mini-player \{\s*transition:\s*width var\(--reader-away-duration\) var\(--reader-away-ease\)/);
    expect(BARE).toMatch(/\.mini-player \{[^}]*transition:\s*width var\(--reader-back-duration\) var\(--ease-house\)/);
    expect(BARE).toMatch(/\[data-mini-player\]\[data-drawn\] \.mini-player-card \{\s*transition:\s*opacity calc\(var\(--reader-away-duration\) - 200ms\) var\(--reader-away-ease\),\s*visibility 0s linear calc\(var\(--reader-away-duration\) - 200ms\);/);
    expect(BARE).toMatch(/\[data-mini-player\]\[data-drawn\] \.mini-player-pill \{\s*transition:\s*opacity calc\(var\(--reader-away-duration\) - 200ms\) var\(--reader-away-ease\) 200ms,\s*visibility 0s;/);
    for (const selector of ["[data-mini-player][data-drawn] .mini-player,", "[data-mini-player][data-drawn] .mini-player-card,", "[data-mini-player][data-drawn] .mini-player-pill {"]) {
      expect(CSS, selector).toContain(`:where([data-motion="reduce"]) ${selector}`);
    }
  });
});
