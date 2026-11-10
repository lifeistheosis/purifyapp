import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { READING_THEMES, themeAttributes } from "@/lib/reader/readingModes";
import { BAR_NIGHT, statusBarColor } from "@/lib/reader/statusBarColor";

/**
 * The phone's status bar follows the palette the app is wearing
 * (lib/reader/statusBarColor.ts; barColor in
 * components/native/NativeBridge.tsx). On Android 14 and older the bar is an
 * opaque strip, and until 1.9's looks it was the night colour on every
 * palette but True black: a grey band over Candlelight's black, a neutral
 * one over Mosaic's lapis. Now every dark palette gives the strip its own
 * page colour, and Light and the light looks keep the night strip Light has
 * always had.
 *
 * Nothing on a screen in this repository shows that strip: only a phone on
 * Android 14 or older does. So what can be held here is held here: the
 * colour for every palette of the registry, the form the status bar takes,
 * and that the bridge repaints when what is worn changes.
 */
const css = readFileSync("app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const bridge = readFileSync("components/native/NativeBridge.tsx", "utf8");

/** A palette's page colour, as its own block of the stylesheet declares it. */
function pageOf(id: string): { mode: string | null; declared: string } {
  const { mode, look } = themeAttributes(id as (typeof READING_THEMES)[number]["id"]);
  const head = look ? `html[data-look="${look}"] {` : mode ? `html[data-reading-mode="${mode}"] {` : "@theme {";
  for (let at = css.indexOf(head); at >= 0; at = css.indexOf(head, at + 1)) {
    const found = /--color-night:\s*([^;]+);/.exec(css.slice(at, css.indexOf("}", at)));
    if (found) return { mode, declared: found[1].trim() };
  }
  throw new Error(`${id}: no --color-night in a block that begins ${head}`);
}

const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = (hex: string) => {
  const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * lin(n[0]) + 0.7152 * lin(n[1]) + 0.0722 * lin(n[2]);
};

describe("the strip's colour", () => {
  it("is the page colour the palette says, in the form the status bar takes", () => {
    expect(statusBarColor(null, "#0d1c40")).toBe("#0d1c40");
    expect(statusBarColor(null, "  #0D1C40 ")).toBe("#0d1c40");
    expect(statusBarColor("black", "#000000")).toBe("#000000");
    // A browser that hands the colour back as numbers says the same thing.
    expect(statusBarColor(null, "rgb(13, 28, 64)")).toBe("#0d1c40");
    expect(statusBarColor(null, "rgb(13 28 64)")).toBe("#0d1c40");
    expect(statusBarColor(null, "rgba(5, 7, 13, 1)")).toBe("#05070d");
  });

  it("falls back to the night colour for anything it cannot read, never a broken colour", () => {
    for (const odd of ["", "   ", null, undefined, "#fff", "#12345", "var(--color-night)", "oklch(0.2 0.02 260)", "rgb(300, 0, 0)", "night"]) {
      expect(statusBarColor(null, odd), String(odd)).toBe(BAR_NIGHT);
    }
  });

  it("stays the night colour over Light and over a light look, whatever their paper", () => {
    expect(statusBarColor("parchment", "#f1e8d4")).toBe(BAR_NIGHT);
    expect(statusBarColor("parchment", "#f7f7f5")).toBe(BAR_NIGHT);
  });
});

describe("every palette a reader can wear", () => {
  const palettes = READING_THEMES.map((t) => ({ id: t.id, label: t.label, ...pageOf(t.id) }));

  it("is all 25 of them, each with a page colour written as six plain digits", () => {
    expect(palettes).toHaveLength(25);
    for (const p of palettes) expect(p.declared, p.label).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("the night colour is Dark's own page", () => {
    expect(palettes.find((p) => p.id === "default")?.declared.toLowerCase()).toBe(BAR_NIGHT);
  });

  it("a dark palette's strip is its own page, and Light's and a light look's is the night colour", () => {
    for (const p of palettes) {
      const strip = statusBarColor(p.mode, p.declared);
      if (p.mode === "parchment") expect(strip, p.label).toBe(BAR_NIGHT);
      else expect(strip, p.label).toBe(p.declared.toLowerCase());
    }
    // The ones a phone showed wrong: black, Candlelight's black, and the coloured dark looks.
    const strip = (id: string) => statusBarColor(palettes.find((p) => p.id === id)!.mode, palettes.find((p) => p.id === id)!.declared);
    expect(strip("black")).toBe("#000000");
    expect(strip("candlelight")).toBe("#050505");
    expect(strip("mosaic")).toBe("#0d1c40");
    expect(strip("damask")).toBe("#240b14");
    expect(new Set(palettes.filter((p) => p.mode !== "parchment").map((p) => statusBarColor(p.mode, p.declared))).size).toBe(15);
  });

  it("the bar's marks are drawn light on every palette, and every strip is dark enough for them", () => {
    expect(bridge).toContain("await StatusBar.setStyle({ style: Style.Dark });");
    for (const p of palettes) {
      const strip = statusBarColor(p.mode, p.declared);
      expect(1.05 / (lum(strip) + 0.05), `white marks on ${p.label}'s strip`).toBeGreaterThanOrEqual(7);
    }
  });
});

describe("the bridge paints what is worn", () => {
  it("reads the palette from the page, never from what is stored", () => {
    expect(bridge).toContain('import { statusBarColor } from "@/lib/reader/statusBarColor";');
    expect(bridge).toContain('return statusBarColor(root.getAttribute("data-reading-mode"), getComputedStyle(root).getPropertyValue("--color-night"));');
    // A stored look the gate has put down, or a palette under Candlelight at Vespers, is not what is worn.
    expect(bridge).not.toMatch(/READING_THEME_KEY|coerceReadingTheme/);
  });

  it("repaints when the root's palette changes, and stops when it leaves", () => {
    expect(bridge).toContain("const worn = new MutationObserver(paintBar);");
    expect(bridge).toContain('worn.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reading-mode", "data-look"] });');
    expect(bridge).toContain("stopBar = () => worn.disconnect();");
    expect(bridge).toMatch(/void StatusBar\.setBackgroundColor\(\{ color: barColor\(\) \}\)\.catch\(\(\) => \{\}\);/);
  });
});
