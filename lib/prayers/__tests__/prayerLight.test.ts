// The prayer page's reading light keeps every word legible (1.9, his "ok to
// all" of 2026-11-10 on his page's 131).
//
// While the reader follows, the line being prayed is lit, the prayer's other
// lines step back, and the prayers before and after step back further
// (components/prayers/service/useLitLine.ts, the owner's pick B of 1.8). The
// steps were 40% and 40% of 50%, and checkMock measured them on the export at
// 3.82:1 on Dark down to 1.47:1 on Light, against the 4.5:1 every word is held
// to. app/globals.css ("The rest dim") now gives each palette its own two
// steps, --prayer-rest and --prayer-unlit.
//
// This reads the stylesheet, as faintText.test.ts does, and does the
// arithmetic: the faintest words that step back (the closing line, the ink at
// 85%, and a prayer's name, at 90%) must hold 4.5:1 on every palette's page at
// both steps, the steps must still be steps (rest under unlit under the lit
// line), and the step back must not reach the captions and notes, which are
// already the faint shares and have nothing to spare.
//
// What a reader would notice if this broke: the lines around the one being
// prayed too faint to read, most of all on Light.
//
// And the light behind the prayer (1.9, build 90 note 8; his words: "make it
// more, like, fit the theme the user picked"). It was one neutral grey-white
// light on every palette, the page's icon blurred with its colour taken out.
// Now the ground is the palette's own and the light is the palette's own
// light, a soft pool or nothing. So this holds all 25 palettes, where it held
// seven: each one's steps back on its own page; on the six plain dark
// palettes the pool and its breath, where they are fullest together, under
// every word the page writes; nothing on a look or on paper; and Candlelight's
// three fasts, whose light the prayer page keeps as the Bible does.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CANDLE_LIGHTS } from "@/lib/reader/candleSeason";
import { READING_THEMES } from "@/lib/reader/readingModes";

const CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
const BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

type Rgb = [number, number, number];

function hex(raw: string): Rgb {
  const m = /#([0-9a-f]{6})\b/i.exec(raw);
  if (!m) throw new Error(`not a colour: ${raw}`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as Rgb;
}

/** A rule's selectors, one per comma (none of these selectors holds a comma of its own). */
const selectorsOf = (head: string) => (head.split(";").pop() ?? "").split(",").map((s) => s.trim());

/** The rules one of whose selectors is exactly `selector`, as their declarations. */
function rules(selector: string): string[] {
  const out: string[] = [];
  for (const m of BARE.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if (selectorsOf(m[1]).includes(selector)) out.push(m[2]);
  }
  return out;
}

/** A custom property's value in the first rule whose selector is exactly `selector`. */
function token(selector: string, name: string): string | null {
  for (const body of rules(selector)) {
    const d = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(body);
    if (d) return d[1].trim();
  }
  return null;
}

/** Every palette a reader can wear: the seven the app had, and the fifteen looks (1.9). */
type Palette = { id: string; look?: "dark" | "light" };
const PALETTES: Palette[] = READING_THEMES.map((t) => ({ id: t.id, look: t.look }));

/** Where a palette's own tokens stand in the stylesheet. */
const blockOf = (p: Palette) => (p.look ? `html[data-look="${p.id}"]` : p.id === "default" ? null : `html[data-reading-mode="${p.id}"]`);

function colours(p: Palette): { night: Rgb; paper: Rgb } {
  const pick = (name: string) => {
    const own = blockOf(p);
    const raw = (own ? token(own, name) : null) ?? token("@theme", name) ?? token(":root", name);
    if (!raw) throw new Error(`${p.id}: no ${name}`);
    return hex(raw);
  };
  return { night: pick("--color-night"), paper: pick("--color-paper") };
}

/**
 * The palette's two steps, as the stylesheet finally answers. A look's own
 * rule if it has one; else, for a light look, Light's (it wears Light's mode
 * beside its own); else the looks' shared rule; else the palette's; else the
 * reader's base.
 */
function steps(p: Palette): { rest: number; unlit: number } {
  const read = (name: string) => {
    const tries = p.look
      ? [`html[data-look="${p.id}"] [data-prayer-reader]`, p.look === "light" ? 'html[data-reading-mode="parchment"] [data-prayer-reader]' : ":where(html[data-look]) [data-prayer-reader]"]
      : p.id === "default"
        ? []
        : [`html[data-reading-mode="${p.id}"] [data-prayer-reader]`];
    for (const selector of [...tries, "[data-prayer-reader]"]) {
      const raw = token(selector, name);
      if (raw) return Number(raw);
    }
    throw new Error(`${p.id}: no ${name}`);
  };
  return { rest: read("--prayer-rest"), unlit: read("--prayer-unlit") };
}

/** How full the pool and its breath are on a palette, as shares of its ink; null where the light is not drawn. */
function light(p: Palette): { pool: number; breath: number } | null {
  const hidden = rules("html[data-look] .prayer-light").length > 0 && rules('html[data-reading-mode="parchment"] .prayer-light').length > 0;
  if (!hidden) throw new Error("the rule that draws no light on paper and on a look is gone");
  if (p.look || p.id === "parchment") return null;
  const read = (name: string) => {
    const raw = (p.id === "default" ? null : token(`html[data-reading-mode="${p.id}"] .prayer-light`, name)) ?? token(".prayer-light", name);
    const m = /^(\d+(?:\.\d+)?)%$/.exec(raw ?? "");
    if (!m) throw new Error(`${p.id}: no ${name}`);
    return Number(m[1]) / 100;
  };
  return { pool: read("--prayer-pool"), breath: read("--prayer-breath") };
}

/**
 * The share a palette finally draws text-paper/<share> at (Faint text on every
 * palette), as lib/ui/__tests__/faintText.test.ts reads it: the palette under
 * a look answers first, the look's own rule last.
 */
function drawn(p: Palette, share: number): number {
  let out = share;
  const rule = /:where\(([^)]*(?:\([^)]*\)[^)]*)*)\)\s*(:is\(([^)]*)\)|\.text-paper\\\/(\d+))\s*\{\s*color:\s*([^;]+);/g;
  const mode = p.look ? (p.look === "light" ? "parchment" : "default") : p.id;
  for (const m of BARE.matchAll(rule)) {
    const where = m[1];
    const forMode = mode === "default" ? /html:not\(\[data-reading-mode\]\)/.test(where) : where.includes(`data-reading-mode="${mode}"`);
    const forLook = p.look !== undefined && where.includes(`data-look="${p.id}"`);
    if (!forMode && !forLook) continue;
    const classes = m[3] ? [...m[3].matchAll(/\.text-paper\\\/(\d+)/g)].map((c) => Number(c[1])) : [Number(m[4])];
    if (!classes.includes(share)) continue;
    const pct = /var\(--color-paper\)\s+(\d+(?:\.\d+)?)%/.exec(m[5]);
    const alpha = /\/\s*(0?\.\d+)\s*\)/.exec(m[5]);
    if (pct) out = Number(pct[1]);
    else if (alpha) out = Number(alpha[1]) * 100;
  }
  return out;
}

/** The files that draw a prayer page, and every faint share (under 70 percent of the ink) they write. */
const PAGE_FILES = ["components/prayers/PrayerRuleReader.tsx", ...readdirSync(join(process.cwd(), "components/prayers/service")).filter((f) => f.endsWith(".tsx")).map((f) => `components/prayers/service/${f}`)];
const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const bare = (rel: string) =>
  read(rel)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const FAINT_WRITTEN = [...new Set(PAGE_FILES.flatMap((f) => [...read(f).matchAll(/\btext-paper\/(\d+)\b/g)].map((m) => Number(m[1]))))].filter((n) => n < 70).sort((x, y) => x - y);

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

/** The faintest words that step back, at the share of the ink each is drawn at. */
const STEPPING = [
  ["a line", 1],
  ["a prayer's name (text-paper/90)", 0.9],
  ["the closing line (text-paper/85)", 0.85],
] as const;

describe("the prayer page's reading light", () => {
  it("holds every palette a reader can wear, the fifteen looks among them", () => {
    expect(PALETTES).toHaveLength(22);
    expect(PALETTES.filter((p) => p.look)).toHaveLength(15);
    for (const p of PALETTES) {
      const c = colours(p);
      expect(c.night.every(Number.isFinite) && c.paper.every(Number.isFinite), p.id).toBe(true);
      // A light look is ink on paper, a dark one light on dark: its tokens say which.
      if (p.look) expect(lum(c.paper) < lum(c.night), p.id).toBe(p.look === "light");
    }
  });

  for (const mode of PALETTES) {
    it(`${mode.id}: every word that steps back holds 4.5:1 on the page at both steps`, () => {
      const { night, paper } = colours(mode);
      const { rest, unlit } = steps(mode);
      const short: string[] = [];
      for (const [step, at] of [["the prayers before and after", rest], ["the prayer being prayed", unlit]] as const) {
        for (const [what, share] of STEPPING) {
          // A prayer's name steps back only with the prayers around it.
          if (step === "the prayer being prayed" && share === 0.9) continue;
          const r = ratio(mix(paper, night, share * at), night);
          if (r < 4.5) short.push(`${what} in ${step}, at ${Math.round(at * 100)}%: ${r.toFixed(2)}:1`);
        }
      }
      expect(short, short.join("\n")).toEqual([]);
    });

    it(`${mode.id}: the steps are still steps`, () => {
      const { rest, unlit } = steps(mode);
      expect(rest).toBeGreaterThan(0);
      expect(rest, "the prayers around step back further than the prayer's own lines").toBeLessThan(unlit);
      expect(unlit, "the lit line stands out from the rest").toBeLessThan(1);
    });
  }

  it("the light uses the palette's steps, not a fixed share", () => {
    const unlit = rules(':where([data-motion="full"]) [data-prayer-reader][data-following] [data-line]').join("");
    expect(unlit).toMatch(/opacity:\s*var\(--prayer-unlit\)/);
    const lit = rules(':where([data-motion="full"]) [data-prayer-reader][data-following] [data-line][data-lit]').join("");
    expect(lit).toMatch(/opacity:\s*1\b/);
    const around = ':where([data-motion="full"]) [data-prayer-reader][data-following] [data-step]:not([data-praying])';
    for (const part of ["[data-line]", "> h2"]) {
      expect(rules(`${around} ${part}`).join(""), part).toMatch(/opacity:\s*var\(--prayer-rest\)/);
    }
  });

  it("the step back reaches the lines and the names, never the captions and notes", () => {
    // Every selector that dims inside the reader.
    const dimming = [...BARE.matchAll(/([^{}]*\[data-prayer-reader\][^{}]*)\{([^{}]*)\}/g)]
      .filter((m) => /opacity\s*:/.test(m[2]) && !/opacity\s*:\s*1\b/.test(m[2]))
      .flatMap((m) => selectorsOf(m[1]));
    expect(dimming.length).toBeGreaterThan(0);
    for (const selector of dimming) {
      // The old rule dimmed every child of a step (`> :not([data-step-actions])`),
      // which took the captions, already the faint shares, under 4.5:1.
      expect(selector, `${selector} dims more than the lines and the names`).toMatch(/(\[data-line\]|> h2)$/);
    }
  });
});

describe("the light behind the prayer is the palette's own (1.9, build 90 note 8)", () => {
  const PLAIN_DARK = ["default", "black", "candlelight", "monastery", "councils", "cappadocian"];
  const pool = rules(".prayer-light").join("\n");
  const breath = rules(".prayer-light-breath").join("\n");

  it("a soft pool on the six plain dark palettes, and nothing on a look or on paper", () => {
    expect(PALETTES.filter((p) => light(p)).map((p) => p.id).sort()).toEqual([...PLAIN_DARK].sort());
    // The one rule that draws nothing: paper, a look, and Candlelight in a fast, for both layers.
    const none = [...BARE.matchAll(/([^{}]*)\{\s*display:\s*none;\s*\}/g)].map((m) => selectorsOf(m[1])).find((list) => list.includes("html[data-look] .prayer-light"));
    expect(none?.sort()).toEqual(
      ["parchment", null, "season"]
        .flatMap((k) => {
          const head = k === "parchment" ? 'html[data-reading-mode="parchment"]' : k === "season" ? "html[data-candle-season]" : "html[data-look]";
          return [`${head} .prayer-light`, `${head} .prayer-light-breath`];
        })
        .sort(),
    );
  });

  it("is a plain gradient of the palette's ink: no picture, no blur, no colour typed in, no rays", () => {
    expect(pool).toMatch(/background:\s*radial-gradient\(ellipse 90% 34% at 50% 40%, color-mix\(in srgb, var\(--color-paper\) var\(--prayer-pool\), transparent\), transparent 72%\);/);
    expect(breath).toMatch(/background:\s*radial-gradient\(42% 30% at 50% 40%, color-mix\(in srgb, var\(--color-paper\) var\(--prayer-breath\), transparent\), transparent 70%\);/);
    for (const [name, body] of [["the pool", pool], ["the breath", breath]] as const) {
      expect(body, name).not.toMatch(/url\(|filter\s*:|backdrop-filter|rgba?\(|#[0-9a-f]{3,8}\b|conic-gradient|repeating-/i);
      expect(body, name).toMatch(/position:\s*fixed;/);
      expect(body, name).toMatch(/pointer-events:\s*none;/);
    }
    // It stands at the reading place, two fifths down, and follows nothing: no scroll is read to place it.
    const light = bare("components/prayers/service/PrayerLight.tsx");
    expect(light).not.toMatch(/scroll|addEventListener|style=/);
    expect(light).toContain('<div aria-hidden className="prayer-light" />');
    // The breath drifts from side to side and back, the same in every language: it says so to the
    // mirror check (scripts/mock-check.mjs), which found it on the export.
    expect(light).toMatch(/<div\s+aria-hidden\s+className="prayer-light-breath"\s+data-mock-allow="mirror"\s+data-mock-why="[^"]+"\s*\/>/);
  });

  it("the reader draws it through the one component, and the icon's light is gone", () => {
    const reader = bare("components/prayers/PrayerRuleReader.tsx");
    expect(reader).toContain("<PrayerLight />");
    expect(reader).not.toMatch(/backgroundImage|serviceArt\(|className="prayer-light/);
    // The icon still heads the page.
    expect(reader).toMatch(/artId=\{artId \?\? rule\.id\}/);
  });

  for (const id of PLAIN_DARK) {
    it(`${id}: the pool and its breath, where they are fullest together, leave every word 4.5:1 or more`, () => {
      const palette = PALETTES.find((p) => p.id === id)!;
      const { night, paper } = colours(palette);
      const { rest, unlit } = steps(palette);
      const l = light(palette)!;
      expect(l.pool).toBeGreaterThan(0);
      expect(l.breath).toBeGreaterThan(0);
      // The breath is the lesser light: it drifts over the pool, it does not replace it.
      expect(l.breath).toBeLessThan(l.pool);
      // The ground at the centre: the page, the pool over it, the breath over that, each the ink at its share.
      const ground = mix(paper, mix(paper, night, l.pool), l.breath);
      const short: string[] = [];
      for (const [step, at] of [["the prayers before and after", rest], ["the prayer being prayed", unlit]] as const) {
        for (const [what, share] of STEPPING) {
          if (step === "the prayer being prayed" && share === 0.9) continue;
          const r = ratio(mix(paper, ground, share * at), ground);
          if (r < 4.5) short.push(`${what} in ${step}, at ${Math.round(at * 100)}%: ${r.toFixed(2)}:1`);
        }
      }
      // The notes and captions do not step back, and are the faint shares as the palette draws them.
      expect(FAINT_WRITTEN.length).toBeGreaterThan(2);
      for (const share of FAINT_WRITTEN) {
        const at = drawn(palette, share) / 100;
        const r = ratio(mix(paper, ground, at), ground);
        if (r < 4.5) short.push(`text-paper/${share}, drawn at ${Math.round(at * 100)}%: ${r.toFixed(2)}:1`);
      }
      expect(short, short.join("\n")).toEqual([]);
    });
  }

  it("True black stays black: its pool is no fuller than Dark's", () => {
    const black = light(PALETTES.find((p) => p.id === "black")!)!;
    const dark = light(PALETTES.find((p) => p.id === "default")!)!;
    expect(black.pool + black.breath).toBeLessThanOrEqual(dark.pool + dark.breath);
    // Outside the pool the layer is transparent, so a corner of the screen is the palette's own #000000.
    expect(pool).toMatch(/transparent 72%\)/);
  });

  it("nothing moves on a look, and the breath is under the motion switch everywhere", () => {
    expect(breath).toMatch(/animation:\s*prayer-light-drift 24s ease-in-out infinite alternate;/);
    expect(rules(':where([data-motion="reduce"]) .prayer-light-breath').join("")).toMatch(/animation:\s*none;/);
    // The pool itself never moves.
    expect(pool).not.toMatch(/animation|transition|transform/);
    // On a look the breath is not drawn at all (the rule above), so there is nothing to move.
    expect(light(PALETTES.find((p) => p.id === "nightsky")!)).toBeNull();
  });

  it("the lit line's glow is the palette's ink, never a white typed in", () => {
    const lit = rules(':where([data-motion="full"]) [data-prayer-reader][data-following] [data-line][data-lit]').join("\n");
    expect(lit).toMatch(/text-shadow:\s*0 0 18px color-mix\(in srgb, var\(--color-paper\) 35%, transparent\);/);
    expect(lit).not.toMatch(/rgba?\(/);
    // On paper, where light cannot glow, none.
    expect(rules('html[data-reading-mode="parchment"] [data-prayer-reader] [data-line][data-lit]').join("")).toMatch(/text-shadow:\s*none;/);
  });

  it("Candlelight keeps the season on a prayer page: the fast's light, as in the Bible", () => {
    const light = bare("components/prayers/service/PrayerLight.tsx");
    // The palette worn, not the one stored, says whether the page is in Candlelight.
    expect(light).toContain("useCandleSeason(useCandlelightWorn());");
    const veil = bare("components/reader/CandleVeil.tsx");
    expect(veil).toContain("export function useCandleSeason(active = true): void {");
    expect(veil).toContain("const season = active && today && on ? (candleLight(today, style)?.id ?? null) : null;");
    // In a fast the season's light is the room's, and neither pool nor breath lies over it (the first test).
    const candle = PALETTES.find((p) => p.id === "candlelight")!;
    const { night, paper } = colours(candle);
    const { rest, unlit } = steps(candle);
    const short: string[] = [];
    for (const season of Object.values(CANDLE_LIGHTS)) {
      const rule = rules(`html[data-candle-season="${season.id}"]`).join("");
      expect(rule, season.id).toContain(`rgb(${season.rgb} / ${season.share})`);
      const ground = mix(season.rgb.split(" ").map(Number) as Rgb, night, season.share);
      for (const [step, at] of [["the prayers before and after", rest], ["the prayer being prayed", unlit]] as const) {
        for (const [what, share] of STEPPING) {
          if (step === "the prayer being prayed" && share === 0.9) continue;
          const r = ratio(mix(paper, ground, share * at), ground);
          if (r < 4.5) short.push(`${season.id}: ${what} in ${step}: ${r.toFixed(2)}:1`);
        }
      }
      for (const share of FAINT_WRITTEN) {
        const r = ratio(mix(paper, ground, drawn(candle, share) / 100), ground);
        if (r < 4.5) short.push(`${season.id}: text-paper/${share}: ${r.toFixed(2)}:1`);
      }
    }
    expect(Object.keys(CANDLE_LIGHTS).sort()).toEqual(["dormition", "lent", "nativity"]);
    expect(short, short.join("\n")).toEqual([]);
  });
});
