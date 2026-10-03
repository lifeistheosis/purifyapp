import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { CAMPAIGN_BUCKET } from "@/lib/campaigns/image";
import { rateLimited } from "@/lib/security/ratelimit";
import { forgetUploads, recordUploadOwner } from "@/lib/security/uploadOwners";
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
 *   * the picture lands on a random path, c/<uuid>, which says nothing about
 *     whose campaign it is (it was c/<user id>/...; lib/security/uploadPath.ts
 *     has that story), and whose it is goes in upload_owners instead,
 *   * the URL is returned to the client and travels back in the create body,
 *     where the route asks that record whether the caller uploaded it; no
 *     campaign row is written here, so an abandoned create leaves only an
 *     orphan object.
 */

const BUCKET = CAMPAIGN_BUCKET;
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

  const path = `c/${crypto.randomUUID()}.${ext}`;
  // Written down first, so nothing is ever stored that the server cannot say
  // whose it is. Without the table (20261007000000_upload_owners.sql not
  // applied) no picture is taken, rather than one nobody could attach.
  const recorded = await recordUploadOwner(admin, BUCKET, path, user.id);
  if (recorded === "absent") {
    return NextResponse.json({ error: "Pictures are not open yet." }, { status: 503 });
  }
  if (recorded === "failed") {
    return NextResponse.json({ error: "Couldn't store the picture." }, { status: 500 });
  }
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    await forgetUploads(admin, BUCKET, [path]);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: pub.publicUrl });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
