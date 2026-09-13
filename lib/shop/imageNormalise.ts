import sharp from "sharp";

/**
 * Every product photograph goes through here on the way into the bucket.
 *
 * WHY. docs/SHOP-AUDIT.md, friction one: an iPhone photo arrives as HEIC,
 * often over 8 MB, sideways until its EXIF orientation is honoured, and the
 * old media routes stored it byte for byte. The owner converted and shrank
 * every picture outside the app before uploading it. Nothing in that list is
 * the owner's job, so the route does it.
 *
 * WHAT. Rotate by EXIF, fit inside 1600x1600 without enlarging, encode as
 * JPEG q82 through mozjpeg, and make a 400px thumbnail beside it. The output
 * is always JPEG whatever came in, which is why callers write `.jpg` paths
 * and never trust the upload's own extension.
 *
 * Shared by app/api/admin/shop/media/route.ts, app/api/shop/seller/media/
 * route.ts and scripts/shop-import.mjs. The two routes keep their own
 * authorisation and their own paths; only the pixels are shared.
 *
 * NOT `server-only`: the import script runs it under plain Node.
 */

export const IMAGE_MAX_BYTES = 25 * 1024 * 1024;
export const IMAGE_MAX_EDGE = 1600;
export const IMAGE_THUMB_EDGE = 400;
export const IMAGE_JPEG_QUALITY = 82;

// Defined in ./imageAccept, which imports nothing, and re-exported here so the
// media routes and the import script keep reading them from this module.
// Client components must import them from ./imageAccept instead: importing
// anything from this file ships sharp to the browser. See that file's header.
export { IMAGE_ACCEPTED_TYPES, IMAGE_ACCEPT_ATTR } from "./imageAccept";

export type NormalisedImage = {
  /** The full-size JPEG, at most 1600px on its longer edge. */
  full: Buffer;
  /** The 400px JPEG thumbnail. */
  thumb: Buffer;
  width: number;
  height: number;
};

export class ImageDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageDecodeError";
  }
}

/**
 * Suffix for the thumbnail beside a full-size path: `products/x.jpg` gets
 * `products/x-thumb.jpg`. Kept as a function so the import script and the
 * routes cannot spell it two ways.
 */
export function thumbPath(fullPath: string): string {
  return fullPath.replace(/\.jpg$/, "-thumb.jpg");
}

export async function normaliseImage(input: Buffer | Uint8Array): Promise<NormalisedImage> {
  // failOn "none": a truncated JPEG from a phone still decodes what it has,
  // which is better than refusing a photo over a trailing byte.
  const base = sharp(Buffer.from(input), { failOn: "none" }).rotate();
  let full: Buffer;
  let meta: { width?: number; height?: number };
  try {
    const out = await base
      .clone()
      .resize({
        width: IMAGE_MAX_EDGE,
        height: IMAGE_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: IMAGE_JPEG_QUALITY, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    full = out.data;
    meta = out.info;
  } catch (e) {
    throw new ImageDecodeError(describeDecodeFailure(e));
  }
  const thumb = await sharp(full)
    .resize({
      width: IMAGE_THUMB_EDGE,
      height: IMAGE_THUMB_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: IMAGE_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  return { full, thumb, width: meta.width ?? 0, height: meta.height ?? 0 };
}

/**
 * One plain sentence for the person holding the phone. The libvips message
 * underneath ("heifload: Unsupported feature: Unsupported codec") is kept out
 * of the response; the route logs it.
 */
function describeDecodeFailure(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (/heif|heic/i.test(raw)) {
    return "This HEIC photo could not be read on the server. Send it as a JPEG (Settings > Camera > Formats > Most Compatible on an iPhone) and try again.";
  }
  return "That file could not be read as an image. Try a JPEG or PNG.";
}
