import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Words on a picture (1.9, the Themes chat's sweep: docs/1.9-build/notes/
 * themes-fable.md, section 25). A picture has no one colour, so these words
 * were measured by the pixels behind them, on all five palettes, with
 * scripts/words-on-pictures.mjs: Prayers' verse ("Pray without ceasing."
 * at 1.93:1 on Light), You's lines ("Private on this device" at 1.40:1 to
 * 2.38:1 on all five), Discover's card lines (3.07:1 to 4.49:1), the line
 * under the reading room's poster on Light (3.63:1) and the Plus pill over
 * the Pantocrator (3.07:1 on Candlelight). What mended each is held here: a
 * soft edge of the page's own ground at the letters (.words-halo), each
 * line's ink at the share it was measured at, the poster's warm shade on
 * Light and the plate under the pill. To change one, measure it again.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const bare = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");
const CSS = bare(read("app/globals.css"));

/** The body of the one rule whose selector is exactly this. */
function rule(css: string, selector: string): string {
  const found = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].trim() === selector);
  expect(found, `one rule for ${selector}`).toHaveLength(1);
  return found[0][2];
}
/** A palette's own colour, as rgb channels. */
function own(selector: string, name: string): string {
  const at = CSS.indexOf(`\n${selector} {`);
  const body = CSS.slice(at, CSS.indexOf("}", at));
  const hex = new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i").exec(body)?.[1] ?? "";
  expect(hex, `${selector} ${name}`).toMatch(/^#[0-9a-f]{6}$/i);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");
}

describe("the house's halo for words on a picture", () => {
  /** A shadow's layers: its commas outside any brackets. */
  const layers = (value: string) => {
    const out = [""];
    let depth = 0;
    for (const ch of value) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) out.push("");
      else out[out.length - 1] += ch;
    }
    return out.map((layer) => layer.trim());
  };

  it("is an edge of the page's own ground at the letters: no offset, no black, inside the line's own leading", () => {
    const body = rule(CSS, ".words-halo");
    const values = [...body.matchAll(/text-shadow:\s*([^;]+);/g)].map((m) => m[1].replace(/\s+/g, " ").trim());
    expect(values).toHaveLength(2);
    const [plain, mixed] = values;
    for (const value of values) {
      const each = layers(value);
      expect(each, value).toHaveLength(3);
      // Centred on the letters, never thrown one way as a drop shadow is.
      for (const layer of each) expect(layer, layer).toMatch(/^0 0 \d+px /);
      const blurs = each.map((layer) => Number(/^0 0 (\d+)px/.exec(layer)?.[1]));
      // A clamped or truncated line hides what overflows its box, and cut a
      // wider halo there into a dark rectangle (Discover's card lines).
      expect(Math.max(...blurs), "it stays inside a line's own leading").toBeLessThanOrEqual(6);
      expect(value).not.toMatch(/rgb\(0 0 0|rgba\(0, ?0, ?0|#000\b/);
    }
    // The ground on every palette, and Dark's own first for a WebView without color-mix.
    for (const layer of layers(mixed)) expect(layer).toMatch(/color-mix\(in srgb, var\(--color-night\) \d+%, transparent\)$/);
    expect(plain).toContain(`rgb(${own("@theme", "--color-night")} / `);
  });

  it("is paper under the ink on Light, an old WebView's too", () => {
    const body = rule(CSS, 'html[data-reading-mode="parchment"] .words-halo');
    const [plain, mixed] = [...body.matchAll(/text-shadow:\s*([^;]+);/g)].map((m) => m[1].replace(/\s+/g, " ").trim());
    expect(plain).toContain(`rgb(${own('html[data-reading-mode="parchment"]', "--color-night")} / `);
    for (const layer of layers(mixed)) expect(layer).toMatch(/var\(--color-night\)/);
  });
});

describe("the words that wear it, at the ink they were measured at", () => {
  // In the order each file writes them; a share of 100 is the ink itself.
  const WORN = [
    { file: "components/mobile/PrayersHero.tsx", what: ["the verse", "its citation"], at: [100, 85] },
    // The line under the name went from 90 to the ink itself on 2026-11-11: "Optional", the word it holds
    // signed out since the sign-in lines were rewritten, measured 4.40:1 on Candlelight at 90 and 4.99:1 at 100.
    { file: "components/you/YouIdentity.tsx", what: ["the name", "the line under it", "where things are kept"], at: [100, 100, 100] },
    { file: "components/ui/GalleryBand.tsx", what: ["a card's line"], at: [80] },
    // A council's shelf in the reading room: its ordinal and year, and its books and time, over the
    // council's icon and the light from above it: 3.07 to 3.92:1 at 70 and 55, and at 90 and 80 still 4.14
    // and 4.31 under the brightest of the seven icons (the final run, 2026-11-12).
    { file: "components/councils/CouncilShelf.tsx", what: ["the council's ordinal and year", "its books and time"], at: [100, 90] },
  ];

  for (const { file, what, at } of WORN) {
    it(`${file}: ${what.join(", ")}`, () => {
      const classes = [...read(file).matchAll(/"([^"]*\bwords-halo\b[^"]*)"/g)].map((m) => m[1]);
      expect(classes, "each line that stands on the picture").toHaveLength(at.length);
      classes.forEach((cls, i) => {
        const share = /(?:^|\s)text-paper(?:\/(\d+))?(?:\s|$)/.exec(cls);
        expect(share, `${what[i]}: its ink`).not.toBeNull();
        const got = share?.[1] ? Number(share[1]) : 100;
        expect(got, `${what[i]}: measured at ${at[i]} percent of the ink`).toBeGreaterThanOrEqual(at[i]);
      });
    });
  }

  it("leaves no older shadow of its own on You's words", () => {
    expect(CSS).not.toContain(".you-hero-ink");
  });
});

describe("the reading room's poster", () => {
  const ROOM = bare(read("components/reading/room.module.css"));

  it("throws a warm shade on Light, softer, and keeps its deep one on the dark", () => {
    expect(read("components/reading/FeaturedWork.tsx")).toContain('className={cn("w-[200px] md:w-[220px]", styles.posterShadow)}');
    expect(rule(ROOM, ".posterShadow")).toMatch(/box-shadow: 0 32px 70px -26px rgb\(0 0 0 \/ 0\.9\);/);
    const light = rule(ROOM, 'html[data-reading-mode="parchment"] .posterShadow');
    expect(light).toMatch(/box-shadow: [^;]*rgb\(70 52 20 \/ 0\.\d+\);/);
    expect(light).not.toMatch(/rgb\(0 0 0/);
  });
});

describe("the Plus pill where the bar stands over a picture", () => {
  it("lays its silver over the same plate as the bar's round buttons, over both pictures", () => {
    const plates = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) =>
      m[1].includes("html:has(.prayers-hero):not([data-bar-solid]) [data-tab-actions] > button"),
    );
    expect(plates, "the plates' rule").toBeDefined();
    const selectors = (plates?.[1] ?? "").split(",").map((s) => s.trim());
    for (const hero of [".you-hero", ".prayers-hero"]) {
      expect(selectors).toContain(`html:has(${hero}):not([data-bar-solid]) [data-tab-actions] .premium-pill`);
    }
    expect(plates?.[2]).toMatch(/background-color: rgb\(16 16 19 \/ 0\.55\);\s*background-color: color-mix\(in srgb, var\(--color-night\) 55%, transparent\);/);
  });
});

describe("the pixel walk", () => {
  const tool = read("scripts/words-on-pictures.mjs");

  it("measures every place this file holds", () => {
    for (const place of ["prayers", "you", "discover", "reading", '"pill-prayers"', '"pill-you"']) {
      expect(tool, place).toMatch(new RegExp(`\\n  ${place}: \\{ to: "/`));
    }
  });

  // From 1.9 the mock checker calls this measure for every word with a picture behind it, so the gate's
  // guardrail walk stands on it. Three things it read that no reader sees, each found on the export
  // (docs/1.9-build/notes/themes-fable.md, section 67): on the councils' page three bands' lines read 1.00:1
  // on every palette, because the scroll that brings a word to the middle of the screen had scrolled the
  // clamped box the line stands in.
  it("puts back every box that clips its words after it has brought a word to the middle of the screen", () => {
    // Remembered before the scroll, each box that hides what spills from it, by the side it hides.
    expect(tool).toMatch(/if \(\/hidden\|clip\/\.test\(cs\.overflowY\) \|\| \/hidden\|clip\/\.test\(cs\.overflowX\)\) held\.push\(\[n, n\.scrollTop, n\.scrollLeft, /);
    // The scroll, to the middle both ways (a sideways shelf fades at its edge), then each box as it was.
    expect(tool).toMatch(/node\.scrollIntoView\(\{ block: "center", inline: "center", behavior: "instant" \}\);\s*for \(const \[n, top, left, y, x\] of held\) \{\s*if \(y\) n\.scrollTop = top;\s*if \(x\) n\.scrollLeft = left;/);
    // Never the bare scroll again: it is what read a clamped line's hidden lines.
    expect(tool).not.toMatch(/el\.evaluate\(\(node\) => node\.scrollIntoView\(/);
  });

  it("cuts each line to every box around it that clips, not only to the words' own", () => {
    expect(tool).toMatch(/for \(let n = node\.parentElement; n && n !== document\.documentElement; n = n\.parentElement\) \{\s*const ps = getComputedStyle\(n\);\s*const b = n\.getBoundingClientRect\(\);\s*if \(ps\.overflowX !== "visible"\) \{/);
    expect(tool).toMatch(/const top = Math\.max\(r\.top, seen\.top\);\s*const right = Math\.min\(r\.right, seen\.right\);\s*const bottom = Math\.min\(r\.bottom, seen\.bottom\);/);
  });

  it("gives no ratio to a word with no letters on the screen, or on a ground that will not hold still", () => {
    // The same photograph twice, a moment apart, before it is trusted.
    expect(tool).toMatch(/still = moved <= Math\.max\(2, n \* 0\.002\);\s*if \(still\) break;/);
    // How many pixels changed when the words' fill was hidden: none is a word that is not drawn.
    expect(tool).toContain("if (diff > 6) drawn += 1;");
    expect(tool).toContain("if (worst && (every || (drawn >= 6 && still))) out.push({ palette, at: i, text: info.text,");
    // The checker's pass leaves such a word to the eye by getting no line for it: it does not ask for every one.
    expect(read("scripts/mock-check.mjs")).toMatch(/await wordsOnPicture\(page, "\[data-mock-look\]", \{ palettes: \[\[palette, mode\]\] \}\)/);
  });

  it("walks every screen for the words the checker hands over, and honours what the checker allows by name", () => {
    expect(tool).toContain('process.argv.includes("--said")');
    expect(tool).toContain(`const by = el.closest('[data-mock-allow~="contrast"]');`);
    // On the gate's walk's own phone: the Android shell where the gate asks for a reader with no Plus.
    expect(tool).toContain("if (SELLS_PLUS) await asAndroidShell(ctx);");
    // The main web is read, never written.
    expect(tool).toContain('if (req.method() !== "GET") return route.abort();');
  });
});
