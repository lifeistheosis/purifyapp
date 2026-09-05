import { describe, expect, it } from "vitest";
import sharp from "sharp";

import {
  IMAGE_ACCEPTED_TYPES,
  IMAGE_MAX_BYTES,
  ImageDecodeError,
  normaliseImage,
  thumbPath,
} from "../imageNormalise";

/** A flat PNG of the given size, made in memory. */
function png(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 120, g: 40, b: 40 } },
  })
    .png()
    .toBuffer();
}

describe("normaliseImage", () => {
  it("fits a large PNG inside 1600px and writes JPEG plus a 400px thumbnail", async () => {
    const out = await normaliseImage(await png(3200, 1600));
    const full = await sharp(out.full).metadata();
    const thumb = await sharp(out.thumb).metadata();
    expect(full.format).toBe("jpeg");
    expect(full.width).toBe(1600);
    expect(full.height).toBe(800);
    expect(out.width).toBe(1600);
    expect(out.height).toBe(800);
    expect(thumb.format).toBe("jpeg");
    expect(thumb.width).toBe(400);
    expect(thumb.height).toBe(200);
  });

  it("never enlarges a small image", async () => {
    const out = await normaliseImage(await png(300, 200));
    const full = await sharp(out.full).metadata();
    const thumb = await sharp(out.thumb).metadata();
    expect(full.width).toBe(300);
    expect(full.height).toBe(200);
    expect(thumb.width).toBe(300);
  });

  it("honours EXIF orientation, so a sideways phone photo comes out upright", async () => {
    // Orientation 6 is "rotate 90 clockwise to display": a 400x200 file that
    // should be shown as 200x400.
    const sideways = await sharp(await png(400, 200))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const out = await normaliseImage(sideways);
    const full = await sharp(out.full).metadata();
    expect(full.width).toBe(200);
    expect(full.height).toBe(400);
    expect(full.orientation).toBeUndefined();
  });

  it("refuses bytes that are not an image with a plain sentence", async () => {
    await expect(normaliseImage(Buffer.from("not an image"))).rejects.toBeInstanceOf(
      ImageDecodeError,
    );
    await expect(normaliseImage(Buffer.from("not an image"))).rejects.toThrow(
      /could not be read as an image/,
    );
  });
});

describe("the contract the routes share", () => {
  it("accepts HEIC and HEIF at the door", () => {
    expect(IMAGE_ACCEPTED_TYPES).toContain("image/heic");
    expect(IMAGE_ACCEPTED_TYPES).toContain("image/heif");
  });

  it("caps uploads at 25 MB", () => {
    expect(IMAGE_MAX_BYTES).toBe(25 * 1024 * 1024);
  });

  it("names the thumbnail beside the full-size path", () => {
    expect(thumbPath("products/123-icon.jpg")).toBe("products/123-icon-thumb.jpg");
  });
});
