import { NextResponse } from "next/server";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { ownAvatarPaths } from "@/lib/community/avatarFile";
import { AVATAR_BUCKET, AVATAR_COPIES } from "@/lib/community/avatarPath";
import { rateLimited } from "@/lib/security/ratelimit";
import { forgetUploads, recordUploadOwner } from "@/lib/security/uploadOwners";
import { publicPrefix } from "@/lib/security/uploadPath";
import { createAdminClient } from "@/lib/supabase/admin";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Profile-picture upload for the signed-in user. The image lands in the
 * PUBLIC avatars bucket (ensured on first use) under a random path,
 * a/<uuid>.<ext>, and who uploaded it is written in upload_owners. Not
 * flag-gated: an avatar is account data.
 *
 * The path says nothing about whose picture it is. It used to be
 * u/<user id>/<time>, which put the auth uuid in every public avatar URL;
 * lib/community/avatarPath.ts has the history, and
 * scripts/migrate-avatar-paths.mjs moves the files stored that way.
 *
 * The address is kept in profiles.avatar_url (20261003000000_profile_pictures.sql),
 * which every post and reply follows. It used to live only in auth user
 * metadata, and Supabase rewrites user_metadata.avatar_url from Google on
 * every Google sign-in, so an uploaded picture quietly turned back into the
 * Google photo within days. Metadata is still written, for app builds that
 * read it, but the profile column is the one that counts.
 *
 * A new picture replaces the old one. The reader's kitchen reviews that
 * copied the old address are pointed at the new one (posts and replies
 * follow the profile by trigger), then the old file is deleted: only a file
 * that is provably theirs (lib/community/avatarFile.ts), and only once the
 * new picture is saved, so a failure part way leaves an unused file behind
 * rather than a missing picture.
 */

const BUCKET = AVATAR_BUCKET;
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const NOT_SAVED = "Could not save your picture. Please try again.";
const NOT_OPEN = { error: "Profile pictures are not open yet.", code: "unavailable" };

async function handlePOST(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  // Keyed on the reader, not the IP, as app/api/campaigns/image/route.ts
  // explains. Each upload also rewrites their copies and deletes a file.
  if (await rateLimited(`community-avatar:${user.id}`, 3600, 20)) {
    return NextResponse.json(
      { error: "Too many uploads just now. Try again later." },
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
  const { error: bucketError } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Object.keys(TYPES),
  });
  if (bucketError && !/already exists/i.test(bucketError.message)) {
    return NextResponse.json({ error: bucketError.message }, { status: 500 });
  }
  const bucket = admin.storage.from(BUCKET);

  // What this picture replaces, read before anything below changes.
  const { data: before } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ avatar_url: string | null }>();
  const replaced = await ownAvatarPaths(
    admin,
    user.id,
    [before?.avatar_url, user.user_metadata?.avatar_url],
    publicPrefix(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", BUCKET),
  );

  const path = `a/${crypto.randomUUID()}.${ext}`;
  // Written down first, so nothing is ever stored that the server cannot say
  // whose it is. Without the table (20261007000000_upload_owners.sql not
  // applied) no picture is taken, rather than one that could never be deleted.
  const recorded = await recordUploadOwner(admin, BUCKET, path, user.id);
  if (recorded === "absent") return NextResponse.json(NOT_OPEN, { status: 503 });
  if (recorded === "failed") return NextResponse.json({ error: NOT_SAVED }, { status: 500 });
  const { error: uploadError } = await bucket.upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    await forgetUploads(admin, BUCKET, [path]);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }
  const url = bucket.getPublicUrl(path).data.publicUrl;
  const takeBack = async () => {
    await bucket.remove([path]);
    await forgetUploads(admin, BUCKET, [path]);
  };

  // The picture of record, which a sign-in cannot overwrite. Before the
  // 20261003 migration the column is absent and metadata below is all there is.
  const { error: rowError } = await admin.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (rowError && !isColumnAbsent(rowError)) {
    await takeBack();
    // The column's check still wants the old path, so
    // 20261008000000_avatar_random_path.sql has not been applied here.
    if (rowError.code === "23514") return NextResponse.json(NOT_OPEN, { status: 503 });
    console.warn("[avatar] profile picture not saved", rowError.message);
    return NextResponse.json({ error: NOT_SAVED }, { status: 500 });
  }

  const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, avatar_url: url },
  });
  if (metaError) {
    console.warn("[avatar] metadata not updated", metaError.message);
    // Before the profile column existed, metadata was the whole save.
    if (rowError) {
      await takeBack();
      return NextResponse.json({ error: NOT_SAVED }, { status: 500 });
    }
    // Otherwise the picture of record is saved and showing, so it stays. The
    // old file stays too this once: their metadata may still name it, and a
    // kitchen review written now would copy that address.
    return NextResponse.json({ ok: true, url });
  }

  if (replaced.length > 0) await retire(admin, user.id, replaced, url);
  return NextResponse.json({ ok: true, url });
}

/**
 * Point this reader's copies of their old picture URLs at the new one, then
 * delete the old files and their records. Runs after the new picture is
 * saved, which is what the reader came for, so nothing here fails the
 * request.
 */
async function retire(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  paths: string[],
  newUrl: string,
) {
  const bucket = admin.storage.from(BUCKET);
  const oldUrls = paths.map((p) => bucket.getPublicUrl(p).data.publicUrl);
  for (const { table, owner } of AVATAR_COPIES) {
    const { error } = await admin
      .from(table)
      .update({ author_avatar: newUrl })
      .eq(owner, userId)
      .in("author_avatar", oldUrls);
    // A table that is not there yet holds no copies. Any other failure keeps
    // the old file, which some row may still show.
    if (error && !isTableAbsent(error)) {
      console.warn("[avatar] old picture kept, copies not repointed", table, error.message);
      return;
    }
  }
  const { error } = await bucket.remove(paths);
  if (error) {
    console.warn("[avatar] old picture not deleted", error.message);
    return;
  }
  await forgetUploads(admin, BUCKET, paths);
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
