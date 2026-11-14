// The ambience sheet's tile while its sound loads: "Loading" is legible on
// every palette at every frame (1.9, Updates 67's checkMock with pixels,
// mended by Updates 70).
//
// A tile whose sound is still loading is lit, as a playing one is
// (components/player/AmbienceSheet.tsx, SoundTile: bg-paper, the ink
// text-night), and its state line says "Loading" at opacity-70. It also
// breathed while it loaded (motion-safe:animate-pulse), and Tailwind's pulse
// takes the line to an opacity of 0.5 and back every 2s, whatever the line's
// own. At 0.5 the line reads under WCAG AA's 4.5:1 on 20 of the 21 palettes,
// Mosaic least at 3.22:1; only Linen holds, at 4.81:1. On the export,
// checkMock with pixels caught it wherever its measure fell in the breath:
// 3.34 to 4.50:1 on 5 to 8 palettes at 390, 800 and 1032, in English and in
// Arabic (docs/handoffs/updates-67-runners/tileloading67.mjs). "Playing" is
// the same line without the breath, and passed: 5.96:1 at its least, Mosaic.
//
// The mend takes the breath off the words, so "Loading" is drawn as
// "Playing" is, at every frame. A breath that kept to the floor would have
// to stop at an opacity of 0.61 (Mosaic's need), and Tailwind's pulse cannot.
//
// This reads the sheet as a reader gets it, with a sound loading, and the
// stylesheet: the faintest the state line can be drawn in any frame (its own
// opacity, its ink's share, and every keyframe of any animation on it, with
// the motion switch on or off), laid over the lit tile's paper in every
// palette's ink, must be 4.5:1 or more.
//
// What it cannot see: the screen. checkMock with pixels on the export
// measures the tile mid-loading (tileloading67.mjs; PULSE=faint holds any
// breath at its faintest frame).
//
// What a reader would notice if this broke: "Loading" fading too faint to
// read on most palettes while a sound starts.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AmbienceSnapshot } from "@/lib/ambience/player";
import { READING_THEMES } from "@/lib/reader/readingModes";

vi.mock("next/navigation", () => ({ usePathname: () => "/bible/john/1" }));
vi.mock("@/components/i18n/MessagesProvider", () => ({ useTranslate: () => ({ t: (k: string) => k, locale: "en" }) }));
vi.mock("@/components/ui/Sheet", () => ({
  Sheet: ({ open, titleExtra, children }: { open: boolean; titleExtra?: ReactNode; children: ReactNode }) =>
    open ? createElement("div", { role: "dialog" }, titleExtra, children) : null,
}));
vi.mock("@/components/billing/UpgradeModal", () => ({
  UpgradeModalProvider: ({ children }: { children: ReactNode }) => children,
  useUpgradeModal: () => ({ open: () => {} }),
}));
vi.mock("@/lib/entitlements/usePlusFeatures", () => ({ usePlusFeatures: () => true }));
vi.mock("@/lib/ambience/sheet", () => ({ useAmbienceSheet: () => ({ open: true, overPlayer: false }), closeAmbience: () => {} }));
const LOADING: AmbienceSnapshot = { playing: null, loading: "rain", failed: null, failedFor: null, volume: 0.55, balance: 0.4, last: null, layers: [], levels: {} };
vi.mock("@/lib/ambience/player", () => ({
  DEFAULT_LEVEL: 1,
  useAmbience: () => LOADING,
  layerAmbience: async () => {},
  setAmbienceBalance: () => {},
  setAmbienceLevel: () => {},
  setAmbienceVolume: () => {},
}));
vi.mock("@/lib/player/sleep", () => ({
  isChosen: () => false,
  minutesLeft: () => 0,
  setSleepTimer: () => {},
  useSleepTimer: () => ({ kind: "off" }),
}));
vi.mock("@/lib/prayers/persistentAudioStore", () => ({
  getAudioSnapshot: () => ({ playing: false, src: null }),
  subscribeAudio: () => () => {},
}));

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");
const bare = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const CSS = bare(read("app/globals.css"));
const TAILWIND = bare(read("node_modules/tailwindcss/theme.css"));

type Rgb = [number, number, number];

function hex(raw: string): Rgb {
  const m = /#([0-9a-f]{6})\b/i.exec(raw);
  if (!m) throw new Error(`not a colour: ${raw}`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as Rgb;
}

/** A custom property's value in the first rule whose selector is exactly `selector`. */
function token(selector: string, name: string): string | null {
  for (const m of CSS.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if ((m[1].split(";").pop() ?? "").trim() !== selector) continue;
    const d = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(m[2]);
    if (d) return d[1].trim();
  }
  return null;
}

const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const mix = (fg: Rgb, bg: Rgb, a: number): Rgb => fg.map((v, i) => v * a + bg[i] * (1 - a)) as Rgb;
const ratio = (a: Rgb, b: Rgb) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** The five palettes and the two earned by reading, as data-reading-mode wears them, then the fourteen looks. */
function palettes(): { name: string; night: Rgb; paper: Rgb }[] {
  const worn: [string, string | null][] = [
    ["Dark", null],
    ["Light", "parchment"],
    ["Black", "black"],
    ["Candlelight", "candlelight"],
    ["Monastery", "monastery"],
    ...READING_THEMES.filter((theme) => theme.collection).map((theme): [string, string] => [theme.label, theme.id]),
  ];
  const own = (selector: string | null, name: string) => {
    const raw = (selector ? token(selector, name) : null) ?? token("@theme", name) ?? token(":root", name);
    if (!raw) throw new Error(`${selector ?? "Dark"}: no ${name}`);
    return hex(raw);
  };
  const all = worn.map(([name, mode]) => {
    const selector = mode ? `html[data-reading-mode="${mode}"]` : null;
    return { name, night: own(selector, "--color-night"), paper: own(selector, "--color-paper") };
  });
  for (const theme of READING_THEMES.filter((t) => t.look)) {
    const selector = `html[data-look="${theme.id}"]`;
    const pick = (name: string) => {
      const raw = token(selector, name);
      if (!raw) throw new Error(`${theme.id}: no ${name}`);
      return hex(raw);
    };
    all.push({ name: theme.label, night: pick("--color-night"), paper: pick("--color-paper") });
  }
  return all;
}

/** The body of `@keyframes name`, the app's own before Tailwind's, its braces balanced. */
function keyframes(name: string): string {
  for (const css of [CSS, TAILWIND]) {
    const at = new RegExp(`@keyframes\\s+${name.replace(/[-]/g, "\\-")}\\s*\\{`).exec(css);
    if (!at) continue;
    let depth = 1;
    let i = at.index + at[0].length;
    for (; i < css.length && depth > 0; i++) depth += css[i] === "{" ? 1 : css[i] === "}" ? -1 : 0;
    return css.slice(at.index + at[0].length, i - 1);
  }
  throw new Error(`no @keyframes ${name} in app/globals.css or Tailwind's theme`);
}

/** The keyframes an `animate-*` utility runs: an arbitrary one names them, a theme one through its --animate-* value. */
function keyframesOf(utility: string): string {
  const arbitrary = /^animate-\[([^\]_]+)/.exec(utility);
  if (arbitrary) return arbitrary[1];
  const name = utility.slice("animate-".length);
  const value = /--animate-([\w-]+)\s*:\s*([^;]+);/g;
  for (const css of [CSS, TAILWIND]) {
    for (const m of css.matchAll(value)) if (m[1] === name) return m[2].trim().split(/\s+/)[0];
  }
  throw new Error(`${utility}: no --animate-${name} in app/globals.css or Tailwind's theme`);
}

const share = (raw: string) => (raw.startsWith("[") ? (raw.endsWith("%]") ? parseFloat(raw.slice(1)) / 100 : parseFloat(raw.slice(1))) : Number(raw) / 100);

/**
 * The faintest the state line can be drawn, as a share of the tile's ink: the
 * least of its opacities (any variant may hold), times its ink's share, and,
 * for every animation on it (motion on), the least opacity of any keyframe.
 * An animation of anything but opacity is refused, so a new kind of breath is
 * read before it ships rather than missed.
 */
function faintest(classes: string[]): { alpha: number; why: string[] } {
  const why: string[] = [];
  let opacity = 1;
  let ink = 1;
  for (const c of classes) {
    const utility = c.split(":").pop() ?? c;
    const o = /^opacity-(\d+|\[[^\]]+\])$/.exec(utility);
    if (o) {
      opacity = Math.min(opacity, share(o[1]));
      why.push(`${c}: ${share(o[1])}`);
      continue;
    }
    const t = /^text-([a-z]+(?:-[a-z]+)*)(?:\/(\d+|\[[^\]]+\]))?$/.exec(utility);
    if (t && token("@theme", `--color-${t[1]}`)) {
      expect(t[1], `the state line's own ink (${c}); the arithmetic reads it as the lit tile's night`).toBe("night");
      if (t[2]) ink = Math.min(ink, share(t[2]));
      why.push(`${c}: ink at ${t[2] ? share(t[2]) : 1}`);
      continue;
    }
    if (utility.startsWith("animate-") && utility !== "animate-none") {
      const name = keyframesOf(utility);
      const body = keyframes(name);
      for (const d of body.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)) {
        expect(d[1], `${c} animates ${d[1]} in @keyframes ${name}; this test reads opacity only`).toBe("opacity");
        const v = d[2].trim();
        const at = v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v);
        opacity = Math.min(opacity, at);
        why.push(`${c}: @keyframes ${name} to ${at}`);
      }
    }
  }
  return { alpha: opacity * ink, why };
}

async function loadingTile(): Promise<{ tile: string[]; line: string[] }> {
  const { AmbienceSheet } = await import("@/components/player/AmbienceSheet");
  const html = renderToStaticMarkup(createElement(AmbienceSheet));
  const button = /<button[^>]*data-ambience-tile="rain"[^>]*>([\s\S]*?)<\/button>/.exec(html);
  expect(button, "the rain tile, its sound loading").not.toBeNull();
  const tile = /class="([^"]*)"/.exec(button?.[0].slice(0, button[0].indexOf(">")) ?? "")?.[1] ?? "";
  const line = /<span class="([^"]*)">ambience\.loading<\/span>/.exec(button?.[1] ?? "")?.[1];
  expect(line, "the tile's state line, saying Loading").toBeDefined();
  return { tile: tile.split(/\s+/), line: (line ?? "").split(/\s+/) };
}

describe("an ambience tile whose sound is loading", () => {
  it("is drawn as the arithmetic assumes: lit, the night ink on the paper, its state line in that ink", async () => {
    const { tile, line } = await loadingTile();
    expect(tile).toEqual(expect.arrayContaining(["bg-paper", "text-night"]));
    // No ground of its own under the words: they stand on the tile's paper.
    expect(line.filter((c) => /^(?:[\w-]+:)*bg-/.test(c))).toEqual([]);
  });

  it("holds Loading at 4.5:1 or more on every one of the 21 palettes in its faintest frame, motion on or off", async () => {
    const { line } = await loadingTile();
    const { alpha, why } = faintest(line);
    expect(alpha > 0 && alpha <= 1, `the line's faintest share (${why.join("; ")})`).toBe(true);
    const all = palettes();
    expect(all.length).toBe(21);
    const under = all
      .map(({ name, night, paper }) => ({ name, r: ratio(mix(night, paper, alpha), paper) }))
      .filter(({ r }) => r < 4.5)
      .map(({ name, r }) => `${name} ${r.toFixed(2)}:1`);
    expect(under, `Loading at ${alpha} of the ink (${why.join("; ")})`).toEqual([]);
  });
});
