import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { trapezaEnabled } from "@/lib/trapeza/flags";
import { KITCHEN_BUCKET, KITCHEN_MAX_BYTES, KITCHEN_TYPES } from "@/lib/trapeza/photos";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Photo upload for the Kitchen: a review photo (?kind=review) or the photo
 * sent with a recipe submission (?kind=recipe). Mirrors
 * app/api/campaigns/image/route.ts, the proven cross-origin upload path.
 *
 * Nothing is written to a row here. The URL goes back to the client and
 * travels in the review or submission body, where the route checks it sits
 * in the caller's own folder (lib/trapeza/photos.ts). An abandoned form
 * leaves an orphan object, never a row pointing at someone else's photo.
 *
 * The page shrinks photos on the device before sending (lib/trapeza/upload.ts),
 * which also strips their EXIF, so a phone's location never reaches the
 * public bucket; the size cap here is the backstop.
 */
async function handlePOST(req: Request) {
  if (!trapezaEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (await rateLimited(`kitchen-upload:${user.id}`, 3600, 40)) {
    return NextResponse.json(
      { error: "Too many uploads just now. Please try again later." },
      { status: 429 },
    );
  }

  const folder = new URL(req.url).searchParams.get("kind") === "recipe" ? "s" : "r";

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
  const ext = KITCHEN_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 400 });
  }
  if (file.size === 0 || file.size > KITCHEN_MAX_BYTES) {
    return NextResponse.json({ error: "Image must be between 1 byte and 4 MB." }, { status: 400 });
  }

  const admin = createAdminClient();
  // Bucket options only apply at creation; after the first call this answers
  // "already exists" and the limits stay as first set.
  const { error: bucketError } = await admin.storage.createBucket(KITCHEN_BUCKET, {
    public: true,
    fileSizeLimit: KITCHEN_MAX_BYTES,
    allowedMimeTypes: Object.keys(KITCHEN_TYPES),
  });
  if (bucketError && !/already exists/i.test(bucketError.message)) {
    console.warn("[kitchen] bucket create failed", bucketError.message);
    return NextResponse.json({ error: "Couldn't store the photo." }, { status: 500 });
  }

  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${folder}/${user.id}/${name}`;
  const { error: uploadError } = await admin.storage
    .from(KITCHEN_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) {
    console.warn("[kitchen] upload failed", uploadError.message);
    return NextResponse.json({ error: "Couldn't store the photo." }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(KITCHEN_BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: pub.publicUrl });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
