import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { UPLOAD_OWNERS_TABLE, type UploadRef } from "@/lib/security/uploadPath";

/**
 * Whose upload is whose, asked of the server's own record.
 *
 * A reader's uploads sit on random paths in public buckets
 * (lib/security/uploadPath.ts), so a path proves nothing about who sent the
 * file. The upload_owners table does (20261007000000_upload_owners.sql): the
 * upload route writes a row before the file goes up, and everything that
 * used to read the owner out of the path asks here instead.
 *
 * Never from the reader's own word. user_metadata and their profiles row are
 * theirs to rewrite with the public anon key, so neither proves a file is
 * theirs. This table has no policy and no grant: only the service role, which
 * every function here must be given, reads or writes it.
 *
 * Everything fails closed. A record that cannot be read is "not theirs", and
 * an upload that cannot be recorded is not stored.
 */

/** "absent" means 20261007000000_upload_owners.sql has not been applied. */
export type Recorded = "recorded" | "absent" | "failed";

/** Write down that this reader is uploading bucket/path. Call it before the upload. */
export async function recordUploadOwner(
  admin: SupabaseClient,
  bucket: string,
  path: string,
  ownerId: string,
): Promise<Recorded> {
  const { error } = await admin
    .from(UPLOAD_OWNERS_TABLE)
    .insert({ bucket, path, owner_id: ownerId });
  if (!error) return "recorded";
  if (isTableAbsent(error)) return "absent";
  console.warn("[uploads] owner not recorded", bucket, error.message);
  return "failed";
}

/** True when the record says this reader uploaded every one of `paths`. */
export async function ownsUploads(
  admin: SupabaseClient,
  bucket: string,
  paths: string[],
  ownerId: string,
): Promise<boolean> {
  const wanted = [...new Set(paths)];
  if (wanted.length === 0) return true;
  const { data, error } = await admin
    .from(UPLOAD_OWNERS_TABLE)
    .select("path")
    .eq("bucket", bucket)
    .eq("owner_id", ownerId)
    .in("path", wanted);
  if (error) {
    if (!isTableAbsent(error)) console.warn("[uploads] owners not read", bucket, error.message);
    return false;
  }
  const theirs = new Set(((data ?? []) as { path: string }[]).map((row) => row.path));
  return wanted.every((path) => theirs.has(path));
}

/**
 * Drop the record of files that have been deleted, so a row here always
 * names a file that exists. Never throws and never fails the request: the
 * delete it follows has already happened, and a row left behind names a
 * random path nothing will ever be stored at again.
 */
export async function forgetUploads(
  admin: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  try {
    const { error } = await admin
      .from(UPLOAD_OWNERS_TABLE)
      .delete()
      .eq("bucket", bucket)
      .in("path", paths);
    if (error && !isTableAbsent(error)) {
      console.warn("[uploads] owner records not removed", bucket, error.message);
    }
  } catch (e) {
    console.warn("[uploads] owner records not removed", bucket, e instanceof Error ? e.message : e);
  }
}

export type Removed = "removed" | "not-theirs" | "failed";

/**
 * Delete a stored file on behalf of the reader a row says it belongs to, and
 * only when it provably is theirs: the record names them, or it is an old
 * path with their own id in it. Anything else is left where it is.
 *
 * A row's URL alone is not that proof. A campaign's image_url was once
 * accepted from the client with nothing but a host check, so a row could
 * name somebody else's picture, and taking that campaign down would have
 * deleted it.
 *
 * Never throws: it runs after the takedown it belongs to has succeeded.
 */
export async function removeOwnedUpload(
  admin: SupabaseClient,
  bucket: string,
  ref: UploadRef | null,
  ownerId: string | null | undefined,
): Promise<Removed> {
  if (!ref || !ownerId) return "not-theirs";
  try {
    const theirs = ref.legacyOwner
      ? ref.legacyOwner === ownerId
      : await ownsUploads(admin, bucket, [ref.path], ownerId);
    if (!theirs) return "not-theirs";
    const { error } = await admin.storage.from(bucket).remove([ref.path]);
    if (error) {
      console.warn("[uploads] file not deleted", bucket, ref.path, error.message);
      return "failed";
    }
    await forgetUploads(admin, bucket, [ref.path]);
    return "removed";
  } catch (e) {
    console.warn("[uploads] file not deleted", bucket, e instanceof Error ? e.message : e);
    return "failed";
  }
}

/**
 * Every file in one folder of a bucket that the record gives this reader.
 * `folder` is the letter the route writes under: "b" lists b/... Empty when
 * the record cannot be read: nothing is theirs that it does not say is.
 */
export async function uploadsOf(
  admin: SupabaseClient,
  bucket: string,
  folder: string,
  ownerId: string,
): Promise<string[]> {
  const { data, error } = await admin
    .from(UPLOAD_OWNERS_TABLE)
    .select("path")
    .eq("bucket", bucket)
    .eq("owner_id", ownerId)
    .like("path", `${folder}/%`);
  if (error) {
    if (!isTableAbsent(error)) console.warn("[uploads] owners not read", bucket, error.message);
    return [];
  }
  return ((data ?? []) as { path: string }[]).map((row) => row.path);
}

/**
 * Whether the record has a row for this file at all, whoever it names.
 * "unknown" when it could not be read, which a caller must treat as a yes:
 * a file with a row is its owner's, and never anybody else's to claim.
 */
export async function isRecorded(
  admin: SupabaseClient,
  bucket: string,
  path: string,
): Promise<boolean | "unknown"> {
  const { data, error } = await admin
    .from(UPLOAD_OWNERS_TABLE)
    .select("path")
    .eq("bucket", bucket)
    .eq("path", path)
    .limit(1);
  if (error) {
    // Before the table exists nothing is recorded.
    if (isTableAbsent(error)) return false;
    console.warn("[uploads] owners not read", bucket, error.message);
    return "unknown";
  }
  return (data ?? []).length > 0;
}
