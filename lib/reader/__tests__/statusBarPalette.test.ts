import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { READING_THEMES, themeAttributes } from "@/lib/reader/readingModes";
import { BAR_NIGHT, barPlace, behindTheBar, groundOf, luminanceOf, plainColor, statusBarColor, statusBarMarks, type BarLayer } from "@/lib/reader/statusBarColor";

/**
 * The phone's status bar follows the page (lib/reader/statusBarColor.ts is
 * the rule; components/native/statusBar.ts asks the page and the phone and
 * tells the phone the answer; NativeBridge starts it).
 *
 * The strip. On Android 14 and older the bar is an opaque strip, and until
 * 1.9's looks it was the night colour on every palette but True black: a
 * grey band over Candlelight's black, a neutral one over Mosaic's lapis, a
 * dark one over Light's paper. Every palette gives the strip its own page
 * colour now.
 *
 * The marks. They were light on every palette. The owner's word, 2026-11-10
 * ("match light"): Light and the light looks have their own paper up there
 * with dark marks. The arbiter's call the same evening: one rule for every
 * phone, the marks suit what is behind them, and where the app cannot tell
 * they stay light, so no phone ends up worse than it was. A dark palette's
 * marks do not change anywhere.
 *
 * Nothing on a screen in this repository shows a phone's status bar: only a
 * phone does. So what can be held here is held here: the strip's colour for
 * every palette of the registry; the marks for every palette, and that they
 * read on the strip; where the marks stand on each kind of phone; what a
 * stack of the page's layers shows at the bar's place; and how the bridge is
 * wired.
 */
const css = readFileSync("app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const bridge = readFileSync("components/native/NativeBridge.tsx", "utf8");
const follower = readFileSync("components/native/statusBar.ts", "utf8");

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

/** The contrast of marks on a ground: white marks, or black ones. */
const marksOn = (ground: string, marks: "light" | "dark") => {
  const l = luminanceOf(ground);
  return marks === "light" ? 1.05 / (l + 0.05) : (l + 0.05) / 0.05;
};

describe("the strip's colour", () => {
  it("is the page colour the palette says, in the form the status bar takes", () => {
    expect(statusBarColor("#0d1c40")).toBe("#0d1c40");
    expect(statusBarColor("  #0D1C40 ")).toBe("#0d1c40");
    expect(statusBarColor("#000000")).toBe("#000000");
    // A browser that hands the colour back as numbers says the same thing.
    expect(statusBarColor("rgb(13, 28, 64)")).toBe("#0d1c40");
    expect(statusBarColor("rgb(13 28 64)")).toBe("#0d1c40");
    expect(statusBarColor("rgba(5, 7, 13, 1)")).toBe("#05070d");
    // Light's own paper, where the night colour stood until 1.9.
    expect(statusBarColor("#f1e8d4")).toBe("#f1e8d4");
  });

  it("falls back to the night colour for anything it cannot read, never a broken colour", () => {
    for (const odd of ["", "   ", null, undefined, "#fff", "#12345", "var(--color-night)", "oklch(0.2 0.02 260)", "rgb(300, 0, 0)", "night", "rgba(13, 28, 64, 0.5)", "rgb(13 28 64 / 40%)"]) {
      expect(statusBarColor(odd), String(odd)).toBe(BAR_NIGHT);
      expect(plainColor(odd), String(odd)).toBeNull();
    }
  });
});

describe("the marks", () => {
  it("are dark on a light ground and light on a dark one, by which reads better", () => {
    expect(statusBarMarks("#f1e8d4")).toBe("dark");
    expect(statusBarMarks("#ffffff")).toBe("dark");
    expect(statusBarMarks("#101013")).toBe("light");
    expect(statusBarMarks("#000000")).toBe("light");
    expect(statusBarMarks("#0d1c40")).toBe("light");
    // Mid grey is where the two meet: each side takes the marks that stand out more.
    for (const grey of ["#5a5a5a", "#707070", "#777777", "#808080", "#9a9a9a"]) {
      const chosen = statusBarMarks(grey);
      expect(marksOn(grey, chosen), grey).toBeGreaterThanOrEqual(marksOn(grey, chosen === "dark" ? "light" : "dark"));
    }
  });

  it("stay light wherever the ground is not known: no phone ends up worse than it was", () => {
    for (const unknown of [null, undefined, "", "var(--color-night)", "rgba(241, 232, 212, 0.5)", "paper"]) {
      expect(statusBarMarks(unknown), String(unknown)).toBe("light");
    }
  });
});

describe("every palette a reader can wear", () => {
  const palettes = READING_THEMES.map((t) => ({ id: t.id, label: t.label, ...pageOf(t.id) }));
  const light = palettes.filter((p) => p.mode === "parchment");
  const dark = palettes.filter((p) => p.mode !== "parchment");

  it("is all 22 of them, each with a page colour written as six plain digits", () => {
    expect(palettes).toHaveLength(22);
    for (const p of palettes) expect(p.declared, p.label).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("the night colour is Dark's own page", () => {
    expect(palettes.find((p) => p.id === "default")?.declared.toLowerCase()).toBe(BAR_NIGHT);
  });

  it("paints the strip its own page, Light and the light looks as well", () => {
    for (const p of palettes) expect(statusBarColor(p.declared), p.label).toBe(p.declared.toLowerCase());
    const strip = (id: string) => statusBarColor(palettes.find((p) => p.id === id)!.declared);
    // The ones a phone showed wrong: black, Candlelight's black, the coloured dark looks, and Light's paper.
    expect(strip("black")).toBe("#000000");
    expect(strip("candlelight")).toBe("#050505");
    expect(strip("mosaic")).toBe("#0d1c40");
    expect(strip("damask")).toBe("#240b14");
    expect(strip("parchment")).not.toBe(BAR_NIGHT);
    expect(strip("linen")).toBe("#f6f4ef");
    // No two palettes share a page, so no two share a strip.
    expect(new Set(palettes.map((p) => statusBarColor(p.declared))).size).toBe(22);
  });

  it("draws dark marks on Light and the eight light looks, and light marks on the thirteen dark palettes, as before", () => {
    expect(light.map((p) => p.id)).toEqual(["parchment", "desert", "jordan", "blush", "rose", "lavender", "olive", "stone", "linen"]);
    expect(dark).toHaveLength(13);
    for (const p of light) expect(statusBarMarks(statusBarColor(p.declared)), p.label).toBe("dark");
    for (const p of dark) expect(statusBarMarks(statusBarColor(p.declared)), p.label).toBe("light");
  });

  it("the marks read on every strip at 7:1 or more", () => {
    for (const p of palettes) {
      const strip = statusBarColor(p.declared);
      expect(marksOn(strip, statusBarMarks(strip)), `${p.label}'s marks on its strip`).toBeGreaterThanOrEqual(7);
    }
    // What a paper strip would have been with the old light marks, and the old night strip with them: why both moved together.
    const paper = statusBarColor(pageOf("parchment").declared);
    expect(marksOn(paper, "light")).toBeLessThan(1.5);
    expect(marksOn(BAR_NIGHT, "light")).toBeGreaterThan(15);
  });
});

describe("where the marks stand, on each kind of phone", () => {
  const paper = "#f1e8d4";

  it("Android 14 and older: the strip takes the colour, and the marks suit it whatever the page draws", () => {
    // The phone gives the colour back in capitals.
    const place = barPlace({ platform: "android", asked: paper, strip: "#F1E8D4", inset: 28 });
    expect(place).toBe("strip");
    expect(behindTheBar(place, paper, BAR_NIGHT)).toBe(paper);
    expect(statusBarMarks(behindTheBar(place, paper, null))).toBe("dark");
    // With an older web view the page is set below the bar: the strip is still the app's own.
    expect(barPlace({ platform: "android", asked: paper, strip: paper, inset: 0 })).toBe("strip");
    // A dark palette: its own page, light marks.
    expect(statusBarMarks(behindTheBar(barPlace({ platform: "android", asked: "#0d1c40", strip: "#0D1C40", inset: 0 }), "#0d1c40", null))).toBe("light");
  });

  it("Android 15 and newer, a current web view: the strip is not the app's, the page lies under the bar, and the marks suit the page", () => {
    // The phone gives a clear strip back as black.
    const place = barPlace({ platform: "android", asked: paper, strip: "#000000", inset: 28 });
    expect(place).toBe("page");
    expect(statusBarMarks(behindTheBar(place, paper, paper))).toBe("dark");
    // A surface that is dark on every palette under the bar: light marks, though Light is worn.
    expect(statusBarMarks(behindTheBar(place, paper, BAR_NIGHT))).toBe("light");
    // The page could not be read at that place: light marks.
    expect(statusBarMarks(behindTheBar(place, paper, null))).toBe("light");
  });

  it("Android 15 and newer, an older web view: the page is set below the bar, the window's night shows, and the marks stay light", () => {
    const place = barPlace({ platform: "android", asked: paper, strip: "#000000", inset: 0 });
    expect(place).toBe("window");
    expect(behindTheBar(place, paper, paper)).toBe(BAR_NIGHT);
    expect(statusBarMarks(behindTheBar(place, paper, paper))).toBe("light");
  });

  it("an Android phone that does not say what its strip is: nothing is known, and the marks stay light", () => {
    for (const strip of [null, undefined, "", "transparent"]) {
      const place = barPlace({ platform: "android", asked: paper, strip, inset: 28 });
      expect(place, String(strip)).toBe("unknown");
      expect(statusBarMarks(behindTheBar(place, paper, paper)), String(strip)).toBe("light");
    }
  });

  it("the iPhone: there is no strip, the page lies under the bar, and the marks suit the page", () => {
    // Whatever colour an iPhone gives for a strip it does not show is not read.
    for (const strip of [undefined, null, paper, "#000000"]) {
      const place = barPlace({ platform: "ios", asked: paper, strip, inset: 47 });
      expect(place, String(strip)).toBe("page");
      expect(statusBarMarks(behindTheBar(place, paper, paper))).toBe("dark");
      expect(statusBarMarks(behindTheBar(place, paper, BAR_NIGHT))).toBe("light");
    }
    // The bar put away (a phone on its side): nothing to suit, light marks.
    expect(barPlace({ platform: "ios", asked: paper, inset: 0 })).toBe("window");
  });

  it("True black on a newer Android, where a clear strip and a black one read the same: light marks either way", () => {
    const place = barPlace({ platform: "android", asked: "#000000", strip: "#000000", inset: 28 });
    expect(statusBarMarks(behindTheBar(place, "#000000", "#000000"))).toBe("light");
  });
});

describe("what the page shows at the bar's place", () => {
  const paper: BarLayer = { color: [241, 232, 212, 1] };
  const clear: BarLayer = { color: [0, 0, 0, 0] };

  it("a page of plain paper is its paper, through every clear box above it", () => {
    expect(groundOf([clear, clear, paper])).toBe("#f1e8d4");
    expect(groundOf([{ color: null }, {}, paper])).toBe("#f1e8d4");
    expect(statusBarMarks(groundOf([clear, paper]))).toBe("dark");
  });

  it("a surface that is dark on every palette is the night, whatever it draws and whatever is under it", () => {
    // The launch frame, the tour, Now playing, the atlas: over a Light page.
    expect(groundOf([{ island: true }, paper])).toBe(BAR_NIGHT);
    expect(groundOf([clear, { island: true, opacity: 1 }, paper])).toBe(BAR_NIGHT);
    expect(statusBarMarks(groundOf([{ island: true }, paper]))).toBe("light");
    // One that has faded right out is not there.
    expect(groundOf([{ island: true, opacity: 0 }, paper])).toBe("#f1e8d4");
    // One still fading counts: light marks until it has gone.
    expect(groundOf([{ island: true, opacity: 0.3 }, paper])).toBe(BAR_NIGHT);
  });

  it("a picture has no one colour: it cannot be told", () => {
    expect(groundOf([{ picture: true }, paper])).toBeNull();
    expect(statusBarMarks(groundOf([clear, { picture: true }, paper]))).toBe("light");
  });

  it("a gradient with something dark in it cannot be told; one that is only the paper, or clear, is looked through", () => {
    expect(groundOf([{ color: [0, 0, 0, 0], gradient: [[0, 0, 0, 0.56], [0, 0, 0, 0]] }, paper])).toBeNull();
    // The reader's strip under the bar: a gradient of the page's own colour.
    expect(groundOf([{ color: [0, 0, 0, 0], gradient: [[241, 232, 212, 1], [241, 232, 212, 1]] }, paper])).toBe("#f1e8d4");
    // A breath of dark too faint to matter, and a wash of white.
    expect(groundOf([{ color: [0, 0, 0, 0], gradient: [[0, 0, 0, 0.06], [255, 255, 255, 0.4]] }, paper])).toBe("#f1e8d4");
    // The same dark stop inside a box that is itself nearly clear.
    expect(groundOf([{ color: [0, 0, 0, 0], gradient: [[0, 0, 0, 0.56]], opacity: 0.1 }, paper])).toBe("#f1e8d4");
  });

  it("a veil of colour is laid over the first solid colour beneath it", () => {
    // A sheet's scrim, black at a half, over the paper: a mid tone, darker than the paper.
    const dimmed = groundOf([{ color: [0, 0, 0, 0.5] }, paper])!;
    expect(dimmed).toBe("#79746a");
    expect(luminanceOf(dimmed)).toBeLessThan(luminanceOf("#f1e8d4"));
    // A frosted bar of the paper's own colour over the paper is the paper.
    expect(groundOf([{ color: [241, 232, 212, 0.8] }, paper])).toBe("#f1e8d4");
    // Two veils, the nearer to the eye first: black over white over paper.
    expect(groundOf([{ color: [0, 0, 0, 0.5] }, { color: [255, 255, 255, 0.5] }, paper])).toBe("#7c7a75");
    // A box's own opacity thins its colour.
    expect(groundOf([{ color: [0, 0, 0, 1], opacity: 0.5 }, paper])).toBe("#79746a");
  });

  it("nothing solid anywhere cannot be told", () => {
    expect(groundOf([])).toBeNull();
    expect(groundOf([clear, { color: [0, 0, 0, 0.5] }])).toBeNull();
  });
});

describe("the bridge and the follower", () => {
  it("the bridge starts with light marks, then hands the bar to the follower with the phone's three answers", () => {
    expect(bridge).toContain('import { followStatusBar } from "./statusBar";');
    expect(bridge).toContain("await StatusBar.setStyle({ style: Style.Dark });");
    expect(bridge).toContain("const platform = nativePlatform();");
    expect(bridge).toContain("if (!platform) return;");
    expect(bridge).toContain("stopBar = followStatusBar({");
    expect(bridge).toContain("paintStrip: (color) => StatusBar.setBackgroundColor({ color }),");
    expect(bridge).toContain("stripNow: async () => (await StatusBar.getInfo()).color ?? null,");
    // The plugin's "Dark" style draws light marks and its "Light" style dark ones: the one place that is turned round.
    expect(bridge).toContain('drawMarks: (marks) => StatusBar.setStyle({ style: marks === "dark" ? Style.Light : Style.Dark }),');
    // What is stored is never asked: a look the gate has put down, or a palette under Candlelight at Vespers, is not what is worn.
    expect(bridge).not.toMatch(/READING_THEME_KEY|coerceReadingTheme/);
    expect(follower).not.toMatch(/READING_THEME_KEY|coerceReadingTheme|localStorage/);
  });

  it("the follower reads the palette from the page, and paints again when the root's palette changes", () => {
    expect(follower).toContain('const want = statusBarColor(getComputedStyle(root).getPropertyValue("--color-night"));');
    expect(follower).toContain('worn.observe(root, { attributes: true, attributeFilter: ["data-reading-mode", "data-look", SWITCH_ATTR] });');
    expect(follower).toContain("place = barPlace({ platform: phone.platform, asked, strip, inset: inset() });");
    // An answer that comes back after a newer asking is dropped.
    expect(follower.match(/if \(stopped \|\| mine !== turn\) return;/g)).toHaveLength(2);
  });

  it("the follower asks the page only where it lies under the bar, and only on a light palette", () => {
    expect(follower).toContain('const lightWorn = () => root.getAttribute("data-reading-mode") === "parchment";');
    expect(follower).toContain('const marks = (): BarMarks => statusBarMarks(behindTheBar(place, asked, place !== "page" ? null : lightWorn() ? under() : BAR_NIGHT));');
    expect(follower).toContain('if (stopped || settle !== null || place !== "page" || !lightWorn()) return;');
    // The phone is told only when the answer changes.
    expect(follower).toContain("if (next === drawn) return;");
    // A surface that is dark on every palette is known by the house's own mark for it.
    expect(follower).toContain('if (el.closest(".dark-island")) return { island: true, opacity };');
    // One that lets taps through while it is still drawn (the launch frame as it fades) is not in the
    // browser's own stack at a point, so it is asked for by its box and put first.
    expect(follower).toContain('for (const el of document.querySelectorAll(".dark-island")) {');
    expect(follower).toContain('if (cs.pointerEvents !== "none" || cs.visibility === "hidden") continue;');
    expect(follower).toContain("return passedThrough.concat(document.elementsFromPoint(x, y).map((el): BarLayer => {");
  });

  it("the follower stops everything it started", () => {
    for (const undone of ["worn.disconnect();", "roomWatch?.disconnect();", "parts.disconnect();", 'document.removeEventListener("transitionend", lookSoon, true);', 'document.removeEventListener("animationend", lookSoon, true);', 'document.removeEventListener("visibilitychange", lookSoon);', "probe.remove();"]) {
      expect(follower, undone).toContain(undone);
    }
    expect(bridge).toContain("stopBar();");
  });
});
