import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { NORMALIZED_MAX_EDGE, normalizeShopImage } from "@/lib/shop/imageNormalize";

// Real images, made here, so the test exercises the decoder and encoder the
// route actually runs rather than a mock of them.

/** A phone-shaped photo: landscape pixels, tagged "rotate 90 on display",
 * carrying GPS coordinates in its EXIF. */
async function phonePhoto(): Promise<Buffer> {
  return sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#7a4b2a" } })
    .jpeg()
    .withExif({
      IFD0: { Make: "Phone", Model: "Test" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "40/1 44/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "73/1 59/1 0/1" },
    })
    // sharp owns the orientation tag; set through withExif it is overwritten.
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

describe("normalizeShopImage", () => {
  it("the test photo really carries GPS and a rotation tag", async () => {
    const meta = await sharp(await phonePhoto()).metadata();
    expect(meta.orientation).toBe(6);
    // The GPS block is found through tag 0x8825, stored little-endian here.
    expect(meta.exif?.includes(Buffer.from([0x25, 0x88]))).toBe(true);
  });

  it("strips every trace of EXIF, the location included", async () => {
    const out = await normalizeShopImage(await phonePhoto());
    if ("error" in out) throw new Error(out.error);
    const meta = await sharp(out.bytes).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
  });

  it("applies the rotation before dropping the tag, so a portrait stays portrait", async () => {
    const out = await normalizeShopImage(await phonePhoto());
    if ("error" in out) throw new Error(out.error);
    // 4000x3000 stored, rotate 90 on display: the published image is taller than wide.
    expect(out.height).toBeGreaterThan(out.width);
  });

  it("holds the longest edge to the maximum, and never enlarges", async () => {
    const big = await normalizeShopImage(await phonePhoto());
    if ("error" in big) throw new Error(big.error);
    expect(Math.max(big.width, big.height)).toBe(NORMALIZED_MAX_EDGE);
    expect(big.contentType).toBe("image/jpeg");

    const small = await normalizeShopImage(
      await sharp({ create: { width: 300, height: 200, channels: 3, background: "#fff" } }).png().toBuffer(),
    );
    if ("error" in small) throw new Error(small.error);
    expect([small.width, small.height]).toEqual([300, 200]);
  });

  it("is far smaller than what arrived", async () => {
    const photo = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: "#808080", noise: { type: "gaussian", mean: 128, sigma: 40 } },
    })
      .jpeg({ quality: 95 })
      .toBuffer();
    const out = await normalizeShopImage(photo);
    if ("error" in out) throw new Error(out.error);
    expect(out.bytes.length).toBeLessThan(photo.length / 3);
  });

  it("keeps transparency as PNG instead of boxing it in black", async () => {
    const cutout = await sharp({
      create: { width: 800, height: 800, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
    const out = await normalizeShopImage(cutout);
    if ("error" in out) throw new Error(out.error);
    expect(out.contentType).toBe("image/png");
    expect((await sharp(out.bytes).metadata()).hasAlpha).toBe(true);
  });

  it("refuses what is not an image, with a sentence the owner can act on", async () => {
    const out = await normalizeShopImage(Buffer.from("definitely not an image"));
    expect("error" in out && out.error).toMatch(/not an image we can read/);
  });
});

describe("storeShopImage stores the normalised image, never the upload", () => {
  it("uploads a small, EXIF-free JPEG under a .jpg path", async () => {
    const { storeShopImage } = await import("@/lib/shop/shopMedia");
    const uploads: { path: string; bytes: Buffer; contentType: string }[] = [];
    // The three storage calls storeShopImage makes, recorded.
    const admin = {
      storage: {
        createBucket: async () => ({ error: { message: "The resource already exists" } }),
        from: () => ({
          upload: async (path: string, bytes: Buffer, opts: { contentType: string }) => {
            uploads.push({ path, bytes, contentType: opts.contentType });
            return { error: null };
          },
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example/${path}` } }),
        }),
      },
    };
    const photo = await phonePhoto();
    // The route hands over file.arrayBuffer(); so does this.
    const bytes = photo.buffer.slice(photo.byteOffset, photo.byteOffset + photo.byteLength) as ArrayBuffer;
    const out = await storeShopImage(admin as never, bytes, "image/jpeg", "IMG_0042.JPG");
    expect("url" in out && out.url).toMatch(/^https:\/\/cdn\.example\/products\/.*-img-0042\.jpg$/);
    expect(uploads).toHaveLength(1);
    expect(uploads[0].contentType).toBe("image/jpeg");
    expect(uploads[0].bytes.length).toBeLessThan(photo.length);
    const meta = await sharp(uploads[0].bytes).metadata();
    expect(meta.exif).toBeUndefined();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(NORMALIZED_MAX_EDGE);
  });

  it("refuses an oversize upload before touching storage", async () => {
    const { storeShopImage } = await import("@/lib/shop/shopMedia");
    let touched = false;
    const admin = { storage: { createBucket: async () => ((touched = true), { error: null }), from: () => ({}) } };
    const out = await storeShopImage(admin as never, new ArrayBuffer(26 * 1024 * 1024), "image/jpeg", "x");
    expect("error" in out && out.error).toMatch(/25 MB/);
    expect(touched).toBe(false);
  });
});
