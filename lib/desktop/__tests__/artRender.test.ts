import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { renderArt, UnknownSaintError } from "@/lib/desktop/artRender";

async function size(buf: Buffer) {
  const m = await sharp(buf).metadata();
  return { width: m.width, height: m.height, format: m.format };
}

describe("the Discord pictures", () => {
  it("draw a portrait square, from the top of the icon", async () => {
    const { body, type } = await renderArt({ kind: "art", saint: "nicholas-the-wonderworker", gilded: false });
    expect(type).toBe("image/jpeg");
    expect(await size(body)).toEqual({ width: 512, height: 512, format: "jpeg" });
  });

  it("draw the reading bar, the season's frame and the silver rule", async () => {
    const plain = await renderArt({ kind: "art", saint: "basil-the-great", progress: 28, gilded: false });
    const framed = await renderArt({ kind: "art", saint: "basil-the-great", progress: 62, season: "purple", gilded: true });
    expect(await size(framed.body)).toEqual({ width: 512, height: 512, format: "jpeg" });
    // The frame is the season's purple at the very edge; the plain picture
    // has the portrait there instead.
    const edge = async (b: Buffer) => (await sharp(b).extract({ left: 2, top: 256, width: 1, height: 1 }).raw().toBuffer())[2];
    expect(await edge(framed.body)).toBeGreaterThan(110);
    expect(Math.abs((await edge(framed.body)) - (await edge(plain.body)))).toBeGreaterThan(10);
  });

  it("fall back to Purify's own mark for Scripture with no writer's icon", async () => {
    const { body } = await renderArt({ kind: "art", progress: 50, gilded: false });
    expect(await size(body)).toEqual({ width: 512, height: 512, format: "jpeg" });
  });

  it("draw the season's badge", async () => {
    const { body, type } = await renderArt({ kind: "badge", season: "gold" });
    expect(type).toBe("image/png");
    expect(await size(body)).toEqual({ width: 128, height: 128, format: "png" });
  });

  // Gold is for a Plus member's Community profile alone (the owner,
  // 2026-10-31), so the season the pictures still call "gold" (Pascha and
  // ordinary days) is silver, and so is everything that was gold around it.
  it("draw no gold: the 'gold' season is silver, and so are its rule, the crosses and the plain bar", async () => {
    const pixel = async (b: Buffer, left: number, top: number) => {
      const [r, g, bl] = await sharp(b).extract({ left, top, width: 1, height: 1 }).raw().toBuffer();
      return [r, g, bl];
    };
    /** A grey: the three channels close (gold's are 137 apart), and not warm (red over blue). */
    const grey = ([r, g, b]: number[]) => Math.max(r, g, b) - Math.min(r, g, b) <= 18 && r <= b + 4;

    // The frame is 20 pixels, the rule the 8 inside it.
    const framed = await renderArt({ kind: "art", saint: "basil-the-great", progress: 62, season: "gold", gilded: true });
    expect(grey(await pixel(framed.body, 4, 256)), "the frame").toBe(true);
    expect(grey(await pixel(framed.body, 22, 256)), "the rule inside it").toBe(true);

    const badge = await renderArt({ kind: "badge", season: "gold" });
    expect(grey(await pixel(badge.body, 20, 64)), "the disc").toBe(true);
    // The cross's upright runs down the middle of the disc.
    const cross = await renderArt({ kind: "badge", season: "purple" });
    expect(grey(await pixel(cross.body, 64, 64)), "the cross on a coloured disc").toBe(true);

    // The plain bar (no season), at its start: a dark silver.
    const plain = await renderArt({ kind: "art", saint: "basil-the-great", progress: 100, gilded: false });
    expect(grey(await pixel(plain.body, 60, 512 - 40 - 13)), "the plain bar").toBe(true);
  });

  it("refuse a saint the library does not have", async () => {
    await expect(renderArt({ kind: "art", saint: "no-such-saint", gilded: false })).rejects.toBeInstanceOf(UnknownSaintError);
  });
});
