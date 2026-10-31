import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import {
  CROSS_ASPECT,
  FLOWER_PLATES,
  FONT_ORDER,
  LAYOUT_KEYS,
  LAYOUT_ORDER,
  QUOTE_LOOKS,
  QUOTE_STYLE,
  SHAPE_ORDER,
  TEXT_SCALES,
  flowerBeds,
  furnitureCapitals,
  litSpan,
  planQuote,
  quoteLookOf,
  type PictureStyle,
  type QuoteMeasure,
  type QuotePicture,
  type QuotePlan,
  type QuoteSubject,
} from "@/lib/share/verseCard";

/**
 * A saint's words, a council's or a saying as a picture (1.8, round 3: the
 * owner's pick of all three layouts of r3-11, and the looks of r3-11b): the
 * arithmetic, held without a canvas. Every letter is taken to be half its
 * size wide, as the verse's test takes it.
 */
const measure: QuoteMeasure = {
  width: (font, text) => [...text].length * font.size * 0.5,
  ink: (font) => ({ ascent: font.size * 0.7, left: 0, right: font.size * 0.62 }),
};

const CHRYSOSTOM = "Let no one fear death, for the Saviour's death hath set us free.";
const GREGORY =
  "Not to every one, my friends, does it belong to philosophize about God; not to every one; the Subject is not so cheap and low; and I will add, not before every audience, nor at all times, nor on all points; but on certain occasions, and before certain persons, and within certain limits.";
const MOSES = "True discretion, said he, is only secured by true humility.";

const him: QuoteSubject = {
  name: "St. John Chrysostom",
  head: "Golden-Mouth",
  byline: "Archbishop of Constantinople, †407",
  source: "The Paschal Homily",
  pageHead: "In his own words",
  pageRight: "November 13",
  ring: "St. John Chrysostom · †407",
  lit: "free",
  lang: "en",
};
/** His cover, 600 by 750, his face where lib/today/saintFaces.ts has it, looking left. */
const cover: QuotePicture = { width: 600, height: 750, point: [0.3, 0.25], looks: "left" };
/** A council's wide miniature. */
const miniature: QuotePicture = { width: 974, height: 638, point: [0.5, 0.3], looks: "ahead", seal: [0.5, 0.2, 0.27] };

const style = (over: Partial<PictureStyle> = {}): PictureStyle => ({ ...QUOTE_STYLE, ...over });
const words = (text: string) => ({ text, reference: "x", lang: "en" });
const plan = (text: string, over: Partial<PictureStyle> = {}, picture: QuotePicture | null = cover, subject: QuoteSubject = him) =>
  planQuote(words(text), subject, style(over), measure, picture);

/** The words as the picture sets them: its lines in order, the lit word put back in its line, the large first letter before them. */
function setWords(p: QuotePlan): string {
  const lines = new Map<number, string>();
  for (const r of p.runs) if (r.role === "words" || r.role === "lit") lines.set(r.y, (lines.get(r.y) ?? "") + r.text);
  const body = [...lines.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, l]) => l.trim())
    .join(" ");
  const initial = p.runs.find((r) => r.role === "initial");
  return initial ? `${initial.text}${body}` : body;
}
/** Without spaces, to read a page whose large first letter stands apart from the rest of its word ("I" and "am the wheat"). */
const squash = (s: string) => s.replace(/\s+/g, "");

const runWidth = (r: QuotePlan["runs"][number]) => measure.width(r.font, r.text) + (r.track ? r.track * ([...r.text].length - 1) : 0);

describe("the looks", () => {
  it("are the nine of r3-11b, dark ones first, Sea and Stone left out, each named in the catalog", () => {
    expect(QUOTE_LOOKS.map((l) => l.id)).toEqual(["night", "space", "fire", "day", "blush", "rose", "dawn", "lavender", "olive"]);
    for (const look of QUOTE_LOOKS) expect((en as Record<string, string>)[look.nameKey], look.id).toBeTruthy();
    expect(quoteLookOf("sea").id).toBe("night");
    expect(quoteLookOf("stone").id).toBe("night");
  });

  it("are each a row of data: a ground, an ink, the lit word's colour, the portrait's tone, the seal's kind", () => {
    for (const look of QUOTE_LOOKS) {
      expect(["night", "space", "fire", "paper", "dawn"]).toContain(look.ground);
      if (look.ground === "paper") expect(look.paper, look.id).toBeDefined();
      expect(look.ink).toHaveLength(3);
      expect(look.lit, look.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(look.portrait, look.id).toBeDefined();
      expect(["metal", "eclipse", "ember", "wax"]).toContain(look.seal.kind);
      if (look.seal.kind === "wax") expect(look.seal.wax, look.id).toMatch(/^#[0-9a-f]{6}$/);
      // White ink and a white glow on the dark looks; the light looks' own deep ink with a white halo.
      if (look.dark) expect(look.ink[0] + look.ink[1] + look.ink[2]).toBeGreaterThan(700);
      else {
        expect(look.ink[0] + look.ink[1] + look.ink[2], look.id).toBeLessThan(200);
        expect(look.litGlow).toBe("rgba(255,255,255,1)");
      }
    }
    // Night and Space in silver, as r3-11's Portrait was; Fire warm from the flames.
    expect(quoteLookOf("night").portrait.silver).toBe(true);
    expect(quoteLookOf("space").portrait.silver).toBe(true);
    expect(quoteLookOf("space").seal.kind).toBe("eclipse");
    expect(quoteLookOf("fire").seal.kind).toBe("ember");
  });

  it("carry flowers only on the light looks, as the sheet grows them: roses, lavender, olive", () => {
    expect(QUOTE_LOOKS.filter((l) => l.flowers).map((l) => [l.id, l.flowers])).toEqual([
      ["rose", "roses"],
      ["lavender", "lavender"],
      ["olive", "olive"],
    ]);
    for (const look of QUOTE_LOOKS) if (look.flowers) expect(look.dark).toBe(false);
  });

  it("keep gold to the fire's own flame: no gold or yellow on any other look", () => {
    const hue = (c: string): { h: number; s: number; l: number } | null => {
      const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c);
      const rgb = hex ? hex.slice(1).map((x) => parseInt(x, 16)) : /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c)?.slice(1).map(Number);
      if (!rgb) return null;
      const [r, g, b] = rgb.map((v) => v / 255);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      if (max === min) return { h: 0, s: 0, l };
      const d = max - min;
      const s = d / (1 - Math.abs(max + min - 1));
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return { h: (h * 60 + 360) % 360, s, l };
    };
    for (const look of QUOTE_LOOKS) {
      if (look.id === "fire") continue;
      const colours = [look.lit, look.litGlow, look.cross, look.crossGlow, look.rule, look.seal.wax, look.paper?.top, look.paper?.bottom, ...look.swatch, look.portrait.grade].filter((c): c is string => Boolean(c));
      for (const c of colours) {
        const h = hue(c);
        if (!h) continue;
        // A paper's pale warm ivory is not gold; a gold is a strong yellow of middling light.
        const gold = h.h >= 38 && h.h <= 62 && h.s > 0.45 && h.l > 0.25 && h.l < 0.8;
        expect(gold, `${look.id}: ${c}`).toBe(false);
      }
    }
  });
});

describe("the flowers", () => {
  const webpSize = (file: string): [number, number] => {
    const b = fs.readFileSync(file);
    expect(b.toString("ascii", 0, 4)).toBe("RIFF");
    expect(b.toString("ascii", 8, 12)).toBe("WEBP");
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (chunk === "VP8L") {
      const bits = b.readUInt32LE(21);
      return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
    }
    return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  };

  it("are the bundle's own small WebP plates, at the sizes the plan counts on, about 150 KB in all", () => {
    let total = 0;
    for (const [name, plate] of Object.entries(FLOWER_PLATES)) {
      const file = path.join("public", plate.src);
      expect(fs.existsSync(file), name).toBe(true);
      expect(webpSize(file), name).toEqual([plate.width, plate.height]);
      total += fs.statSync(file).size;
    }
    expect(total).toBeLessThan(250 * 1024);
  });

  it("are each recorded in docs/licensing/SHARE_FLOWERS.md with the Commons page its licence was read on", () => {
    const record = fs.readFileSync("docs/licensing/SHARE_FLOWERS.md", "utf8");
    for (const plate of Object.values(FLOWER_PLATES)) {
      const file = path.basename(plate.src);
      const row = record.split("\n").find((l) => l.startsWith(`| \`${file}\``));
      expect(row, file).toBeDefined();
      expect(row, file).toMatch(/Public domain/);
      expect(row, file).toMatch(/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });

  it("grow up from the foot on the words' side, and say how high they reach", () => {
    const rose = quoteLookOf("rose");
    const both = flowerBeds(rose, 1080, 1350, "both");
    expect(both.flowers.map((f) => f.plate)).toEqual(["rose-centifolia", "rose-regalis"]);
    expect(both.tops.left).toBeLessThan(1350);
    expect(both.tops.right).toBeLessThan(1350);
    expect(flowerBeds(rose, 1080, 1350, "right").tops.left).toBe(1350);
    expect(flowerBeds(quoteLookOf("night"), 1080, 1350, "both").flowers).toEqual([]);
  });

  it("the cross is drawn at its own proportions", () => {
    const png = fs.readFileSync("public/purify-cross-mark.png");
    expect(CROSS_ASPECT).toBeCloseTo(png.readUInt32BE(16) / png.readUInt32BE(20), 5);
  });
});

describe("the one lit word", () => {
  it("is found whole, in any case, the first time it stands", () => {
    expect(litSpan(CHRYSOSTOM, "free")).toEqual([59, 63]);
    expect(litSpan(CHRYSOSTOM.toUpperCase(), "free")).toEqual([59, 63]);
    // Never inside another word.
    expect(litSpan("freedom is not free", "free")).toEqual([15, 19]);
    expect(litSpan("freedom", "free")).toBeNull();
    expect(litSpan("anything", undefined)).toBeNull();
  });
});

describe("the furniture's capitals", () => {
  it("are English for the registry's English, the reader's own for a catalog line, and Georgian as written", () => {
    expect(furnitureCapitals("Disciple of the Theologian", "tr")).toBe("DISCIPLE OF THE THEOLOGIAN");
    expect(furnitureCapitals("Nicaea in Bithynia · 787", "tr")).toBe("NICAEA IN BITHYNIA · 787");
    expect(furnitureCapitals("Çöl Babalarından", "tr")).toBe("ÇÖL BABALARINDAN");
    expect(furnitureCapitals("kendi sözleriyle", "tr")).toBe("KENDİ SÖZLERİYLE");
    expect(furnitureCapitals("საკუთარი სიტყვებით", "ka")).toBe("საკუთარი სიტყვებით");
  });
});

/**
 * Every layout, size and face a reader can choose, in each look whose
 * ground moves the words (the planet's edge, the flames, the flowers; Night
 * stands for the plain grounds, which set the words alike).
 */
const GEOMETRY_LOOKS = ["night", "space", "fire", "rose", "lavender", "olive"];
function* everyStyle(): Generator<PictureStyle> {
  for (const layout of LAYOUT_ORDER)
    for (const look of GEOMETRY_LOOKS)
      for (const shape of SHAPE_ORDER)
        for (const font of FONT_ORDER)
          for (const size of [0, TEXT_SCALES.length - 1]) yield style({ layout, look, shape, font, size });
}

describe("every layout, in every look and size", () => {
  it("names the three layouts in the catalog, in the sheet's order", () => {
    expect(LAYOUT_ORDER).toEqual(["portrait", "page", "seal"]);
    for (const l of LAYOUT_ORDER) expect((en as Record<string, string>)[LAYOUT_KEYS[l]], l).toBeTruthy();
    expect((en as Record<string, string>)["picture.layout"]).toBe("Layout");
    // The sheet opens on his portrait, on Night, as a post.
    expect([QUOTE_STYLE.layout, QUOTE_STYLE.look, QUOTE_STYLE.shape]).toEqual(["portrait", "night", "post"]);
  });

  it("sets the words whole or not at all, every line inside the picture, signed Purify App at the foot, last and lowest", () => {
    let planned = 0;
    for (const text of [CHRYSOSTOM, GREGORY, MOSES]) {
      for (const s of everyStyle()) {
        for (const picture of s.layout === "page" ? [cover, miniature, null] : [cover, null]) {
          const p = planQuote(words(text), him, s, measure, picture);
          if (!p) continue;
          planned += 1;
          const why = `${s.layout} ${s.look} ${s.shape} ${s.font} ${s.size} ${picture ? picture.looks : "none"}`;
          const set = s.layout === "portrait" || s.font === "caps" ? text.toUpperCase() : text;
          const shown = setWords(p).replace(/”$/, "");
          if (p.runs.some((r) => r.role === "initial")) expect(squash(shown), why).toBe(squash(set));
          else expect(shown, why).toBe(set);
          for (const r of p.runs) {
            expect(r.x, `${why}: ${r.text}`).toBeGreaterThanOrEqual(0);
            expect(r.x + runWidth(r), `${why}: ${r.text}`).toBeLessThanOrEqual(p.width + 0.5);
            expect(r.y, `${why}: ${r.text}`).toBeLessThan(p.foot.y - p.foot.size * 0.6);
          }
          expect(p.foot.text).toBe("Purify App");
          expect(p.foot.y).toBeLessThan(p.height);
        }
      }
    }
    expect(planned).toBeGreaterThan(600);
    // The looks that set the words alike as Night does.
    for (const look of QUOTE_LOOKS.filter((l) => !GEOMETRY_LOOKS.includes(l.id))) {
      expect([look.floor, look.flowers], look.id).toEqual([undefined, undefined]);
    }
  });

  it("keeps the words clear of the planet's edge and the flames, and of the flowers", () => {
    for (const s of everyStyle()) {
      for (const text of [CHRYSOSTOM, GREGORY]) {
        const p = plan(text, { layout: s.layout, look: s.look, shape: s.shape });
        if (!p) continue;
        const why = `${s.layout} ${s.look} ${s.shape}`;
        const look = quoteLookOf(s.look);
        const lowest = Math.max(...p.runs.map((r) => r.y));
        if (look.floor) expect(lowest, why).toBeLessThan(p.height * (look.floor + 0.04));
        if (!look.flowers) continue;
        // The Portrait's words keep above the flowers on their side; the Page's above both; the Seal's flowers are on the right, by its name.
        const words = p.runs.filter((r) => r.role === "words" || r.role === "lit");
        const deepest = Math.max(...words.map((r) => r.y));
        const tops = flowerBeds(look, p.width, p.height, p.layout === "seal" ? "right" : "both").tops;
        if (p.layout === "page") expect(deepest, why).toBeLessThan(Math.min(tops.left, tops.right));
        if (p.layout === "portrait") expect(deepest, why).toBeLessThan(p.portrait?.side === "right" ? tops.left : tops.right);
        if (p.layout === "seal") for (const r of p.runs.filter((x) => x.role === "name")) expect(r.x + runWidth(r), why).toBeLessThanOrEqual(p.width * 0.66 + 0.5);
      }
    }
  });

  it("never cuts the words: too long for a layout and a size is no picture at all", () => {
    const longest = Array.from({ length: 12 }, () => GREGORY).join(" ");
    for (const layout of LAYOUT_ORDER) expect(plan(longest, { layout }), layout).toBeNull();
    expect(plan("   ")).toBeNull();
  });
});

describe("A, the portrait", () => {
  it("stands him on the side he looks from, so he looks into his words, and fades him before a word begins", () => {
    const p = plan(CHRYSOSTOM)!;
    // He looks left: his portrait on the right, the words on the left.
    expect(p.portrait).toMatchObject({ side: "right", x: 1080 - 648, width: 648 });
    const words = p.runs.filter((r) => r.role === "words" || r.role === "lit");
    for (const r of words) expect(r.x + runWidth(r)).toBeLessThanOrEqual(1080 * 0.47 + 0.5);
    const right = plan(CHRYSOSTOM, {}, { ...cover, looks: "right" })!;
    expect(right.portrait?.side).toBe("left");
    for (const r of right.runs.filter((x) => x.role === "words")) expect(r.x).toBeGreaterThanOrEqual(1080 * 0.53 - 0.5);
    // One who faces us stands on the left, as the owner's reference had its portrait.
    expect(plan(CHRYSOSTOM, {}, { ...cover, looks: "ahead" })!.portrait?.side).toBe("left");
  });

  it("sets the words in capitals with the one word lit, under his byname and the cross between hairlines", () => {
    const p = plan(CHRYSOSTOM)!;
    expect(p.runs.filter((r) => r.role === "lit").map((r) => r.text)).toEqual(["FREE"]);
    expect(p.runs.filter((r) => r.role === "head").map((r) => r.text)).toEqual(["GOLDEN-MOUTH"]);
    expect(p.cross?.hairlines).toHaveLength(2);
    const head = p.runs.find((r) => r.role === "head")!;
    const firstWords = Math.min(...p.runs.filter((r) => r.role === "words").map((r) => r.y));
    expect(p.cross!.top).toBeGreaterThan(head.y);
    expect(p.cross!.top + p.cross!.height).toBeLessThan(firstWords);
    expect(p.runs.filter((r) => r.role === "name").map((r) => r.text)).toEqual(["St. John Chrysostom"]);
    expect(p.runs.filter((r) => r.role === "byline").map((r) => r.text)).toEqual(["Archbishop of Constantinople, †407"]);
    expect(p.runs.filter((r) => r.role === "source").map((r) => r.text)).toEqual(["THE PASCHAL HOMILY"]);
    // A hairline frame, open at its foot for the name.
    expect(p.frame).not.toBeNull();
    expect(p.foot.framed).toBe(true);
  });

  it("keeps the column alone, about the middle, where there is no portrait", () => {
    const p = plan(MOSES, {}, null)!;
    expect(p.portrait).toBeNull();
    for (const r of p.runs.filter((x) => x.role === "words" || x.role === "lit")) {
      expect(r.x).toBeGreaterThanOrEqual(1080 * 0.16 - 0.5);
      expect(r.x + runWidth(r)).toBeLessThanOrEqual(1080 * 0.84 + 0.5);
    }
  });

  it("takes the reader's choices: the cross off, the lines from the left, his name off", () => {
    expect(plan(CHRYSOSTOM, { cross: false })!.cross).toBeNull();
    const left = plan(CHRYSOSTOM, { align: "left" }, null)!;
    const starts = new Map<number, number>();
    for (const r of left.runs.filter((x) => x.role === "words" || x.role === "lit")) starts.set(r.y, Math.min(starts.get(r.y) ?? Infinity, r.x));
    expect(new Set([...starts.values()].map(Math.round))).toEqual(new Set([Math.round(1080 * 0.16)]));
    const bare = plan(CHRYSOSTOM, { reference: false })!;
    expect(bare.runs.some((r) => r.role === "name" || r.role === "byline" || r.role === "source")).toBe(false);
  });
});

describe("B, the page", () => {
  it("stands the picture whole as a plate, never written over, and the words under it as a page with a large first letter", () => {
    const p = plan(GREGORY, { layout: "page" })!;
    expect(p.plate).not.toBeNull();
    // Whole: its proportions are the picture's own.
    expect(p.plate!.height / p.plate!.width).toBeCloseTo(750 / 600, 5);
    const initial = p.runs.find((r) => r.role === "initial")!;
    expect(initial.text).toBe("N");
    expect(initial.font.size).toBeGreaterThan(p.runs.find((r) => r.role === "words")!.font.size * 2);
    // Never written over: every letter's top (a capital is about 0.7 of its size) under the plate.
    for (const r of p.runs.filter((x) => x.role !== "head")) expect(r.y - r.font.size * 0.75).toBeGreaterThan(p.plate!.y + p.plate!.height);
    // Nothing lit: a page is quiet.
    expect(p.runs.some((r) => r.role === "lit")).toBe(false);
    // A running head: in his own words, and his feast.
    expect(p.runs.filter((r) => r.role === "head").map((r) => r.text)).toEqual(["IN HIS OWN WORDS", "NOVEMBER 13"]);
  });

  it("gives a council's wide miniature the page's width, and a saying with no picture the cross where the plate would be", () => {
    const wide = plan(GREGORY, { layout: "page" }, miniature)!;
    expect(wide.plate!.width).toBeGreaterThanOrEqual(1080 * 0.6 - 0.5);
    const bare = plan(MOSES, { layout: "page" }, null)!;
    expect(bare.plate).toBeNull();
    expect(bare.cross).not.toBeNull();
  });
});

describe("C, the seal", () => {
  it("sets the words large and alone, their mark hung in the margin, one word lit, and his seal under them with his name round it", () => {
    const p = plan(CHRYSOSTOM, { layout: "seal" })!;
    const mark = p.runs.find((r) => r.role === "mark")!;
    expect(mark.text).toBe("“");
    const first = p.runs.find((r) => r.role === "words")!;
    expect(mark.x + runWidth(mark)).toBeLessThanOrEqual(first.x);
    expect(p.runs.filter((r) => r.role === "lit").map((r) => r.text)).toEqual(["free"]);
    expect(p.seal).toMatchObject({ ring: "ST. JOHN CHRYSOSTOM · †407" });
    const lowestWords = Math.max(...p.runs.filter((r) => r.role === "words" || r.role === "lit").map((r) => r.y));
    expect(lowestWords).toBeLessThan(p.seal!.cy - p.seal!.r);
    // His name beside the seal, clear of it.
    const name = p.runs.find((r) => r.role === "name")!;
    expect(name.x).toBeGreaterThan(p.seal!.cx + p.seal!.r);
  });
});
