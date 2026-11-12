import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SHORT_CARD_H, cardNameSize } from "@/components/saints/web/WebCard";
import { emWidth } from "@/lib/reading/coverText";
import { READING_THEMES, themeAttributes } from "@/lib/reader/readingModes";
import { saintWeb, webSlugs } from "@/lib/saints/web";
import {
  BOX,
  BOX_LINES,
  CENTER_BOX,
  LABEL_SHARE,
  MIDDLE_SHARE,
  NAME_LINE,
  NARROWEST,
  SOFT,
  WORD_FIT,
  linesOf,
  middleLines,
  nameLines,
  nameRuns,
  webLayout,
  type WebNode,
} from "@/lib/saints/webLayout";

/**
 * The gate's confirm run (Admin, 2026-11-12, 05:40 to 09:27 UTC, export
 * 872724aa3) and Admin's sweep of the pages the walks never reach: the fails
 * that fell to Updates 2 (the arbiter's 09:31 UTC), each held here so the next
 * edit cannot put it back before a walk is run. Each case fails on the code
 * that run walked.
 */

const ROOT = process.cwd();
const CSS = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

type Rgb = [number, number, number];
/** A palette's or a look's own token, as its block in globals.css writes it. */
function token(selector: string, name: string): Rgb | null {
  for (const m of CSS.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if ((m[1].split(";").pop() ?? "").trim() !== selector) continue;
    const hex = new RegExp(`--color-${name}\\s*:\\s*#([0-9a-f]{6})\\b`, "i").exec(m[2])?.[1];
    if (hex) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
  }
  return null;
}
const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/** Words at `share` of the ink over a ground, as the pixel walk measures them. */
function onGround(ink: Rgb, share: number, ground: Rgb): number {
  const shown = ink.map((v, i) => v * share + ground[i] * (1 - share)) as Rgb;
  const [a, b] = [lum(shown), lum(ground)].sort((p, q) => q - p);
  return (a + 0.05) / (b + 0.05);
}

const LIGHT = 'html[data-reading-mode="parchment"]';
/** Light and the ten looks worn over it, each with its own ink and ground where it sets them. */
const LIGHT_PALETTES: [string, string][] = [
  ["Light", LIGHT],
  ...["desert", "jordan", "patmos", "blush", "rose", "lavender", "olive", "stone", "linen"].map((look): [string, string] => [look, `html[data-look="${look}"]`]),
];

describe("a chant's words switch (fail 9, Psalm 117)", () => {
  it("draws the parts not chosen 4.5:1 or more on Light and on every light look", () => {
    // The base share (55), and the share the light palettes give the parts not chosen, if any.
    const base = Number(/\.words-view > button \{[^}]*color: color-mix\(in srgb, var\(--color-paper\) (\d+)%/.exec(CSS)?.[1]);
    const lifted = /html\[data-reading-mode="parchment"\] \.words-view > button\[aria-checked="false"\] \{\s*color: color-mix\(in srgb, var\(--color-paper\) (\d+)%/.exec(CSS)?.[1];
    expect(base).toBe(55);
    const share = Number(lifted ?? base) / 100;
    for (const [name, selector] of LIGHT_PALETTES) {
      const paper = token(selector, "paper") ?? token(LIGHT, "paper");
      const ground = token(selector, "night") ?? token(LIGHT, "night");
      expect(paper && ground, name).toBeTruthy();
      // The switch stands on the page's own ground: this sum read 3.40:1 on Light at 55, as the walk did (3.39).
      expect(onGround(paper!, share, ground!), `${name}, at ${share * 100} percent`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("the saints' webs (fail 4, the 118 webs)", () => {
  type Rect = { left: number; right: number; top: number; bottom: number };
  const overlap = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const webs = webSlugs().map((slug) => saintWeb(slug)!);
  const nameOf = (n: WebNode) => (n.kind === "saint" ? n.person.short : n.name);

  it("give every name the lines it takes, and keep every box clear of every other", () => {
    // 43 webs cut a long name at its second line ("Holy Apostle and Evangelist John", "Eustratius, Auxentius,
    // Eugene, Mardarius and Orestes"); the box held two. Each box now holds the lines its name takes on the
    // narrowest phone, the middle saint's name in its share of the web, and nothing meets.
    expect(webs.length).toBe(118);
    let long = 0;
    for (const web of webs) {
      const lines = web.nodes.map((n) => nameLines(nameOf(n)));
      long += lines.filter((l) => l > BOX_LINES).length;
      const layout = webLayout(web.nodes.length, { names: lines, middle: middleLines(web.center.short) });
      const middle: Rect[] = [
        { ...CENTER_BOX[0], top: layout.center.y + CENTER_BOX[0].top, bottom: layout.center.y + CENTER_BOX[0].bottom },
        { ...CENTER_BOX[1], top: layout.center.y + CENTER_BOX[1].top, bottom: layout.center.y + layout.middleDown },
      ];
      const boxes: Rect[] = layout.places.map((p, i) => ({ left: p.x - BOX.half, right: p.x + BOX.half, top: p.y - BOX.up, bottom: p.y + BOX.down + Math.max(0, lines[i] - BOX_LINES) * NAME_LINE }));
      for (const [i, b] of boxes.entries()) {
        expect(b.top, `${web.center.slug} #${i}`).toBeGreaterThanOrEqual(0);
        expect(b.bottom, `${web.center.slug} #${i}`).toBeLessThanOrEqual(layout.height);
        for (const m of middle) expect(overlap(b, m), `${web.center.slug}: ${nameOf(web.nodes[i])} on the middle saint`).toBe(false);
        for (let j = i + 1; j < boxes.length; j++) expect(overlap(b, boxes[j]), `${web.center.slug}: ${nameOf(web.nodes[i])} and ${nameOf(web.nodes[j])}`).toBe(false);
      }
    }
    expect(long).toBeGreaterThan(20);
  });

  it("draw the names unclamped, and the middle saint's name in its share of the web", () => {
    const web = fs.readFileSync(path.join(ROOT, "components/saints/web/WebConstellation.tsx"), "utf8");
    expect(web).not.toContain("line-clamp-2");
    expect(web).not.toContain("w-[180px]");
    expect(web.match(/w-\[46\.15%\]/g)?.length).toBe(3);
    expect(Math.round(MIDDLE_SHARE * 10000) / 100).toBe(46.15);
    expect(web).toContain("webLayout(nodes.length, { names: nodes.map((n) => nameLines(n.kind === \"saint\" ? n.person.short : n.name)), middle: middleLines(center.short) })");
  });

  it("break a word too wide for a saint's label on the narrowest phone at its syllable, and keep it whole wherever it fits", () => {
    // At 320 a label is 71px and "Constantinople" 85.5 at the name's 11.5px: unclamped, it ran past its label
    // into the middle saint's name on nine webs (export d1b3255d5: St Agatho's, St Maximus's and seven more).
    const label = NARROWEST * LABEL_SHARE;
    const wide = new Set<string>();
    for (const web of webs) {
      for (const n of web.nodes) {
        const name = nameOf(n);
        const runs = nameRuns(name);
        expect(runs.map((r) => r.text).join("").replaceAll(SOFT, ""), name).toBe(name);
        // A word, or the part of one before or after its hyphen, where the browser may break ("Trophy-bearer").
        for (const word of name.split(/\s+/).flatMap((w) => w.split(/(?<=-)/))) {
          if (emWidth(word, "sans") * 11.5 <= label * WORD_FIT) continue;
          wide.add(word);
          const run = runs.find((r) => r.wide && r.text.replaceAll(SOFT, "") === word);
          expect(run, `${web.center.slug}: "${word}" in ${name} has no break`).toBeDefined();
          const pieces = run!.text.split(SOFT);
          expect(pieces.length, word).toBe(2);
          // Each piece fits the label, the first with the hyphen the break draws.
          for (const [i, piece] of pieces.entries()) expect(emWidth(i === 0 ? `${piece}-` : piece, "sans") * 11.5, piece).toBeLessThanOrEqual(label * WORD_FIT);
        }
      }
      // The middle saint's words stand whole in his share of the web, and a card's name in its face.
      const words = (text: string) => text.split(/\s+/).flatMap((w) => w.split(/(?<=-)/));
      for (const word of words(web.center.short)) expect(emWidth(word, "serif") * 16, word).toBeLessThanOrEqual(NARROWEST * MIDDLE_SHARE * WORD_FIT);
      for (const n of web.nodes) {
        const name = n.kind === "saint" ? n.person.name : n.name;
        for (const word of words(name)) expect(emWidth(word, "serif") * cardNameSize(name), word).toBeLessThanOrEqual(165 * WORD_FIT);
      }
    }
    expect([...wide].sort()).toEqual(["Amphilochius", "Bartholomew", "Chrysogonus", "Constantinople", "Velichkovsky", "Wonderworker"]);
    // Drawn as a block of its own (WebName), on the web and in the copies that glide when the web changes.
    const web = fs.readFileSync(path.join(ROOT, "components/saints/web/WebConstellation.tsx"), "utf8");
    expect(web).toContain('run.wide ? <span key={i} className="inline-block">{run.text}</span> : run.text');
    expect(web.match(/<WebName name=\{/g)?.length).toBe(3);
    // Its lines are counted as drawn: "Second Council of Constantinople" takes four at 320.
    expect(nameLines("Second Council of Constantinople")).toBe(4);
    expect(nameLines("Amphilochius of Iconium")).toBe(3);
  });

  it("name every kind on the key whole, the track swiping where the parts do not fit", () => {
    const key = fs.readFileSync(path.join(ROOT, "components/saints/web/WebKey.tsx"), "utf8");
    expect(key).not.toContain("truncate");
    expect(key).toContain("overflow-x-auto");
    expect(key).toContain("flex-[1_0_auto]");
  });

  it("show the card's name whole in its short face, for every saint on every web", () => {
    const card = fs.readFileSync(path.join(ROOT, "components/saints/web/WebCard.tsx"), "utf8");
    expect(card).toContain('style={{ fontSize: cardNameSize(name) }}');
    expect(card).not.toMatch(/truncate[^"]*text-\[16\.5px\]/);
    for (const web of webs) {
      for (const n of web.nodes) {
        const name = n.kind === "saint" ? n.person.name : n.name;
        const size = cardNameSize(name);
        const lines = linesOf(name, 165, size, "serif");
        // The face: its top padding, the name's lines at 1.25, the 5px gap and the line under it.
        expect(4 + lines * size * 1.25 + 5 + 16, `${web.center.slug}: ${name} at ${size}px, ${lines} lines`).toBeLessThanOrEqual(SHORT_CARD_H);
      }
    }
  });

  it("stand the card and its handle over a look's foot, its line read over the brightest icon", () => {
    const card = fs.readFileSync(path.join(ROOT, "components/saints/web/WebCard.tsx"), "utf8");
    // The foot is body::after at 35 (globals.css); the card and the handle were at 20, under it.
    expect(CSS).toMatch(/body::after \{[^}]*z-index: 35;/);
    expect(card).toContain("saint-web-sheet saint-web-card fixed inset-x-3 z-40");
    expect(card).toContain("saint-web-handle saint-web-pull fixed left-1/2 z-40");
    expect(card).toContain("text-[12px] font-medium leading-4 text-paper/75");
  });

  it("draw the card's light so the line under its name reads over any saint's icon, a white one too", () => {
    // The light is the chosen saint's own icon (WebCard), and any saint can be chosen: at 0.2 the line read 4.49:1
    // over St Augustine's on St Ambrose's web, on Candlelight (the hold of 2026-11-12, export 20ef5bb3c).
    const card = fs.readFileSync(path.join(ROOT, "components/saints/web/WebCard.tsx"), "utf8");
    const opacity = Number(/\.saint-web-card-light \{[^}]*opacity: ([\d.]+);/.exec(CSS)?.[1]);
    const share = Number(/text-\[12px\] font-medium leading-4 text-paper\/(\d+)/.exec(card)?.[1]) / 100;
    expect(opacity > 0 && share > 0).toBe(true);
    // Over parchment it is not drawn.
    expect(CSS).toMatch(/html\[data-reading-mode="parchment"\] \.saint-web-card-light \{\s*display: none;/);
    // A palette's token as the cascade gives it: the base, its mode's block, then its look's.
    const tokenOf = (name: string, mode: string | null, look: string | null): Rgb | null => {
      let found: Rgb | null = null;
      for (const sel of ["@theme", ":root", mode && `html[data-reading-mode="${mode}"]`, look && `html[data-look="${look}"]`]) {
        if (!sel) continue;
        for (const m of CSS.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
          if (!m[1].split(",").some((s) => (s.split(";").pop() ?? "").trim() === sel)) continue;
          const hex = new RegExp(`--color-${name}\\s*:\\s*#([0-9a-f]{6})\\b`, "i").exec(m[2])?.[1];
          if (hex) found = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
        }
      }
      return found;
    };
    const mix = (a: Rgb, b: Rgb, t: number) => a.map((v, i) => v * t + b[i] * (1 - t)) as Rgb;
    const drawn: [string, string | null, string | null][] = [
      ["Dark", null, null],
      ["Black", "black", null],
      ["Candlelight", "candlelight", null],
      ["Monastery", "monastery", null],
      ...READING_THEMES.filter((t) => t.look).map((t): [string, string | null, string | null] => {
        const { mode, look } = themeAttributes(t.id);
        return [t.label, mode, look];
      }),
    ].filter(([, mode]) => mode !== "parchment");
    expect(drawn.length).toBe(12);
    for (const [label, mode, look] of drawn) {
      const paper = tokenOf("paper", mode, look);
      const soft = tokenOf("night-soft", mode, look);
      expect(paper && soft, label).toBeTruthy();
      // The card's ground at its top, its brightest, under the light at its brightest: a white icon.
      const ground = mix([255, 255, 255], mix(paper!, soft!, 0.04), opacity);
      expect(onGround(paper!, share, ground), `${label}: the line at ${share * 100} over a white light at ${opacity}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
