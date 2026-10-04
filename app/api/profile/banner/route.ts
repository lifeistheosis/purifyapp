import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { deleteBannerFiles, showBanner } from "@/lib/profile/bannerFile";
import { BANNER_BUCKET } from "@/lib/profile/bannerPath";
import { subscriptionTier } from "@/lib/profile/cosmetics";
import { buildMyProfile, loadProfileRow } from "@/lib/profile/server";
import { rateLimited } from "@/lib/security/ratelimit";
import { forgetUploads, recordUploadOwner } from "@/lib/security/uploadOwners";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The profile banner picture, a Plus cosmetic.
 *
 * POST uploads and sets it; DELETE removes it. The file lands in the public
 * avatars bucket under b/<random uuid>, NOT under the reader's id. A banner
 * is shown to everyone, so its address says nothing about whose it is. (A
 * profile picture's once did: ../../community/avatar/route.ts wrote
 * u/<user id>/..., which put the auth uuid in every public avatar URL.)
 *
 * Replacing or removing a banner deletes the old file, so storage does not
 * fill with pictures nobody can reach. Which file that is comes from the
 * server's own record of who uploaded what (upload_owners, written here
 * before the file goes up). The address in the reader's profiles row is not
 * proof on its own: a row could name another reader's banner.
 * lib/profile/bannerFile.ts has the rule, for this route and for the
 * moderators' "clear profile" alike.
 */

const BUCKET = BANNER_BUCKET;
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function signedIn(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function handlePOST(req: Request) {
  const user = await signedIn(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(`profile-banner:${user.id}`, 3600, 20)) {
    return NextResponse.json({ error: "Too many uploads just now. Try again later." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: ent } = await admin
    .from("entitlements")
    .select("plus_until, pro_until")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!subscriptionTier(ent as { plus_until?: string | null; pro_until?: string | null } | null)) {
    return NextResponse.json(
      { error: "Banner pictures come with Purify Plus.", code: "plus_required" },
      { status: 403 },
    );
  }

  const row = await loadProfileRow(admin, { id: user.id });
  if (row === "unavailable") {
    return NextResponse.json({ error: "Profiles are not open yet.", code: "unavailable" }, { status: 404 });
  }
  if (!row) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 4 MB." }, { status: 400 });
  }

  const { error: bucketError } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Object.keys(TYPES),
  });
  if (bucketError && !/already exists/i.test(bucketError.message)) {
    return NextResponse.json({ error: "Could not store that picture." }, { status: 500 });
  }

  const path = `b/${crypto.randomUUID()}.${ext}`;
  // Written down first, so nothing is ever stored that the server cannot say
  // whose it is. Without the table (20261007000000_upload_owners.sql not
  // applied) no banner is taken, rather than one that could never be deleted.
  const recorded = await recordUploadOwner(admin, BUCKET, path, user.id);
  if (recorded === "absent") {
    return NextResponse.json({ error: "Banner pictures are not open yet.", code: "unavailable" }, { status: 503 });
  }
  if (recorded === "failed") return NextResponse.json({ error: "Could not store that picture." }, { status: 500 });
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) {
    await forgetUploads(admin, BUCKET, [path]);
    return NextResponse.json({ error: "Could not store that picture." }, { status: 500 });
  }

  const url = await showBanner(admin, { userId: user.id, rowUrl: row.banner_url }, path);
  if (!url) return NextResponse.json({ error: "Could not save your banner." }, { status: 500 });

  const fresh = await loadProfileRow(admin, { id: user.id });
  if (!fresh || fresh === "unavailable") return NextResponse.json({ ok: true, url });
  return NextResponse.json({ ok: true, url, profile: await buildMyProfile(admin, fresh) });
}

async function handleDELETE(req: Request) {
  const user = await signedIn(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const admin = createAdminClient();
  const row = await loadProfileRow(admin, { id: user.id });
  if (!row || row === "unavailable") return NextResponse.json({ ok: true });
  // The row first: a file is deleted only once nothing shows it.
  const { error } = await admin.from("profiles").update({ banner_url: null }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Could not remove your banner." }, { status: 500 });
  await deleteBannerFiles(admin, user.id, row.banner_url);
  const fresh = await loadProfileRow(admin, { id: user.id });
  if (!fresh || fresh === "unavailable") return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: true, profile: await buildMyProfile(admin, fresh) });
}

export const POST = corsRoute(handlePOST);
export const DELETE = corsRoute(handleDELETE);
export const OPTIONS = corsPreflight;
