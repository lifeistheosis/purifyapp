import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import {
  IMAGE_ACCEPTED_TYPES,
  IMAGE_MAX_BYTES,
  ImageDecodeError,
  normaliseImage,
  thumbPath,
} from "@/lib/shop/imageNormalise";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin product-image upload. Files land in the PUBLIC shop-media storage
 * bucket (ensured on first use) under a unique timestamped name, and the
 * public URL comes back for the product's media list. Unique names on
 * purpose: overwriting an existing path would fight browser and CDN image
 * caches, and a swapped cover must show on the storefront immediately.
 * Service-role writes only; nothing here trusts a client-supplied path.
 *
 * EVERY UPLOAD IS RE-ENCODED. lib/shop/imageNormalise.ts rotates by EXIF,
 * fits the picture inside 1600px, writes JPEG q82 and a 400px thumbnail
 * beside it at `<path>-thumb.jpg`. The 25 MB cap is on what arrives; what is
 * stored is a few hundred kilobytes. HEIC is accepted at the door and either
 * decodes or answers 415 with a sentence the owner can act on.
 *
 * Returns { ok, url, thumbUrl }.
 */

const BUCKET = "shop-media";

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (!IMAGE_ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, WebP, AVIF or HEIC image." },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > IMAGE_MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be between 1 byte and 25 MB." },
      { status: 400 },
    );
  }

  let normalised;
  try {
    normalised = await normaliseImage(new Uint8Array(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof ImageDecodeError) {
      console.warn("[shop] admin media decode failed", file.type, e.message);
      return NextResponse.json({ error: e.message }, { status: 415 });
    }
    throw e;
  }

  const admin = createAdminClient();

  // Ensure the bucket exists; "already exists" is the steady state. The cap
  // here is on what is STORED, which is always the re-encoded JPEG.
  const { error: bucketError } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: IMAGE_MAX_BYTES,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  });
  if (bucketError && !/already exists/i.test(bucketError.message)) {
    return NextResponse.json({ error: bucketError.message }, { status: 500 });
  }

  const base = (file.name || "image")
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";
  const path = `products/${Date.now()}-${base}.jpg`;
  const thumb = thumbPath(path);

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, normalised.full, { contentType: "image/jpeg", upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }
  const { error: thumbError } = await admin.storage
    .from(BUCKET)
    .upload(thumb, normalised.thumb, { contentType: "image/jpeg", upsert: false });
  if (thumbError) {
    return NextResponse.json({ error: thumbError.message }, { status: 500 });
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  const { data: thumbData } = admin.storage.from(BUCKET).getPublicUrl(thumb);
  return NextResponse.json({
    ok: true,
    url: data.publicUrl,
    thumbUrl: thumbData.publicUrl,
    width: normalised.width,
    height: normalised.height,
  });
}
