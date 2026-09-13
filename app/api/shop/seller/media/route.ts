import { NextResponse } from "next/server";

import { rateLimited } from "@/lib/security/ratelimit";
import { shopEnabled } from "@/lib/shop/flags";
import { getSellerContext } from "@/lib/shop/seller";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Seller image upload: store logo, store banner, listing photographs.
 *
 * WHY THIS EXISTS. Sellers could not upload anything. The listing form told
 * them to paste a URL, and pasting a URL does not work either: next.config.ts
 * allows three remote image hosts and the CSP allows the same three, so a
 * photograph hosted anywhere else is blocked before it renders. A seller
 * therefore had no way at all to put a picture of their own work on their own
 * listing, which is most of what a listing is.
 *
 * A deliberate near-copy of app/api/admin/shop/media/route.ts rather than a
 * shared helper: the two differ in exactly the two things that matter (who may
 * call it, and where the file lands), and a shared function with an `isAdmin`
 * flag is how an authorization check ends up on the wrong side of a branch.
 * The rules that must not drift, the accepted types and the size cap, are
 * small enough to read side by side.
 *
 * PATHS ARE NAMESPACED BY SELLER and built entirely on the server. Nothing
 * here trusts a client-supplied path, so one seller cannot write into
 * another's prefix or overwrite a file they do not own. Names are unique
 * because overwriting a path fights browser and CDN caches, and a swapped
 * photograph has to show up immediately.
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
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (ctx.seller.status !== "active") {
    return NextResponse.json(
      { error: "Your seller account is not active." },
      { status: 403 },
    );
  }
  // Storage is the one seller surface with a real per-request cost.
  if (await rateLimited(`shop-seller-media:${ctx.userId}`, 3600, 100)) {
    return NextResponse.json(
      { error: "Too many uploads. Please try again later." },
      { status: 429 },
    );
  }

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

  // The seller id comes from the session, never from the request. The only
  // client contribution to this path is a slugified filename.
  const base =
    (file.name || "image")
      .replace(/\.[a-z0-9]+$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image";
  const path = `sellers/${ctx.seller.id}/${Date.now()}-${base}.${ext}`;

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
