import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin product-image upload. Files land in the PUBLIC shop-media storage
 * bucket (ensured on first use) under a unique timestamped name, and the
 * public URL comes back for the product's media list. Unique names on
 * purpose: overwriting an existing path would fight browser and CDN image
 * caches, and a swapped cover must show on the storefront immediately.
 * Service-role writes only; nothing here trusts a client-supplied path.
 */

const BUCKET = "shop-media";
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

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
  const ext = TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, WebP, or AVIF image." },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be between 1 byte and 8 MB." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Ensure the bucket exists; "already exists" is the steady state.
  const { error: bucketError } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Object.keys(TYPES),
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
  const path = `products/${Date.now()}-${base}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
