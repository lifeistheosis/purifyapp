import { describe, expect, it } from "vitest";

import { paintPicture, type LoadedImage } from "@/lib/share/drawVerseCard";
import { DEFAULT_STYLE, ICON, planPicture, type Measure, type PictureStyle } from "@/lib/share/verseCard";

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
