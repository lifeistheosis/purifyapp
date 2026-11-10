import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { PICTURE_CLEARED } from "@/lib/profile/signInPicture";
import { forgetUploads, ownsUploads } from "@/lib/security/uploadOwners";
import { publicPrefix } from "@/lib/security/uploadPath";

import { AVATAR_BUCKET, AVATAR_COPIES, avatarRef } from "./avatarPath";

// Which profile picture files are provably one reader's own, asked of the
// server's record where the path cannot say. Service role. For the upload
// route, which deletes what a new picture replaces, and for a moderator's
// "clear profile", which takes a reported picture down.
// lib/community/avatarPath.ts has the rule itself.

/**
 * The picture files behind `urls` that are provably this reader's own: an
 * old path with their own id in it, or a random one the record gives them.
 * `urls` are the addresses their profile row and their metadata hold; one
 * that names somebody else's picture answers nothing.
 */
export async function ownAvatarPaths(
  admin: SupabaseClient,
  userId: string,
  urls: unknown[],
  prefix: string,
): Promise<string[]> {
  const out: string[] = [];
  for (const url of urls) {
    const ref = avatarRef(url, prefix);
    if (!ref || out.includes(ref.path)) continue;
    const theirs = ref.legacyOwner
      ? ref.legacyOwner === userId
      : await ownsUploads(admin, AVATAR_BUCKET, [ref.path], userId);
    if (theirs) out.push(ref.path);
  }
  return out;
}

/**
 * A moderator takes a reader's picture down (1.9, "clear profile" in
 * lib/community/moderation.ts, which nulls their profile row's picture in
 * the same update as the rest of the profile). The stores ask that reported
 * content can be acted on (Apple 1.2), and the clear used to leave the
 * picture up everywhere it showed.
 *
 *   the copies    every post, reply and kitchen review of theirs, whatever
 *                 picture each was written with: the trigger that follows
 *                 the profile copies a new picture, never a removed one;
 *   the metadata  its picture, and the mark that keeps Google's photo from
 *                 standing for them again at their next sign-in
 *                 (lib/profile/signInPicture.ts);
 *   the files     only those provably theirs, as the upload route deletes.
 *
 * Unlike the upload route's retire, a step that fails does not stop the
 * next: a picture a moderator has judged must come down should not stay
 * reachable because one table failed. Nor does it fail the clear, whose
 * profile row is already cleared and whose report is still to be answered.
 * Each failure is logged.
 */
export async function takeDownPicture(admin: SupabaseClient, userId: string, rowUrl: string | null | undefined): Promise<void> {
  const step = async (what: string, run: () => Promise<{ message: string } | null | undefined>) => {
    try {
      const error = await run();
      if (error) console.warn(`[moderation] picture ${what}`, error.message);
    } catch (e) {
      console.warn(`[moderation] picture ${what}`, String(e));
    }
  };

  let metaUrl: unknown = null;
  await step("metadata not read", async () => {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    metaUrl = (data?.user?.user_metadata as { avatar_url?: unknown } | undefined)?.avatar_url ?? null;
    return error;
  });
  let paths: string[] = [];
  await step("files not found", async () => {
    paths = await ownAvatarPaths(admin, userId, [rowUrl, metaUrl], publicPrefix(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", AVATAR_BUCKET));
    return null;
  });

  for (const { table, owner } of AVATAR_COPIES) {
    await step(`copies not cleared (${table})`, async () => {
      const { error } = await admin.from(table).update({ author_avatar: null }).eq(owner, userId).not("author_avatar", "is", null);
      return error && !isTableAbsent(error) ? error : null;
    });
  }

  await step("metadata not cleared", async () => {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { avatar_url: null },
      app_metadata: { [PICTURE_CLEARED]: new Date().toISOString() },
    });
    return error;
  });

  if (paths.length === 0) return;
  let removed = false;
  await step("files not deleted", async () => {
    const { error } = await admin.storage.from(AVATAR_BUCKET).remove(paths);
    removed = !error;
    return error;
  });
  if (removed) await step("files' record not cleared", async () => (await forgetUploads(admin, AVATAR_BUCKET, paths), null));
}
