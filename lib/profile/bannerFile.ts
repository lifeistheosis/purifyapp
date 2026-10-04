import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { forgetUploads, isRecorded, ownsUploads, uploadsOf } from "@/lib/security/uploadOwners";

import { BANNER_BUCKET, bannerPath } from "./bannerPath";
import { namedByAnotherProfile } from "./namedElsewhere";

// Showing and deleting a profile banner, in one place for everyone who does
// either: the reader's own upload and removal (app/api/profile/banner) and a
// moderator clearing a profile (lib/community/moderation.ts). Service role
// throughout.
//
// WHICH FILE MAY BE DELETED. Never one chosen by profiles.banner_url alone.
// That column is the address a profile shows, and a strict pattern on it says
// "this is a banner", not "this is yours": a row that came to name another
// reader's banner would hand over the right to delete it. Readers could write
// the column themselves until 20261003000000_profile_pictures.sql took the
// table-wide grant back, and a delete must not lean on a grant staying put.
// Two kinds qualify, and nothing else:
//
//   a recorded banner     every b/ file upload_owners gives this reader, which
//                         the upload route writes before the file goes up;
//   an unrecorded one     a banner from before the record existed: the file
//                         the reader's own row names, with no row in the
//                         record at all, and only while no other profile
//                         names it too.

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Whether one banner file is provably this reader's own. */
async function ownsBanner(admin: SupabaseClient, userId: string, path: string): Promise<boolean> {
  if (await ownsUploads(admin, BANNER_BUCKET, [path], userId)) return true;
  return (
    (await isRecorded(admin, BANNER_BUCKET, path)) === false &&
    !(await namedByAnotherProfile(admin, "banner_url", path, userId))
  );
}

/**
 * Every banner file that is provably this reader's own: all that may be
 * deleted when their banner comes down, whichever of them the row shows.
 */
export async function ownBannerPaths(
  admin: SupabaseClient,
  userId: string,
  rowUrl: string | null | undefined,
): Promise<string[]> {
  const out = await uploadsOf(admin, BANNER_BUCKET, "b", userId);
  const shown = bannerPath(rowUrl, supabaseUrl());
  if (shown && !out.includes(shown) && (await ownsBanner(admin, userId, shown))) out.push(shown);
  return out;
}

async function removeBannerFiles(admin: SupabaseClient, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await admin.storage.from(BANNER_BUCKET).remove(paths);
  if (error) {
    // The records stay, so the next change to the banner tries again.
    console.warn("[banner] banner not deleted", error.message);
    return;
  }
  await forgetUploads(admin, BANNER_BUCKET, paths);
}

/**
 * Make a file already stored at `path`, and recorded as the reader's, their
 * banner, then delete the one it replaces. Answers the new public address,
 * or null when the row could not be written: the new file is then gone again
 * and the old banner still stands.
 *
 * Only the banner the row showed before goes, and only when it is theirs.
 * Not every file the record gives them: a second upload in flight has a
 * record too, and must not lose its file to this one.
 */
export async function showBanner(
  admin: SupabaseClient,
  owner: { userId: string; rowUrl: string | null | undefined },
  path: string,
): Promise<string | null> {
  const bucket = admin.storage.from(BANNER_BUCKET);
  // What this banner replaces, worked out before the row changes.
  const previous = bannerPath(owner.rowUrl, supabaseUrl());
  const replaced =
    previous && previous !== path && (await ownsBanner(admin, owner.userId, previous)) ? [previous] : [];

  const url = bucket.getPublicUrl(path).data.publicUrl;
  const { error } = await admin.from("profiles").update({ banner_url: url }).eq("id", owner.userId);
  if (error) {
    console.warn("[banner] not saved", error.message);
    // Nothing shows the new file, so it can simply be taken back.
    await removeBannerFiles(admin, [path]);
    return null;
  }
  await removeBannerFiles(admin, replaced);
  return url;
}

/**
 * Delete a reader's banner files and their records. Call it once their row
 * no longer shows the banner: a file goes only when nothing shows it.
 */
export async function deleteBannerFiles(
  admin: SupabaseClient,
  userId: string,
  rowUrl: string | null | undefined,
): Promise<void> {
  await removeBannerFiles(admin, await ownBannerPaths(admin, userId, rowUrl));
}
