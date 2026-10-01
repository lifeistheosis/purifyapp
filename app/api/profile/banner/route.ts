import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { subscriptionTier } from "@/lib/profile/cosmetics";
import { buildMyProfile, loadProfileRow } from "@/lib/profile/server";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The profile banner picture, a Plus cosmetic.
 *
 * POST uploads and sets it; DELETE removes it. The file lands in the public
 * avatars bucket under b/<random uuid>, NOT under the reader's id: an avatar's
 * path carries the auth uuid (../../community/avatar/route.ts writes
 * u/<user id>/...), which puts it in every public avatar URL. A banner is
 * shown to everyone, so its address says nothing about whose it is.
 *
 * Replacing or removing a banner deletes the old file, so storage does not
 * fill with pictures nobody can reach.
 */

const BUCKET = "avatars";
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

/** The storage path of one of OUR banners, from its public URL, or null. */
function ownBannerPath(url: string | null): string | null {
  if (!url) return null;
  const m = /\/storage\/v1\/object\/public\/avatars\/(b\/[0-9a-f-]{36}\.(?:jpg|png|webp))$/.exec(url);
  return m ? m[1] : null;
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
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: "Could not store that picture." }, { status: 500 });

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const { error: saveError } = await admin.from("profiles").update({ banner_url: pub.publicUrl }).eq("id", user.id);
  if (saveError) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: "Could not save your banner." }, { status: 500 });
  }

  const old = ownBannerPath(row.banner_url);
  if (old) await admin.storage.from(BUCKET).remove([old]);

  const fresh = await loadProfileRow(admin, { id: user.id });
  if (!fresh || fresh === "unavailable") return NextResponse.json({ ok: true, url: pub.publicUrl });
  return NextResponse.json({ ok: true, url: pub.publicUrl, profile: await buildMyProfile(admin, fresh) });
}

async function handleDELETE(req: Request) {
  const user = await signedIn(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const admin = createAdminClient();
  const row = await loadProfileRow(admin, { id: user.id });
  if (!row || row === "unavailable") return NextResponse.json({ ok: true });
  const old = ownBannerPath(row.banner_url);
  await admin.from("profiles").update({ banner_url: null }).eq("id", user.id);
  if (old) await admin.storage.from(BUCKET).remove([old]);
  const fresh = await loadProfileRow(admin, { id: user.id });
  if (!fresh || fresh === "unavailable") return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: true, profile: await buildMyProfile(admin, fresh) });
}

export const POST = corsRoute(handlePOST);
export const DELETE = corsRoute(handleDELETE);
export const OPTIONS = corsPreflight;
