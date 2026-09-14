import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * One place that knows where product pictures live.
 *
 * Both writers use it: the admin upload form (a file the owner picked) and the
 * listing importer (a file fetched off a distributor's page). They had one
 * bucket name, one size cap and one type list between them, written out twice,
 * which is exactly the kind of pair that drifts the first time one of them is
 * tuned.
 *
 * PUBLIC BUCKET, UNIQUE NAMES. The storefront reads these directly, and a
 * timestamped name means a replaced cover shows up immediately instead of
 * fighting a browser or CDN cache holding the old bytes at the same path.
 */

export const SHOP_MEDIA_BUCKET = "shop-media";
export const SHOP_MEDIA_MAX_BYTES = 8 * 1024 * 1024;

/** Content type to file extension. Anything not in here is refused. */
export const SHOP_MEDIA_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function shopMediaExtension(contentType: string): string | null {
  return SHOP_MEDIA_TYPES[contentType.split(";")[0]?.trim().toLowerCase() ?? ""] ?? null;
}

/** A file name to the safe stem used in the storage path. */
export function shopMediaStem(name: string): string {
  return (
    name
      .replace(/\.[a-z0-9]+$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image"
  );
}

export type StoreResult = { url: string } | { error: string };

/**
 * Put one image in the bucket and hand back its public URL.
 *
 * The bucket is created on first use; "already exists" is the steady state and
 * is not an error.
 */
export async function storeShopImage(
  admin: SupabaseClient,
  bytes: ArrayBuffer,
  contentType: string,
  name: string,
): Promise<StoreResult> {
  const ext = shopMediaExtension(contentType);
  if (!ext) return { error: "Use a JPEG, PNG, WebP, or AVIF image." };
  if (bytes.byteLength === 0 || bytes.byteLength > SHOP_MEDIA_MAX_BYTES) {
    return { error: "Image must be between 1 byte and 8 MB." };
  }

  const { error: bucketError } = await admin.storage.createBucket(SHOP_MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: SHOP_MEDIA_MAX_BYTES,
    allowedMimeTypes: Object.keys(SHOP_MEDIA_TYPES),
  });
  if (bucketError && !/already exists/i.test(bucketError.message)) {
    return { error: bucketError.message };
  }

  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${shopMediaStem(name)}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from(SHOP_MEDIA_BUCKET)
    .upload(path, bytes, { contentType: contentType.split(";")[0], upsert: false });
  if (uploadError) return { error: uploadError.message };

  const { data } = admin.storage.from(SHOP_MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
