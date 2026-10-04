import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ownsUploads } from "@/lib/security/uploadOwners";

import { AVATAR_BUCKET, avatarRef } from "./avatarPath";

// Which profile picture files are provably one reader's own, asked of the
// server's record where the path cannot say. Service role. For the upload
// route, which deletes what a new picture replaces.
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
