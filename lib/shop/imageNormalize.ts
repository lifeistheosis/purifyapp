import "server-only";

import sharp from "sharp";

/**
 * Every shop picture, made fit to publish, before it is stored.
 *
 * Three things were wrong with storing the bytes as they arrived:
 *
 * 1. LOCATION. A phone photo carries EXIF, and EXIF carries GPS. A product
 *    shot taken at home published the owner's home to anyone who saved the
 *    image. The output here carries no EXIF at all.
 * 2. ORIENTATION. Phones store a portrait photo as a landscape image with a
 *    "rotate me" tag. Strip the tag without applying it and the picture lies
 *    on its side, so the rotation is applied first.
 * 3. SIZE. A 12 MP photo is 3 to 8 MB, and the storefront shows it at a few
 *    hundred pixels. The longest edge is held to 1600px, which is sharp on a
 *    retina product page and a fraction of the bytes.
 *
 * Opaque images become JPEG; anything with transparency (a cut-out product on
 * no background) stays PNG, so it does not gain a black box. Both are
 * readable in every browser and every mail client, which matters because the
 * back-in-stock and name-day emails show these images.
 *
 * HEIC is not decoded here: the image library's HEIF support covers AVIF
 * only, because HEVC carries patent licensing. iPhones convert to JPEG at
 * pick time because the upload inputs do not list HEIC, so this is rarely
 * reached, and when it is, the caller gets a plain sentence to show.
 */

export const NORMALIZED_MAX_EDGE = 1600;

export type NormalizedImage = {
  bytes: Buffer;
  contentType: "image/jpeg" | "image/png";
  extension: "jpg" | "png";
  width: number;
  height: number;
};

export async function normalizeShopImage(
  input: ArrayBuffer | Buffer,
): Promise<NormalizedImage | { error: string }> {
  const source = Buffer.isBuffer(input) ? input : Buffer.from(input);
  let hasAlpha: boolean;
  try {
    const meta = await sharp(source).metadata();
    if (!meta.width || !meta.height) return { error: "That file is not an image we can read." };
    if ((meta.pages ?? 1) > 1) return { error: "Animated images are not supported. Use a still photo." };
    hasAlpha = meta.hasAlpha === true;
  } catch {
    return {
      error:
        "That file is not an image we can read. iPhone HEIC photos upload as JPEG from the phone itself; from a computer, export as JPEG first.",
    };
  }

  const pipeline = sharp(source)
    // No argument: read the EXIF orientation, apply it, then drop the tag.
    .rotate()
    .resize({
      width: NORMALIZED_MAX_EDGE,
      height: NORMALIZED_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });
  // sharp writes no metadata unless asked (withMetadata / keepExif), so the
  // EXIF, and the GPS in it, stops here. Colour is converted to sRGB, which
  // is what the web assumes when no profile is attached.

  try {
    const { data, info } = hasAlpha
      ? await pipeline.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
      : await pipeline
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: 82, mozjpeg: true, progressive: true })
          .toBuffer({ resolveWithObject: true });
    return hasAlpha
      ? { bytes: data, contentType: "image/png", extension: "png", width: info.width, height: info.height }
      : { bytes: data, contentType: "image/jpeg", extension: "jpg", width: info.width, height: info.height };
  } catch {
    return { error: "That image could not be processed. Try another file." };
  }
}
