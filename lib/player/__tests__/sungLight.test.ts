import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { READING_THEMES } from "@/lib/reader/readingModes";

/**
 * Now Playing's sung words keep every line legible (1.9, the arbiter's
 * ruling of 2026-11-11 by the owner's own precedent: his "ok to all" of
 * 2026-11-10 on his page's 131, the prayer page's reading light; PLAN 13bc).
 *
 * While a chant is sung, the line being sung is lit, the lines beside it step
 * back, and the rest step back further (components/player/LiveCaptions.tsx,
 * the owner's picks of 2026-10-27, rounds 8 B and 9 A). They stepped back to
 * 30% and 17% of the ink, the English under them to 26% and 15%, and
 * checkMock measured the faintest at 1.39 to 1.64:1 on the export. Now
 * app/globals.css gives each palette its own steps (`--sung-*` on
 * `[data-sung-look="player"]`).
 *
 * This reads the stylesheet and does the arithmetic, as prayerLight.test.ts
 * does for 131: on every palette a reader can wear, the faintest sung words
 * (24px, large) hold 3:1 and the English under any line (15px) holds 4.5:1,
 * on the lightest ground Now Playing can lay under them; and the steps are
 * still steps: the line being sung leading, its words waiting no fainter than
 * the lines beside it, the rest further back.
 *
 * Now Playing is a dark island (components/player/NowPlayingSheet.tsx), so on
 * Light and the light looks it wears the dark island's tokens; on every dark
 * palette and look, that palette's own. Its ground is its night under the
 * track's cover, grey, at half brightness and 30%, with a 6% white glow at the
 * top: the lightest that can be is the cover white everywhere and the glow
 * whole, with none of the fall to night below. The sheet's own numbers are
 * held here too, so a change to them asks for this sum again.
 *
 * What it cannot see: a screen. checkMock measures the words view on the
 * export, on the pixels under the words.
 *
 * What a reader would notice if this broke: while a chant plays, the lines
 * around the one being sung too faint to read, most of all on Candlelight.
 */

const CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
const BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
const SHEET = readFileSync(join(process.cwd(), "components", "player", "NowPlayingSheet.tsx"), "utf8");
const CAPTIONS = readFileSync(join(process.cwd(), "components", "player", "LiveCaptions.tsx"), "utf8");

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

type Palette = { id: string; look?: "dark" | "light" };
const PALETTES: Palette[] = READING_THEMES.map((t) => ({ id: t.id, look: t.look }));
const light = (p: Palette) => p.id === "parchment" || p.look === "light";
const blockOf = (p: Palette) => (p.look ? `html[data-look="${p.id}"]` : p.id === "default" ? null : `html[data-reading-mode="${p.id}"]`);
const ISLAND_ON_PAPER = 'html[data-reading-mode="parchment"] .dark-island';

/** The ink and the night inside the dark island on a palette. */
function colours(p: Palette): { night: Rgb; paper: Rgb } {
  const pick = (name: string) => {
    const island = light(p) ? token(ISLAND_ON_PAPER, name) : null;
    const own = blockOf(p);
    const raw = island ?? (own ? token(own, name) : null) ?? token("@theme", name) ?? token(":root", name);
    if (!raw) throw new Error(`${p.id}: no ${name}`);
    return hex(raw);
  };
  return { night: pick("--color-night"), paper: pick("--color-paper") };
}

/** The ink and the page on a palette, outside any island: a chant's own page. */
function pageColours(p: Palette): { night: Rgb; paper: Rgb } {
  const pick = (name: string) => {
    const own = blockOf(p);
    const raw = (own ? token(own, name) : null) ?? token("@theme", name) ?? token(":root", name);
    if (!raw) throw new Error(`${p.id}: no ${name}`);
    return hex(raw);
  };
  return { night: pick("--color-night"), paper: pick("--color-paper") };
}

const PAGE_STEPS = ["--sung-wait", "--sung-near", "--sung-far", "--sung-under", "--sung-under-dim", "--sung-gloss"] as const;
type PageSteps = Record<(typeof PAGE_STEPS)[number], number>;

/** A chant page's steps, as the cascade answers: paper's (a light look wears it), a look's, the mode's own, the page's. */
function pageSteps(p: Palette): PageSteps {
  const tries = light(p)
    ? ['html[data-reading-mode="parchment"] [data-sung-look="page"]']
    : p.look
      ? [':where(html[data-look]) [data-sung-look="page"]']
      : p.id === "default"
        ? []
        : [`html[data-reading-mode="${p.id}"] [data-sung-look="page"]`];
  const out = {} as PageSteps;
  for (const name of PAGE_STEPS) {
    let v: number | null = null;
    for (const selector of [...tries, '[data-sung-look="page"]']) {
      const raw = token(selector, name);
      if (raw) {
        v = Number(raw);
        break;
      }
    }
    if (v === null || !Number.isFinite(v)) throw new Error(`${p.id}: no ${name} on the page`);
    out[name] = v;
  }
  return out;
}

/** Candlelight's seasons light the room behind its page: each room's colour where it is fullest. */
function rooms(): { season: string; rgb: Rgb; share: number }[] {
  return [...BARE.matchAll(/html\[data-candle-season="([a-z]+)"\] \{\s*--room: radial-gradient\([^,]+, rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/g)].map((m) => ({
    season: m[1],
    rgb: [Number(m[2]), Number(m[3]), Number(m[4])] as Rgb,
    share: Number(m[5]),
  }));
}

const STEPS = ["--sung-wait", "--sung-near", "--sung-far", "--sung-under", "--sung-under-lit", "--sung-under-near", "--sung-under-far"] as const;
type Steps = Record<(typeof STEPS)[number], number>;

/** The palette's steps, as the cascade answers: a look's shared rule, else its mode's own, else the player's. */
function steps(p: Palette): Steps {
  const tries = p.look ? [':where(html[data-look]) [data-sung-look="player"]'] : p.id === "default" ? [] : [`html[data-reading-mode="${p.id}"] [data-sung-look="player"]`];
  const out = {} as Steps;
  for (const name of STEPS) {
    let v: number | null = null;
    for (const selector of [...tries, '[data-sung-look="player"]']) {
      const raw = token(selector, name);
      if (raw) {
        v = Number(raw);
        break;
      }
    }
    if (v === null || !Number.isFinite(v)) throw new Error(`${p.id}: no ${name}`);
    out[name] = v;
  }
  return out;
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

/** The sheet's backdrop, as NowPlayingSheet.tsx draws it: the cover's share, its brightness, the glow's share. */
const COVER = 0.3;
const BRIGHTNESS = 0.5;
const GLOW = 0.06;

/** The lightest ground under the words: the cover white everywhere, at its brightness and share, and the glow whole. */
const lightest = (night: Rgb): Rgb => mix([255, 255, 255], mix([255 * BRIGHTNESS, 255 * BRIGHTNESS, 255 * BRIGHTNESS], night, COVER), GLOW);

describe("Now Playing's sung words, every line legible", () => {
  it("draws its ground as this sum takes it: a dark island, the cover grey at 30% and half brightness, a 6% glow", () => {
    expect(SHEET).toContain('"dark-island absolute inset-0 flex flex-col overflow-hidden bg-night');
    expect(SHEET).toContain('shown ? "opacity-30" : "opacity-0"');
    expect(SHEET).toContain('filter: "grayscale(1) blur(42px) brightness(0.5)"');
    expect(SHEET).toContain("radial-gradient(900px 520px at 20% -8%, rgba(255,255,255,0.06), transparent 68%)");
    expect(PALETTES.length).toBeGreaterThanOrEqual(24);
  });

  it("dims by the palette's steps, never by a fixed share", () => {
    const at = (selector: string) => rules(selector).join("");
    expect(at('[data-sung-look="player"] [data-sung="near"] [data-sung-main]')).toMatch(/opacity:\s*var\(--sung-near\)/);
    expect(at('[data-sung-look="player"] [data-sung="far"] [data-sung-main]')).toMatch(/opacity:\s*var\(--sung-far\)/);
    expect(at('[data-sung-look="player"] [data-sung-under]')).toMatch(/opacity:\s*var\(--sung-under\)/);
    expect(at('[data-sung-look="player"] [data-sung="lit"] [data-sung-under]')).toMatch(/opacity:\s*var\(--sung-under-lit\)/);
    expect(at('[data-sung-look="player"] [data-sung="near"] [data-sung-under]')).toMatch(/opacity:\s*var\(--sung-under-near\)/);
    expect(at('[data-sung-look="player"] [data-sung="far"] [data-sung-under]')).toMatch(/opacity:\s*var\(--sung-under-far\)/);
    // The line being sung stands whole: nothing dims it.
    expect(at('[data-sung-look="player"] [data-sung="lit"] [data-sung-main]')).not.toMatch(/opacity/);
    // Its words wait at the palette's step until each is sung, read where they stand, not a share typed in.
    expect(CAPTIONS).toContain('getComputedStyle(el).getPropertyValue("--sung-wait")');
    expect(CAPTIONS).toContain("el.style.opacity = String(waiting.current);");
    expect(CAPTIONS).toContain("const o = waiting.current + (1 - waiting.current) * Math.min(1, since / 0.12);");
  });

  for (const p of PALETTES) {
    it(`${p.id}: the faintest words hold 3:1 and the English under any line 4.5:1, on the lightest ground`, () => {
      const { night, paper } = colours(p);
      const ground = lightest(night);
      const s = steps(p);
      const short: string[] = [];
      for (const [what, at, floor] of [
        ["a word of the line sung, waiting to be sung", s["--sung-wait"], 3],
        ["a line beside the one sung", s["--sung-near"], 3],
        ["a line further off", s["--sung-far"], 3],
        ["the English under a line", s["--sung-under"], 4.5],
        ["the English under the line sung", s["--sung-under-lit"], 4.5],
        ["the English under a line beside it", s["--sung-under-near"], 4.5],
        ["the English under a line further off", s["--sung-under-far"], 4.5],
      ] as const) {
        const r = ratio(mix(paper, ground, at), ground);
        if (r < floor) short.push(`${what}, at ${Math.round(at * 100)}%: ${r.toFixed(2)}:1`);
      }
      expect(short, short.join("\n")).toEqual([]);
    });

    it(`${p.id}: the steps are still steps`, () => {
      const s = steps(p);
      expect(s["--sung-far"], "the rest further back than the lines beside the one sung").toBeLessThan(s["--sung-near"]);
      expect(s["--sung-near"], "the line about to be sung never fainter than the lines beside it").toBeLessThan(s["--sung-wait"]);
      expect(s["--sung-wait"], "a word lights as it is sung").toBeLessThan(1);
      expect(s["--sung-under-far"]).toBeLessThan(s["--sung-under-near"]);
      expect(s["--sung-under-near"]).toBeLessThanOrEqual(s["--sung-under"]);
      expect(s["--sung-under"]).toBeLessThan(s["--sung-under-lit"]);
      expect(s["--sung-under-lit"]).toBeLessThanOrEqual(1);
    });
  }

  it("is the sum that failed the old steps: 30% and 17% fall short of 3:1 on every palette", () => {
    for (const p of PALETTES) {
      const { night, paper } = colours(p);
      const ground = lightest(night);
      expect(ratio(mix(paper, ground, 0.17), ground), p.id).toBeLessThan(3);
      expect(ratio(mix(paper, ground, 0.15), ground), p.id).toBeLessThan(4.5);
    }
  });
});

describe("a chant page's sung words, every line legible (PLAN 13bf)", () => {
  it("dims by the palette's steps, never by a fixed share", () => {
    const at = (selector: string) => rules(selector).join("");
    expect(at('[data-sung-look="page"] [data-sung="near"] [data-sung-main]')).toMatch(/opacity:\s*var\(--sung-near\)/);
    expect(at('[data-sung-look="page"] [data-sung="far"] [data-sung-main]')).toMatch(/opacity:\s*var\(--sung-far\)/);
    expect(at('[data-sung-look="page"] [data-sung-under]')).toMatch(/opacity:\s*var\(--sung-under\)/);
    expect(at('[data-sung-look="page"] [data-sung="near"] [data-sung-under]')).toMatch(/opacity:\s*var\(--sung-under-dim\)/);
    expect(at('[data-sung-look="page"] [data-sung="far"] [data-sung-under]')).toMatch(/opacity:\s*var\(--sung-under-dim\)/);
    expect(at('[data-sung-look="page"] [data-sung="rest"] [data-sung-gloss]')).toMatch(/opacity:\s*var\(--sung-gloss\)/);
    expect(at('[data-sung-look="page"] [data-sung="lit"] [data-sung-main]')).not.toMatch(/opacity/);
    // Candlelight's three seasons are read, so their rooms are in the sum.
    expect(rooms().map((r) => r.season).sort()).toEqual(["dormition", "lent", "nativity"]);
  });

  for (const p of PALETTES) {
    it(`${p.id}: every word on the page holds 4.5:1 at every step, on its own page`, () => {
      const { night, paper } = pageColours(p);
      // Candlelight's page also stands under each season's room, where it is fullest.
      const grounds: Rgb[] = [night, ...(p.id === "candlelight" ? rooms().map((r) => mix(r.rgb, night, r.share)) : [])];
      const s = pageSteps(p);
      const short: string[] = [];
      for (const ground of grounds) {
        for (const [what, at] of [
          ["a word of the line sung, waiting (a long hymn lights at 21px)", s["--sung-wait"]],
          ["a line beside the one sung", s["--sung-near"]],
          ["a line further off", s["--sung-far"]],
          ["a line's sound or English", s["--sung-under"]],
          ["the sound or English of a line stepped back", s["--sung-under-dim"]],
          ["a line's English, at rest or sung", s["--sung-gloss"]],
        ] as const) {
          const r = ratio(mix(paper, ground, at), ground);
          if (r < 4.5) short.push(`${what}, at ${Math.round(at * 100)}% on ${ground.map(Math.round).join(",")}: ${r.toFixed(2)}:1`);
        }
      }
      expect(short, short.join("\n")).toEqual([]);
    });

    it(`${p.id}: the page's steps are still steps`, () => {
      const s = pageSteps(p);
      expect(s["--sung-far"]).toBeLessThan(s["--sung-near"]);
      expect(s["--sung-near"], "the line about to be sung never fainter than the lines beside it").toBeLessThan(s["--sung-wait"]);
      expect(s["--sung-wait"]).toBeLessThan(1);
      expect(s["--sung-under-dim"]).toBeLessThanOrEqual(s["--sung-under"]);
    });
  }

  it("is the sum that failed the old steps: 30% and 34% fall short of 4.5:1 on every palette", () => {
    for (const p of PALETTES) {
      const { night, paper } = pageColours(p);
      expect(ratio(mix(paper, night, 0.3), night), p.id).toBeLessThan(4.5);
      expect(ratio(mix(paper, night, 0.34), night), p.id).toBeLessThan(4.5);
    }
  });
});
