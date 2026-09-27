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

  it("draw the reading bar, the season's frame and the gold rule", async () => {
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

  it("refuse a saint the library does not have", async () => {
    await expect(renderArt({ kind: "art", saint: "no-such-saint", gilded: false })).rejects.toBeInstanceOf(UnknownSaintError);
  });
});
