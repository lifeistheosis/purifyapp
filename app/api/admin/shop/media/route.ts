import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { SHOP_MEDIA_MAX_INPUT_BYTES, shopMediaExtension, storeShopImage } from "@/lib/shop/shopMedia";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin product-image upload. Files land in the PUBLIC shop-media storage
 * bucket (ensured on first use) under a unique timestamped name, and the
 * public URL comes back for the product's media list. Unique names on
 * purpose: overwriting an existing path would fight browser and CDN image
 * caches, and a swapped cover must show on the storefront immediately.
 * Service-role writes only; nothing here trusts a client-supplied path.
 * What is stored is normalised first (rotated, EXIF and GPS removed, longest
 * edge 1600px), in storeShopImage.
 *
 * The bucket, the size cap and the type list live in lib/shop/shopMedia.ts
 * because the listing importer writes to the same bucket, and two copies of
 * that policy would drift the first time one of them was tuned.
 */

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
  if (!shopMediaExtension(file.type)) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, WebP, or AVIF image." },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > SHOP_MEDIA_MAX_INPUT_BYTES) {
    return NextResponse.json(
      { error: "Image must be between 1 byte and 25 MB." },
      { status: 400 },
    );
  }

  const stored = await storeShopImage(
    createAdminClient(),
    await file.arrayBuffer(),
    file.type,
    file.name || "image",
  );
  if ("error" in stored) {
    return NextResponse.json({ error: stored.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, url: stored.url });
}
