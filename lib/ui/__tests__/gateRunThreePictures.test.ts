// Words over a picture, from the pre-build gate's third run (1.9, 2026-11-11).
//
// The mock checker began that day to measure words that stand on a picture
// by the pixels under their letters (scripts/mock-check.mjs, its pixels pass;
// Fable Themes' sweep). Four places on this chat's ground fell short of
// 4.5:1 there. Each is mended by the least that passes on the five palettes
// and the seventeen looks, measured on the selling export, and held here so
// a later nudge to a fade or an ink cannot bring it back:
//
//   1. A study's cover: the Father's words stood on the picture (62 percent
//      strong under their first line). Every one of the fourteen studies
//      fell short on some palette: 1.40:1 at the least, on Light.
//   2. A study's reader: the part's own heading on the subject's light, on
//      the four palettes whose ink is dimmest (3.99:1 on Candlelight).
//   3. A picture tile's line on Candlelight (Your rule's tile on Prayers,
//      4.28:1 where the line runs to two).
//   4. Your rule's head: the line under its name on Light (4.49:1 over the
//      morning's icon).
//
// What a reader would notice if this broke: a Father's words hard to read
// over his own portrait, and three small grey lines fainter than the rest.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of the rule whose selector is exactly `selector`. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const m = new RegExp(`(?:^|[{};])\\s*${escaped}\\s*\\{([^}]*)\\}`, "m").exec(CSS);
  if (!m) throw new Error(`no rule for ${selector}`);
  return m[1];
}
/** The share of the ink a rule draws its words at. */
const share = (body: string) => Number(/color: color-mix\(in (?:srgb|oklab), var\(--color-paper\) (\d+)%, transparent\);/.exec(body)?.[1] ?? NaN);

describe("a study's cover: the Father's words stand on the ground, not on the picture", () => {
  const body = rule(".study-cover-picture");
  const masks = [...body.matchAll(/(?:-webkit-)?mask-image: linear-gradient\(to bottom, ([^;]*)\);/g)].map((m) => m[1]);
  /** How strong the picture is, by how far down the cover: the mask's own stops. */
  const stops = [...(masks[0] ?? "").matchAll(/(#000|transparent|rgb\(0 0 0 \/ (0?\.\d+)\)) (\d+)%?/g)].map((m) => ({
    strong: m[1] === "#000" ? 1 : m[1] === "transparent" ? 0 : Number(m[2]),
    at: Number(m[3]) / 100,
  }));
  const strongAt = (down: number) => {
    const after = stops.findIndex((s) => s.at >= down);
    if (after <= 0) return after === 0 ? stops[0].strong : stops[stops.length - 1].strong;
    const [a, b] = [stops[after - 1], stops[after]];
    return a.strong + ((b.strong - a.strong) * (down - a.at)) / (b.at - a.at);
  };

  it("reads the cover's fade from the stylesheet, the same for every browser", () => {
    expect(masks).toHaveLength(2);
    expect(masks[0]).toBe(masks[1]);
    expect(stops.length).toBeGreaterThanOrEqual(3);
    expect(stops[0]).toEqual({ strong: 1, at: 0 });
  });

  it("where the words begin, the picture is nearly gone: on a phone and on a computer", () => {
    // The cover's height and how far the words are drawn up over it, as the stylesheet sets them.
    const tall = Number(/height: (\d+)px;/.exec(rule(".study-cover"))?.[1]);
    const up = Number(/margin-top: -(\d+)px;/.exec(rule(".study-cover-words"))?.[1]);
    expect(tall).toBe(300);
    expect(up).toBe(120);
    // A phone's cover begins under the clear bar: 3rem taller, and more where the screen has an inset.
    expect(CSS).toMatch(/\.study-cover \{\s*height: calc\(3rem \+ env\(safe-area-inset-top, 0px\) \+ 300px\);/);
    const computer = (tall - up) / tall;
    const phone = (48 + tall - up) / (48 + tall);
    // By arithmetic the dimmest ink (Candlelight's) holds 4.5:1 on a white point of a picture no stronger than a third.
    expect(strongAt(computer)).toBeLessThanOrEqual(0.3);
    expect(strongAt(phone)).toBeLessThanOrEqual(0.3);
    // An inset only takes the words further down the fade.
    expect(strongAt((48 + 47 + tall - up) / (48 + 47 + tall))).toBeLessThanOrEqual(strongAt(phone));
  });

  it("and his face is whole above them", () => {
    expect(strongAt(0.3)).toBe(1);
    // It fades, it is not cut: the last of it is gone before the cover's foot, by a slope and not a step.
    expect(stops[stops.length - 1].strong).toBe(0);
    expect(stops[stops.length - 1].at).toBeGreaterThan(stops[1].at + 0.3);
  });
});

describe("a study's cover: his portrait lies whole over the subject's icon", () => {
  // The cover's code without its notes, so a note about the old way is not read as the way.
  const cover = read("components/theology/StudyCover.tsx")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("one fade for the pair: the icon is behind the portrait, never seen through it", () => {
    // Each layer used to carry the fade itself. Where a portrait is 60 percent there, the icon behind it showed
    // through at a quarter of its strength: a second figure in the Father's robe (the stills of the gate's third
    // run, 2026-11-11). One element fades now, and it holds them both.
    expect(cover.match(/study-cover-picture/g)).toHaveLength(1);
    expect(cover).toMatch(
      /<span data-study-pictures="" className="study-cover-picture absolute inset-0 overflow-hidden">\s*<WholeIcon src=\{subject\.src\} eager className="absolute inset-0 h-full w-full" \/>\s*\{portrait\?\.kind === "cover" \? \(\s*<span className="absolute inset-0 overflow-hidden">\s*<SaintFace key=\{portrait\.src\} picture=\{\{ \.\.\.portrait, fallback: null \}\} \/>\s*<\/span>\s*\) : null\}\s*<\/span>/,
    );
  });

  it("the portrait fills the frame it shares with the icon, so nothing of the icon stands beside it", () => {
    const face = read("components/today/SaintFace.tsx");
    expect(face).toContain('className={cn("img-arrive h-full w-full object-cover", className)}');
    // And the icon is still all that shows when he has no portrait, or it cannot be had: it is not taken away.
    expect(cover).toMatch(/<WholeIcon src=\{subject\.src\}/);
  });
});

describe("a study's reader: the part's heading on the subject's light", () => {
  const reader = read("components/theology/StudyReader.tsx");

  it("is the heading the rule names, written in the faint ink as before", () => {
    expect(reader).toMatch(/className="reader-part-heading font-serif text-\[13\.5px\] italic leading-snug text-paper\/58"/);
  });

  it("is drawn a step stronger on the four palettes whose ink is dimmest", () => {
    const candlelight = share(rule('html[data-reading-mode="candlelight"] .reader-part-heading'));
    const three = share(rule('html[data-reading-mode="monastery"] .reader-part-heading, html[data-reading-mode="councils"] .reader-part-heading, html[data-reading-mode="cappadocian"] .reader-part-heading'));
    // Measured on the export, on the study where each was least: 3.99:1 at 58 percent on Candlelight, 4.23 on Monastery.
    expect(candlelight).toBeGreaterThanOrEqual(68);
    expect(three).toBeGreaterThanOrEqual(66);
    // A step, not a jump: still the quiet line over the part.
    expect(candlelight).toBeLessThanOrEqual(72);
    expect(three).toBeLessThanOrEqual(70);
  });

  it("and is left as written everywhere else, where it passes", () => {
    const named = [...CSS.matchAll(/html\[data-reading-mode="([a-z]+)"\] \.reader-part-heading/g)].map((m) => m[1]).sort();
    expect(named).toEqual(["candlelight", "cappadocian", "councils", "monastery"]);
    expect(CSS).not.toMatch(/(?:^|[{};,])\s*\.reader-part-heading\s*[{,]/m);
  });
});

describe("a picture tile's line on Candlelight", () => {
  const tiles = read("components/mobile/SoftTiles.tsx");

  it("is drawn at 88 percent of the ink or more, where a tile is not lit", () => {
    const at = share(rule('html[data-reading-mode="candlelight"] :not([data-lit]) > .tile-line'));
    // Measured on the export: 4.28:1 at the 80 percent it is written in (Your rule's tile, its line on two lines).
    expect(at).toBeGreaterThanOrEqual(88);
    expect(at).toBeLessThan(100);
  });

  it("the rule reaches the line of a tile that is not lit, and no other", () => {
    // The tile says when it is lit, and the line is the tile's own child.
    expect(tiles).toContain("data-lit={lit || undefined}");
    expect(tiles).toMatch(/<p data-carry-over="" className=\{cn\("tile-line relative mt-1 font-sans text-caption leading-\[1\.35\]", lit \? "text-paper" : "text-paper\/80"\)\}>\{sub\}<\/p>\s*\) : null\}\s*<\/Tag>/);
    // A lit tile's line is the whole ink already.
    expect(CSS).not.toMatch(/html\[data-reading-mode="candlelight"\] \.tile-line\s*\{/);
  });
});

describe("Your rule's head: the line under its name on Light", () => {
  const head = read("components/prayers/mine/RuleHead.tsx");

  it("is drawn at 80 percent of the ink or more", () => {
    const at = share(rule('html[data-reading-mode="parchment"] .rule-head-words > .rule-head-line'));
    // Measured on the export: 4.49:1 at the 75 percent it is written in, over the morning's icon.
    expect(at).toBeGreaterThanOrEqual(80);
    expect(at).toBeLessThanOrEqual(86);
  });

  it("the line alone: Pray my rule's length keeps its own ink", () => {
    const words = head.slice(head.indexOf('<div className="rule-head-words relative">'));
    // The line is the head's own child, right after the name.
    expect(words).toMatch(/<\/h1>\s*<p className="rule-head-line mt-2 max-w-\[46ch\] font-sans text-detail leading-\[1\.5\] text-paper\/75">\{t\("prayers\.mine\.intro"\)\}<\/p>/);
    // The length stands inside the row of the button, a child of that row and not of the head.
    const row = words.slice(words.indexOf("data-mine-action"));
    expect(row).toMatch(/<span data-mine-pray-meta className="rule-head-line [^"]*text-paper\/65">/);
    expect(words.indexOf("data-mine-pray-meta")).toBeGreaterThan(words.indexOf("data-mine-action"));
  });
});
