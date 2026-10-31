import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { paintPicture, paintQuote, type LoadedImage, type PaintEnv } from "@/lib/share/drawVerseCard";
import {
  DEFAULT_STYLE,
  ICON,
  QUOTE_LOOKS,
  QUOTE_STYLE,
  planPicture,
  planQuote,
  type Measure,
  type PictureStyle,
  type QuoteLayout,
  type QuoteMeasure,
  type QuotePicture,
  type QuoteSubject,
} from "@/lib/share/verseCard";

/**
 * The drawing, watched on a stand-in canvas: every call is written down with
 * the font and the opacity it was made in, so a test can say where each
 * letter and each picture went. The picture's own rule, that an icon is
 * never written over, and its signature at the foot are held here, on what
 * is actually painted, and not only on the plan.
 */
type Call = { op: string; args: unknown[]; font: string; alpha: number };

const size = (font: string) => Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 10);
const measure: Measure = (text, s) => text.length * s * 0.5;

function standIn() {
  const calls: Call[] = [];
  const state: Record<string, unknown> = { font: "10px serif", globalAlpha: 1, fillStyle: "#000", textAlign: "start" };
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      return (...args: unknown[]) => {
        calls.push({ op: prop, args, font: String(target.font), alpha: Number(target.globalAlpha) });
        if (prop === "measureText") return { width: measure(String(args[0]), size(String(target.font))) };
        if (prop === "createLinearGradient" || prop === "createRadialGradient") return { addColorStop() {} };
        return undefined;
      };
    },
    set(target, prop: string, value) {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const faces = { serif: "Lora, serif", sans: "DM Sans, sans-serif" };
const picture = (width: number, height: number): LoadedImage => ({ source: { tag: "picture" } as unknown as CanvasImageSource, width, height });
const ICON_IMAGE = picture(619, 652);
const MARK_IMAGE = picture(177, 311);

const LUKE_11_13 = {
  text: "If ye then, being evil, know how to give good gifts unto your children: how much more shall your heavenly Father give the Holy Spirit to them that ask him?",
  reference: "Luke 11:13",
  note: "King James Version",
};

function paint(style: Partial<PictureStyle>) {
  const plan = planPicture(LUKE_11_13, { ...DEFAULT_STYLE, ...style }, { words: measure, reference: measure, note: measure })!;
  const { ctx, calls } = standIn();
  paintPicture(ctx, plan, faces, { look: plan.look.kind === "icon" ? ICON_IMAGE : null, mark: MARK_IMAGE });
  const texts = calls.filter((c) => c.op === "fillText");
  const images = calls.filter((c) => c.op === "drawImage");
  return { plan, calls, texts, images };
}

describe("the picture as it is painted", () => {
  it("writes nothing over an icon: the icon above, the words under it, and no cross", () => {
    for (const look of ["christ", "trinity"]) {
      for (const shape of ["story", "square", "post"] as const) {
        const { plan, texts, images } = paint({ look, shape });
        const figure = plan.height * ICON[shape].wordsFrom;
        // One picture, the icon, inside its own part at the top.
        expect(images, `${look} ${shape}`).toHaveLength(1);
        const [, , , , , dx, dy, dw, dh] = images[0].args as number[];
        expect([dx, dw]).toEqual([0, plan.width]);
        expect(dy).toBe(0);
        expect(dy + dh).toBeLessThanOrEqual(Math.round(plan.height * ICON[shape].height));
        // Every letter set below the icon's figure: a letter's top is its baseline less its size.
        for (const call of texts) {
          const [, , y] = call.args as [string, number, number];
          expect(y - size(call.font), `${look} ${shape}: "${call.args[0]}"`).toBeGreaterThanOrEqual(figure);
        }
      }
    }
  });

  it("lights the cross over the words on every other look", () => {
    const { plan, images, calls } = paint({ look: "light" });
    expect(images).toHaveLength(1);
    expect(images[0].args[0]).toBe(MARK_IMAGE.source);
    expect(images[0].args[2]).toBe(plan.mark!.top);
    // Above the first line of the words.
    expect(plan.mark!.top + plan.mark!.height).toBeLessThan(plan.words.top);
    expect(calls.some((c) => c.op === "save")).toBe(true);
  });

  it("sets the whole verse, line by line, then the reference and the Bible it is from", () => {
    const { plan, texts } = paint({});
    const written = texts.map((c) => String(c.args[0]));
    const verseLines = written.slice(0, plan.words.lines.length);
    expect(verseLines.join(" ")).toBe(LUKE_11_13.text);
    // The reference letter by letter, spaced, in capitals.
    expect(written.join("")).toContain("LUKE 11:13");
    expect(written).toContain("King James Version");
  });

  it("signs it Purify App at the foot, last and lowest", () => {
    for (const look of ["light", "horizon", "christ", "trinity", "plain"]) {
      const { plan, texts } = paint({ look });
      const foot = texts.slice(-"Purify App".length);
      expect(foot.map((c) => c.args[0]).join(""), look).toBe("Purify App");
      for (const c of foot) expect(c.args[2]).toBe(plan.foot.baseline);
      const lowest = Math.max(...texts.slice(0, -foot.length).map((c) => c.args[2] as number));
      expect(plan.foot.baseline).toBeGreaterThan(lowest);
      expect(texts.map((c) => String(c.args[0])).join("")).not.toMatch(/purifyapp\.net/i);
    }
  });

  it("sets bold capitals in the sans at its heaviest, and the serif at its reading weight", () => {
    const caps = paint({ font: "caps" }).texts[0];
    expect(caps.font).toMatch(/^800 \d+px DM Sans/);
    expect(String(caps.args[0])).toBe(String(caps.args[0]).toUpperCase());
    expect(paint({}).texts[0].font).toMatch(/^500 \d+px Lora/);
  });
});

/**
 * A quote's picture (round 3 r3-11 and r3-11b), painted on stand-ins: the
 * picture's own canvas and every layer it draws a part on. Every call and
 * every property set is written down, so a test can say no canvas filter was
 * ever used (a filter is not in every phone's web view), how the portrait was
 * toned and faded, that the flowers were multiplied in, and that the name at
 * the foot came last.
 */
type Event = { on: string; op: string; args: unknown[]; font: string; shadowBlur: number; composite: string };

function recorder(name: string, events: Event[]) {
  const state: Record<string, unknown> = { font: "10px serif", globalAlpha: 1, fillStyle: "#000", textAlign: "start", shadowBlur: 0, globalCompositeOperation: "source-over" };
  // save() and restore() keep and give back the drawing state, as a canvas does.
  const kept: Record<string, unknown>[] = [];
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      return (...args: unknown[]) => {
        events.push({ on: name, op: prop, args, font: String(target.font), shadowBlur: Number(target.shadowBlur), composite: String(target.globalCompositeOperation) });
        if (prop === "save") kept.push({ ...target });
        if (prop === "restore") Object.assign(target, kept.pop() ?? {});
        if (prop === "measureText") {
          const w = measure(String(args[0]), size(String(target.font)));
          return { width: w, actualBoundingBoxAscent: size(String(target.font)) * 0.7, actualBoundingBoxLeft: 0, actualBoundingBoxRight: w };
        }
        if (prop === "createLinearGradient" || prop === "createRadialGradient") return { addColorStop() {} };
        if (prop === "createImageData") return { data: new Uint8ClampedArray(Number(args[0]) * Number(args[1]) * 4) };
        if (prop === "createPattern") return { pattern: true };
        return undefined;
      };
    },
    set(target, prop: string, value) {
      events.push({ on: name, op: `set:${prop}`, args: [value], font: String(target.font), shadowBlur: Number(target.shadowBlur), composite: String(target.globalCompositeOperation) });
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return ctx;
}

const quoteMeasure: QuoteMeasure = {
  width: (font, text) => [...text].length * font.size * 0.5,
  ink: (font) => ({ ascent: font.size * 0.7, left: 0, right: font.size * 0.62 }),
};
const SUBJECT: QuoteSubject = {
  name: "St. John Chrysostom",
  head: "Golden-Mouth",
  byline: "Archbishop of Constantinople, †407",
  source: "The Paschal Homily",
  pageHead: "In his own words",
  pageRight: "November 13",
  ring: "St. John Chrysostom · †407",
  lit: "free",
};
const FACE: QuotePicture = { width: 600, height: 750, point: [0.3, 0.25], looks: "left" };
const COVER_IMAGE = picture(600, 750);
const FLOWER = picture(520, 642);

function paintQuoteOn(layout: QuoteLayout, look: string, withFace = true) {
  const events: Event[] = [];
  let layers = 0;
  const env: PaintEnv = {
    layer: (w, h) => {
      layers += 1;
      return { canvas: { tag: `layer-${layers}`, w, h } as unknown as CanvasImageSource, ctx: recorder(`layer-${layers}`, events) };
    },
  };
  const style = { ...QUOTE_STYLE, layout, look };
  const plan = planQuote({ text: "Let no one fear death, for the Saviour's death hath set us free.", reference: "x", lang: "en" }, SUBJECT, style, quoteMeasure, withFace ? FACE : null)!;
  const ctx = recorder("picture", events);
  paintQuote(ctx, plan, faces, { face: withFace ? COVER_IMAGE : null, mark: MARK_IMAGE, flowers: { "rose-centifolia": FLOWER, "rose-regalis": FLOWER, lavender: FLOWER, olive: FLOWER } }, withFace ? FACE : null, 1, env);
  return { plan, events, texts: events.filter((e) => e.on === "picture" && e.op === "fillText") };
}

describe("a quote's picture as it is painted", () => {
  it("never sets a canvas filter, in any layout or look", () => {
    for (const layout of ["portrait", "page", "seal"] as const) {
      for (const look of QUOTE_LOOKS) {
        const { events } = paintQuoteOn(layout, look.id);
        expect(events.some((e) => e.op === "set:filter"), `${layout} ${look.id}`).toBe(false);
      }
    }
    expect(fs.readFileSync("lib/share/drawVerseCard.ts", "utf8")).not.toMatch(/\.filter\s*=/);
  });

  it("draws his portrait on a layer of its own: silver by a saturation blend on Night, faded toward the words by masks", () => {
    const { events, plan } = paintQuoteOn("portrait", "night");
    const portrait = events.filter((e) => e.on === "layer-1" || e.on === "layer-2" || e.on.startsWith("layer-"));
    expect(portrait.some((e) => e.op === "drawImage" && e.args[0] === COVER_IMAGE.source)).toBe(true);
    expect(portrait.some((e) => e.op === "fillRect" && e.composite === "saturation")).toBe(true);
    expect(portrait.filter((e) => e.op === "fillRect" && e.composite === "destination-in").length).toBeGreaterThanOrEqual(2);
    // Laid into the picture in his column.
    const laid = events.find((e) => e.on === "picture" && e.op === "drawImage" && String((e.args[0] as { tag?: string }).tag ?? "").startsWith("layer-") && e.args[1] === plan.portrait!.x);
    expect(laid).toBeDefined();
  });

  it("keeps his own colours on a light look, with no silver", () => {
    const { events } = paintQuoteOn("portrait", "day");
    expect(events.some((e) => e.on.startsWith("layer-") && e.op === "fillRect" && e.composite === "saturation")).toBe(false);
  });

  it("multiplies the flowers into a light ground, so their paper vanishes", () => {
    const { events, plan } = paintQuoteOn("page", "rose");
    const drawn = events.filter((e) => e.on === "picture" && e.op === "drawImage" && e.args[0] === FLOWER.source);
    expect(drawn).toHaveLength(plan.flowers.length);
    expect(drawn.every((e) => e.composite === "multiply")).toBe(true);
  });

  it("lights the one word with its glow, and the word is the one chosen", () => {
    const { texts } = paintQuoteOn("seal", "night");
    const glowing = texts.filter((e) => e.shadowBlur > 0);
    expect(glowing.length).toBeGreaterThan(0);
    expect(new Set(glowing.map((e) => String(e.args[0])))).toEqual(new Set(["free"]));
  });

  it("strikes his seal with his name round its edge, and his face in it", () => {
    const { texts, events } = paintQuoteOn("seal", "night");
    expect(texts.map((e) => String(e.args[0])).join("")).toContain("ST. JOHN CHRYSOSTOM · †407");
    expect(events.some((e) => e.on.startsWith("layer-") && e.op === "drawImage" && e.args[0] === COVER_IMAGE.source)).toBe(true);
    // With no picture of him, the cross is at its heart.
    const bare = paintQuoteOn("seal", "night", false);
    expect(bare.events.some((e) => e.op === "drawImage" && e.args[0] === COVER_IMAGE.source)).toBe(false);
  });

  it("signs every look and layout Purify App at the foot, last", () => {
    for (const layout of ["portrait", "page", "seal"] as const) {
      for (const look of ["night", "fire", "rose"]) {
        const { texts, plan } = paintQuoteOn(layout, look);
        const foot = texts.slice(-"Purify App".length);
        expect(foot.map((e) => e.args[0]).join(""), `${layout} ${look}`).toBe("Purify App");
        for (const e of foot) expect(e.args[2]).toBe(plan.foot.y);
      }
    }
  });
});
