import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Campaign image upload for the signed-in creator. Mirrors
 * app/api/community/avatar/route.ts, which is the only upload path in the repo
 * that is authenticated, cross-origin correct, and proven in production.
 *
 * Differences from the avatar route, all deliberate:
 *   * flag-gated behind campaignsEnabled(), like every other campaigns route,
 *     so it 404s while the feature is dark,
 *   * rate limited on the AUTHENTICATED USER rather than the IP: ipKey()
 *     collapses to the literal "unknown" with no forwarded-for header, and
 *     mobile carriers NAT many app users behind one address,
 *   * the URL is returned to the client and travels back in the create body
 *     (validated there against the Supabase host); nothing is written to a
 *     row here, so an abandoned create leaves only an orphan object.
 */

const BUCKET = "campaign-media";
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function handlePOST(req: Request) {
  if (!campaignsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  // Keyed on the user, not the IP: see the note above.
  if (await rateLimited(`campaign-image:${user.id}`, 3600, 20)) {
    return NextResponse.json(
      { error: "Too many uploads just now. Please try again later." },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data." },
      { status: 400 },
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, or WebP image." },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be between 1 byte and 4 MB." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  // Bucket options only apply at creation; after the first call this returns
  // "already exists" and the limits stay as first set (same as avatars).
  const { error: bucketError } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Object.keys(TYPES),
  });
  if (bucketError && !/already exists/i.test(bucketError.message)) {
    return NextResponse.json({ error: bucketError.message }, { status: 500 });
  }

  const path = `c/${user.id}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: pub.publicUrl });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
