// Faint text is legible on every palette (1.9, build 88 note 4).
//
// The app's grey lines are the palette's ink at 45 to 60 percent
// (text-paper/45 to /60, about 1,550 uses). On Light every one of them was
// under WCAG AA's 4.5:1, and on Candlelight, Monastery, Councils, Cappadocian
// and even Dark some fell short on a card. app/globals.css ("Faint text on
// every palette") draws each palette's short shares at the share it needs.
//
// This reads the stylesheet, as litPalette.test.ts does, and does the
// arithmetic: every palette's ink, at every faint share as the stylesheet
// finally draws it, against the page, a card and a 4 percent box, must be
// 4.5:1 or more. A new palette, or a nudge to a token or a share, that falls
// under fails here.
//
// What a reader would notice if this broke: captions, dates and counts too
// faint to read on one palette, most likely Light.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { READING_THEMES } from "@/lib/reader/readingModes";

const CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
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

function colours(mode: Mode): { night: Rgb; soft: Rgb; paper: Rgb } {
  const pick = (name: string) => {
    const own = mode === "default" ? null : token(`html[data-reading-mode="${mode}"]`, name);
    const base = token("@theme", name) ?? token(":root", name);
    const raw = own ?? base;
    if (!raw) throw new Error(`${mode}: no ${name}`);
    return hex(raw);
  };
  return { night: pick("--color-night"), soft: pick("--color-night-soft"), paper: pick("--color-paper") };
}

const SHARES = [45, 50, 55, 60] as const;

/** Every text-paper share written in app/ and components/, read from the source so a share written tomorrow is held the day it is written. */
function sharesWritten(): number[] {
  const written = new Set<number>(SHARES);
  const walk = (dir: string) => {
    for (const e of readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name !== "__tests__" && e.name !== "node_modules") walk(join(dir, e.name));
      } else if (e.name.endsWith(".tsx")) {
        for (const m of readFileSync(join(process.cwd(), dir, e.name), "utf8").matchAll(/\btext-paper\/(\d+)\b/g)) written.add(Number(m[1]));
      }
    }
  };
  walk("app");
  walk("components");
  return [...written].sort((x, y) => x - y);
}

/**
 * The share each palette finally draws text-paper/<share> at, from the stylesheet's own rules.
 * A look (1.9) is worn over Dark or over Light, so the rules of the palette
 * under it answer first and its own, which stand later in the file at the
 * same weight, answer last.
 */
function drawn(mode: Mode, share: number, look?: string): number {
  let out = share;
  const rule = /:where\(([^)]*(?:\([^)]*\)[^)]*)*)\)\s*(:is\(([^)]*)\)|\.text-paper\\\/(\d+))\s*\{\s*color:\s*([^;]+);/g;
  for (const m of BARE.matchAll(rule)) {
    const where = m[1];
    const forMode = mode === "default" ? /html:not\(\[data-reading-mode\]\)/.test(where) : where.includes(`data-reading-mode="${mode}"`);
    const forLook = look !== undefined && where.includes(`data-look="${look}"`);
    if (!forMode && !forLook) continue;
    const classes = m[3] ? [...m[3].matchAll(/\.text-paper\\\/(\d+)/g)].map((c) => Number(c[1])) : [Number(m[4])];
    if (!classes.includes(share)) continue;
    const value = m[5];
    const pct = /var\(--color-paper\)\s+(\d+(?:\.\d+)?)%/.exec(value);
    const alpha = /\/\s*(0?\.\d+)\s*\)/.exec(value);
    if (pct) out = Number(pct[1]);
    else if (alpha) out = Number(alpha[1]) * 100;
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

describe("faint text on every palette", () => {
  it("reads the seven palettes from the stylesheet", () => {
    for (const mode of MODES) {
      const c = colours(mode);
      expect(c.night.every(Number.isFinite) && c.paper.every(Number.isFinite), mode).toBe(true);
    }
    // Light is the one light palette: ink darker than the page.
    expect(lum(colours("parchment").paper)).toBeLessThan(lum(colours("parchment").night));
  });

  for (const mode of MODES) {
    it(`${mode}: every share from 45 to 60 percent is 4.5:1 or more on the page, a card and a 4 percent box`, () => {
      const { night, soft, paper } = colours(mode);
      const grounds: Record<string, Rgb> = { page: night, card: soft, box: mix(paper, night, 0.04) };
      const short: string[] = [];
      for (const share of SHARES) {
        const at = drawn(mode, share) / 100;
        for (const [where, ground] of Object.entries(grounds)) {
          const r = ratio(mix(paper, ground, at), ground);
          if (r < 4.5) short.push(`text-paper/${share} drawn at ${Math.round(at * 100)}% on the ${where}: ${r.toFixed(2)}:1`);
        }
      }
      expect(short, short.join("\n")).toEqual([]);
    });
  }

  // Every share the app writes above 40 and under 70 percent (1.9, the
  // Themes chat's sweep, section 25 of its notes). The rules above named 45,
  // 50, 55 and 60; the app also writes 42, 48, 52, 56 and 58 (about twenty
  // places), which a palette drew as written: Theology's "7 citations from
  // the Fathers", at 52, was 2.93:1 on Light, 4.10:1 on Candlelight and
  // 4.43:1 on Monastery. 40 stays out, as above (decorative or disabled marks;
  // words once there are held below).
  const WRITTEN = sharesWritten().filter((share) => share > 40 && share < 70);

  it("reads the shares the app writes above 40 and under 70 percent, the odd ones too", () => {
    for (const share of [42, 45, 48, 50, 52, 55, 56, 58, 60, 65]) expect(WRITTEN).toContain(share);
  });

  for (const mode of MODES) {
    it(`${mode}: every share the app writes above 40 and under 70 percent is 4.5:1 or more on the page, a card and a 4 percent box`, () => {
      const { night, soft, paper } = colours(mode);
      const grounds: Record<string, Rgb> = { page: night, card: soft, box: mix(paper, night, 0.04) };
      const short: string[] = [];
      for (const share of WRITTEN) {
        const at = drawn(mode, share) / 100;
        for (const [where, ground] of Object.entries(grounds)) {
          const r = ratio(mix(paper, ground, at), ground);
          if (r < 4.5) short.push(`text-paper/${share} drawn at ${Math.round(at * 100)}% on the ${where}: ${r.toFixed(2)}:1`);
        }
      }
      expect(short, short.join("\n")).toEqual([]);
    });
  }

  it("the rules sit in the utilities layer, under :where(), so a hover still wins", () => {
    const block = CSS.slice(CSS.indexOf("Faint text on every palette"));
    const layer = block.slice(block.indexOf("@layer utilities {"), block.indexOf("@layer utilities {") + 1200);
    expect(layer).toContain(':where(html[data-reading-mode="parchment"])');
    expect(layer).toContain(":where(html:not([data-reading-mode]))");
    expect(layer).not.toMatch(/!important/);
  });
});

// The looks (1.9): eighteen Plus themes, each worn as data-look over Dark or
// over Light (lib/reader/readingModes.ts, themeAttributes). Each draws its
// faint text at a share of its own, and has two grounds the seven do not: its
// cards and its bands are gradients (--surface-card, --surface-band), with a
// soft light in one corner. Faint text is held to 4.5:1 on the page, a card
// in the palette's flat colour, a 4 percent box, and the card and the band
// where they are hardest to read on: their lightest point on a dark look,
// their darkest on a light one.
const LOOKS = READING_THEMES.filter((theme) => theme.look).map((theme) => ({ id: theme.id as string, light: theme.look === "light" }));

function lookColours(id: string): { night: Rgb; soft: Rgb; deep: Rgb; paper: Rgb; card: Rgb; band: Rgb } {
  const own = (name: string) => {
    const raw = token(`html[data-look="${id}"]`, name);
    if (!raw) throw new Error(`${id}: no ${name}`);
    return raw;
  };
  const paper = hex(own("--color-paper"));
  const night = hex(own("--color-night"));
  const light = lum(paper) < lum(night);
  // A surface where it is hardest to read on: of its gradient's stops, the
  // lightest on a dark look with the corner's white over it at its fullest,
  // the darkest on a light look (where the corner's white only helps).
  const hardest = (name: string): Rgb => {
    const value = own(name);
    const stops = [...value.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => hex(m[0]));
    if (stops.length < 2) throw new Error(`${id}: ${name} is not a gradient of plain colours`);
    const stop = stops.reduce((a, b) => ((light ? lum(a) < lum(b) : lum(a) > lum(b)) ? a : b));
    if (light) return stop;
    const glow = /rgb\(255 255 255 \/ (0?\.\d+)\)/.exec(value);
    return glow ? mix([255, 255, 255], stop, Number(glow[1])) : stop;
  };
  return { night, soft: hex(own("--color-night-soft")), deep: hex(own("--color-night-deep")), paper, card: hardest("--surface-card"), band: hardest("--surface-band") };
}

describe("faint text on every look", () => {
  it("reads the eighteen looks from the registry, nine dark and nine light, each as the stylesheet draws it", () => {
    expect(LOOKS.length).toBe(18);
    expect(LOOKS.filter((look) => look.light).length).toBe(9);
    for (const look of LOOKS) {
      const c = lookColours(look.id);
      // The registry says which palette a look is worn over; its colours must agree.
      expect(lum(c.paper) < lum(c.night), look.id).toBe(look.light);
    }
  });

  // On a look every share the app writes from 40 up to 70 percent is held,
  // not only the four above: the odd ones (42, 48, 52, 56, 58, about twenty
  // uses) and the ones between 60 and 70 (62, 65, 66, 68, about 170). Light's
  // darker ink carries 68 percent (62 to 66 fell short on its cards and are
  // lifted since the Themes chat's sweep); a look's own ink, a shade lighter, was
  // measured a hair under on the export (4.37:1 to 4.45:1 on eight light
  // looks, scripts/mock-check.mjs --looks). The list is read from the source,
  // so a share written tomorrow is held the day it is written: where a look
  // cannot carry it as written, the look's rule in app/globals.css ("The
  // looks (1.9)") has to name it.
  const LOOK_SHARES = sharesWritten().filter((share) => share >= 40 && share < 70);

  it("reads the shares the app writes from 40 up to 70 percent", () => {
    for (const share of [40, 45, 50, 55, 60, 65]) expect(LOOK_SHARES).toContain(share);
    expect(LOOK_SHARES.length).toBeGreaterThanOrEqual(10);
  });

  for (const look of LOOKS) {
    it(`${look.id}: every share the app writes from 40 up to 70 percent is 4.5:1 or more on the page, a card, a 4 percent box, and its own card and band`, () => {
      const c = lookColours(look.id);
      const grounds: Record<string, Rgb> = {
        page: c.night,
        card: c.soft,
        box: mix(c.paper, c.night, 0.04),
        "look's card": c.card,
        "look's band": c.band,
        "box on the look's card": mix(c.paper, c.card, 0.04),
      };
      const short: string[] = [];
      for (const share of LOOK_SHARES) {
        const at = drawn(look.light ? "parchment" : "default", share, look.id) / 100;
        for (const [where, ground] of Object.entries(grounds)) {
          const r = ratio(mix(c.paper, ground, at), ground);
          if (r < 4.5) short.push(`text-paper/${share} drawn at ${Math.round(at * 100)}% on the ${where}: ${r.toFixed(2)}:1`);
        }
      }
      expect(short, short.join("\n")).toEqual([]);
    });
  }

  it("a light look's ink holds 4.5:1 at 70 percent, the share Light's own rules draw its quiet lines at", () => {
    // Light writes some of its quiet text at 70 percent of the ink in rules of
    // its own (text-paper/70 is drawn as it is). A light look takes those
    // rules unchanged, so its ink has to be dark enough for them.
    const short: string[] = [];
    for (const look of LOOKS.filter((l) => l.light)) {
      const c = lookColours(look.id);
      for (const [where, ground] of Object.entries({ page: c.night, card: c.soft, box: mix(c.paper, c.night, 0.04), "look's card": c.card, "look's band": c.band })) {
        const r = ratio(mix(c.paper, ground, 0.7), ground);
        if (r < 4.5) short.push(`${look.id}: 70% on the ${where}: ${r.toFixed(2)}:1`);
      }
    }
    expect(short, short.join("\n")).toEqual([]);
  });

  it("each look's rule sits in the utilities layer, under :where(), after Dark's and Light's", () => {
    const base = Math.max(BARE.lastIndexOf(':where(html[data-reading-mode="parchment"]) :is(.text-paper'), BARE.lastIndexOf(":where(html:not([data-reading-mode])) :is(.text-paper"));
    expect(base).toBeGreaterThan(0);
    for (const look of LOOKS) {
      const at = BARE.indexOf(`:where(html[data-look="${look.id}"]) :is(.text-paper`);
      expect(at, look.id).toBeGreaterThan(base);
      expect(BARE.lastIndexOf("@layer utilities {", at), look.id).toBeGreaterThan(BARE.lastIndexOf("@layer base {", at));
    }
  });
});

// Light's accent and a light look's (1.9). Light's own accent is a graphite,
// dark enough to be written at 85 percent and hold 4.5:1, but not at the 65
// to 80 the app writes for words (3.0:1 to 4.2:1, the Themes chat's sweep). A look's accent is a colour
// (the wine of Roses, the green of Olive), and the app writes accent words
// at shares from 65 to 90 percent (text-gold/NN, text-gold-pale/NN). A look
// draws the shares under 85 at 85, by one rule for every light look, so an
// accent word is 4.5:1 or more on the page, a card and a 4 percent box on
// each. The fainter shares are ornaments (a dot between two links, a rule's
// diamond), each hidden from a screen reader: held here to stay so, since a
// word written at one of them would be too faint to read on a light look.
describe("a light look's accent, at the shares the app writes for words", () => {
  const sources = (dir: string): string[] =>
    readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? (e.name === "__tests__" || e.name === "node_modules" ? [] : sources(join(dir, e.name))) : e.name.endsWith(".tsx") ? [join(dir, e.name)] : [],
    );
  const FILES = [...sources("app"), ...sources("components")];
  type Use = { file: string; token: "gold" | "gold-pale"; share: number; before: string };
  const USES: Use[] = FILES.flatMap((file) => {
    const src = readFileSync(join(process.cwd(), file), "utf8");
    return [...src.matchAll(/\btext-(gold-pale|gold)\/(\d+)\b/g)].map((m) => ({ file, token: m[1] as Use["token"], share: Number(m[2]), before: src.slice(Math.max(0, m.index - 220), m.index) }));
  });
  const rule = (token: string) => {
    const m = new RegExp(`:where\\(html\\[data-reading-mode="parchment"\\]\\) (?::is\\(([^)]*)\\)|(\\.text-${token}\\\\\\/\\d+)) \\{\\s*color: color-mix\\(in oklab, var\\(--color-${token}\\) (\\d+)%, transparent\\);`).exec(BARE);
    if (!m) throw new Error(`no rule for a light look's text-${token} shares`);
    const lifted = [...(m[1] ?? m[2]).matchAll(new RegExp(`\\.text-${token}\\\\\\/(\\d+)`, "g"))].map((c) => Number(c[1]));
    return { lifted, to: Number(m[3]) };
  };
  const GOLD = rule("gold");
  const PALE = rule("gold-pale");
  const WORDS_FROM = 65;

  it("the app writes accent words at shares the rules know, and anything fainter is an ornament hidden from a screen reader", () => {
    expect(USES.length).toBeGreaterThan(40);
    const faint = USES.filter((use) => use.share < WORDS_FROM);
    expect(faint.length).toBeGreaterThan(0);
    for (const use of faint) expect(use.before, `${use.file}: text-${use.token}/${use.share} is on something a reader reads`).toMatch(/aria-hidden/);
    // Every share written for words is either lifted by the rule or already at or over what the rule lifts to.
    for (const use of USES.filter((u) => u.share >= WORDS_FROM)) {
      const { lifted, to } = use.token === "gold" ? GOLD : PALE;
      expect(lifted.includes(use.share) || use.share >= to, `${use.file}: text-${use.token}/${use.share} is neither lifted nor at ${to} percent`).toBe(true);
    }
  });

  // Light itself first (1.9, the Themes chat's sweep): its graphite accent at
  // 65 to 80 percent was 3.0:1 to 4.2:1 on its page, so the rule is Light's too.
  const LIGHT = { id: "light (the palette)", colours: () => ({ ...colours("parchment") }), ink: (name: string) => hex(token('html[data-reading-mode="parchment"]', name) ?? "") };
  const SUBJECTS = [
    LIGHT,
    ...LOOKS.filter((l) => l.light).map((look) => ({ id: look.id, colours: () => lookColours(look.id), ink: (name: string) => hex(token(`html[data-look="${look.id}"]`, name) ?? "") })),
  ];
  for (const subject of SUBJECTS) {
    it(`${subject.id}: an accent word is 4.5:1 or more on the page, a card and a 4 percent box`, () => {
      const c = subject.colours();
      const inks = { gold: subject.ink("--color-gold"), "gold-pale": subject.ink("--color-gold-pale") };
      const grounds: Record<string, Rgb> = { page: c.night, card: c.soft, box: mix(c.paper, c.night, 0.04), "box on a card": mix(c.paper, c.soft, 0.04) };
      const short: string[] = [];
      for (const [name, set] of [["gold", GOLD], ["gold-pale", PALE]] as const) {
        const shares = new Set(USES.filter((u) => u.token === name && u.share >= WORDS_FROM).map((u) => u.share));
        for (const share of shares) {
          const at = (set.lifted.includes(share) ? set.to : share) / 100;
          for (const [where, ground] of Object.entries(grounds)) {
            const r = ratio(mix(inks[name], ground, at), ground);
            if (r < 4.5) short.push(`text-${name}/${share} drawn at ${Math.round(at * 100)}% on the ${where}: ${r.toFixed(2)}:1`);
          }
        }
      }
      expect(short, short.join("\n")).toEqual([]);
    });
  }

  it("the rule is Light's and every light look's, under :where() in the utilities layer", () => {
    const at = BARE.indexOf(':where(html[data-reading-mode="parchment"]) :is(.text-gold');
    expect(at).toBeGreaterThan(0);
    expect(BARE.lastIndexOf("@layer utilities {", at)).toBeGreaterThan(BARE.lastIndexOf("@layer base {", at));
    // Not the looks' alone any more: no copy of it narrowed to [data-look].
    expect(BARE).not.toMatch(/:where\(html\[data-look\]\[data-reading-mode="parchment"\]\) [^{]*\.text-gold/);
  });
});

// Two lines of words were left at 40 percent, under the shares above, as
// though decorative: the week's day letters under the streak (the prayer rope,
// on Today, on You and on the evening card) and the Bible's name after the
// Verse of the Day's reference (", King James Version"). The Themes chat
// measured them on 2026-11-10 at 3.8:1 on Dark and True black, 2.3:1 on
// Light, 2.9:1 on Candlelight and 3.3:1 on Monastery. They are words a reader
// reads, so they wear the faintest share the rules above hold to 4.5:1.
describe("words once drawn at 40 percent", () => {
  for (const file of ["components/streak/PrayerRope.tsx", "components/today/VerseOfDayView.tsx"]) {
    it(`${file}: every text share is one the rules hold`, () => {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      const shares = [...src.matchAll(/\btext-paper\/(\d+)\b/g)].map((m) => Number(m[1]));
      expect(shares.length, file).toBeGreaterThan(0);
      const under = shares.filter((share) => share < SHARES[0]);
      expect(under, `${file}: text-paper/${under.join(", /")} is under the faintest share held to 4.5:1`).toEqual([]);
    });
  }
});

// The theology tray (app/globals.css, .theology-tray) stands a little above a
// 4 percent box: a gradient from the ink at 5 percent over the page, at its
// top, to 2 at its foot. Its rows' kind lines (Theology's four ways as rows
// and the Creed's row, components/theology/TheologyLibrary.tsx) were
// text-paper/52, outside the shares above: 3.07:1 on Light and 4.24:1 on
// Candlelight, as the Theology chat measured on 2026-11-10. They wear /55,
// which each palette draws at a share that holds 4.5:1 on the tray's top.
describe("the theology tray's rows", () => {
  it("draw their kind lines at a share that holds 4.5:1 on the tray's lightest ground, on every palette", () => {
    expect(CSS).toMatch(/\.theology-tray \{[^}]*color-mix\(in srgb, var\(--color-paper\) 5%, var\(--color-night\)\) 0%/);
    const src = readFileSync(join(process.cwd(), "components/theology/TheologyLibrary.tsx"), "utf8");
    const lines = [...src.matchAll(/mt-0\.5 block truncate font-sans text-caption text-paper\/(\d+)/g)].map((m) => Number(m[1]));
    expect(lines).toHaveLength(2);
    const short: string[] = [];
    for (const share of lines) {
      for (const mode of MODES) {
        const { night, paper } = colours(mode);
        const tray = mix(paper, night, 0.05);
        const r = ratio(mix(paper, tray, drawn(mode, share) / 100), tray);
        if (r < 4.5) short.push(`${mode}: text-paper/${share} at ${r.toFixed(2)}:1`);
      }
    }
    expect(short, short.join("\n")).toEqual([]);
  });
});

// Settings' quiet words (build 89's guardrail list of 2026-11-10): the hint
// under a section's title, the line under a row's name, what a chosen answer
// means, and a track's unchosen choices. Each is held to 4.5:1 on its own
// ground on every palette: the hint on the page, the track's choices on the
// track (night-deep), the row's lines on the panel where it is lightest (on
// Light, the panel's own cream at its darkest stop).
describe("Settings' quiet words", () => {
  const share = (re: RegExp, what: string): number => {
    const m = re.exec(BARE);
    if (!m) throw new Error(`no rule for ${what}`);
    return Number(m[1]);
  };
  const ink = (selector: string) => new RegExp(`(?:^|\\})\\s*${selector} \\{[^}]*?color: color-mix\\(in srgb, var\\(--color-paper\\) (\\d+)%`);
  const BASE = {
    hint: share(ink("\\.set-hint"), ".set-hint"),
    desc: share(ink("\\.set-desc"), ".set-desc"),
    sub: share(ink("\\.set-sub"), ".set-sub"),
    track: share(ink("\\.set-track > button"), ".set-track > button"),
  };
  const quiet = (mode: string) =>
    new RegExp(`html\\[data-reading-mode="${mode}"\\] :is\\(\\.set-hint, \\.set-desc, \\.set-sub, \\.set-track > button\\[aria-checked="false"\\]:not\\(:hover\\)\\) \\{\\s*color: color-mix\\(in srgb, var\\(--color-paper\\) (\\d+)%`);
  const OWN: Partial<Record<Mode, number>> = { parchment: share(quiet("parchment"), "Light"), candlelight: share(quiet("candlelight"), "Candlelight") };
  const TRIO = share(/:where\(html\[data-reading-mode="monastery"\], html\[data-reading-mode="councils"\], html\[data-reading-mode="cappadocian"\]\) \.set-desc \{\s*color: color-mix\(in srgb, var\(--color-paper\) (\d+)%/, "the trio's .set-desc");
  const lightPanel = hex(/html\[data-reading-mode="parchment"\] \.set-panel \{[^}]*linear-gradient\([^;]*?(#[0-9a-f]{6}) 100%\)/.exec(BARE)?.[1] ?? "");
  const deep = (mode: Mode) => hex((mode === "default" ? null : token(`html[data-reading-mode="${mode}"]`, "--color-night-deep")) ?? token("@theme", "--color-night-deep") ?? token(":root", "--color-night-deep") ?? "");

  for (const mode of MODES) {
    it(`${mode}: every quiet line holds 4.5:1 on its own ground`, () => {
      const { night, soft, paper } = colours(mode);
      const panel = mode === "parchment" ? lightPanel : mix([255, 255, 255], mix(paper, soft, 0.04), 0.065);
      const own = OWN[mode];
      const trio = mode === "monastery" || mode === "councils" || mode === "cappadocian";
      const lines: [string, number, Rgb][] = [
        ["the section's hint", own ?? BASE.hint, night],
        ["a row's line", own ?? (trio ? TRIO : BASE.desc), panel],
        ["what a chosen answer means", own ?? BASE.sub, panel],
        ["a track's unchosen choice", own ?? BASE.track, deep(mode)],
      ];
      const short = lines
        .map(([what, at, ground]) => ({ what, at, r: ratio(mix(paper, ground, at / 100), ground) }))
        .filter((l) => l.r < 4.5)
        .map((l) => `${l.what} at ${l.at}%: ${l.r.toFixed(2)}:1`);
      expect(short, short.join("\n")).toEqual([]);
    });
  }

  // The looks (1.9). A dark look draws all four lines at one share of its
  // own (--look-quiet), as Candlelight does; a light look takes Light's rule
  // unchanged. A dark look's panel is the app's own; a light look's is its
  // own paper, a gradient that ends on its page colour, where it is darkest.
  it("a dark look draws them at its own share, by one rule that reads it", () => {
    expect(BARE).toMatch(/html\[data-look\]:not\(\[data-reading-mode\]\) :is\(\.set-hint, \.set-desc, \.set-sub, \.set-track > button\[aria-checked="false"\]:not\(:hover\)\) \{\s*color: color-mix\(in srgb, var\(--color-paper\) var\(--look-quiet\), transparent\);/);
    expect(BARE).toMatch(/html\[data-look\]\[data-reading-mode="parchment"\] \.set-panel \{[^}]*linear-gradient\(155deg, var\(--look-paper-high\) 0%, [^;]*var\(--color-night\) 100%\)/);
  });

  for (const look of LOOKS) {
    it(`${look.id}: every quiet line holds 4.5:1 on its own ground`, () => {
      const c = lookColours(look.id);
      const own = look.light ? OWN.parchment : Number(/^(\d+)%$/.exec(token(`html[data-look="${look.id}"]`, "--look-quiet") ?? "")?.[1]);
      expect(Number.isFinite(own), `${look.id}: no share for its quiet words`).toBe(true);
      const at = own as number;
      const panel = look.light ? c.night : mix([255, 255, 255], mix(c.paper, c.soft, 0.04), 0.065);
      const lines: [string, Rgb][] = [
        ["the section's hint", c.night],
        ["a row's line", panel],
        ["what a chosen answer means", panel],
        ["a track's unchosen choice", c.deep],
      ];
      const short = lines
        .map(([what, ground]) => ({ what, r: ratio(mix(c.paper, ground, at / 100), ground) }))
        .filter((l) => l.r < 4.5)
        .map((l) => `${l.what} at ${at}%: ${l.r.toFixed(2)}:1`);
      expect(short, short.join("\n")).toEqual([]);
    });
  }
});
