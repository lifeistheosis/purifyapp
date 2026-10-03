// Where Kitchen photos live. Pure: the routes pass in the Supabase URL, so
// the rules are tested directly.
//
// One public bucket, "kitchen", created on first upload like the avatars and
// campaign buckets. The first folder says what a photo belongs to:
//
//   r/<uuid>.<ext>     a member's review photo
//   s/<uuid>.<ext>     a photo sent with a member's recipe submission
//   h/<recipe id>/...  a recipe's own photo, set from the admin console
//
// A member's photo has a random name. The bucket is public, so its address
// reaches every reader, and it says nothing about who sent it. Whose it is
// is written in upload_owners instead (lib/security/uploadOwners.ts), and a
// URL a client sends back is only accepted when that record names the
// caller, so nobody can attach another member's photo to their review.
//
// Until 2026-10 these were r/<user id>/... and s/<user id>/...: the folder
// was the proof, and it put the member's auth uuid in every review photo's
// URL. lib/security/uploadPath.ts has that story, and
// scripts/migrate-upload-paths.mjs moves the photos stored that way.

import { publicPrefix, uploadRef } from "@/lib/security/uploadPath";

export const KITCHEN_BUCKET = "kitchen";
export const KITCHEN_MAX_BYTES = 4 * 1024 * 1024;
export const KITCHEN_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
/** Photos on one review. The table's check constraint says the same. */
export const MAX_REVIEW_PHOTOS = 4;

export type KitchenFolder = "r" | "s" | "h";
/** The folders a member's own upload lands in. */
export type MemberFolder = Exclude<KitchenFolder, "h">;

/**
 * The object paths of the photos a member is attaching for the first time:
 * every URL in `urls` that the row does not already carry (`already`). The
 * caller then asks the record whether each is theirs (ownsUploads).
 *
 * Null when one of them is not a member photo of that folder on a random
 * path. That includes the old r/<user id>/ shape: a photo already on the
 * member's own review stays, whatever its path, but nothing new is attached
 * from a path that names its owner, so once the stored ones have moved no
 * row can pick the id up again.
 */
export function newKitchenPhotoPaths(
  urls: readonly string[],
  already: readonly string[],
  supabaseUrl: string,
  folder: MemberFolder,
): string[] | null {
  const prefix = publicPrefix(supabaseUrl, KITCHEN_BUCKET);
  const paths: string[] = [];
  for (const url of urls) {
    if (already.includes(url)) continue;
    const ref = uploadRef(url, prefix, folder);
    if (!ref || ref.legacyOwner) return null;
    paths.push(ref.path);
  }
  return paths;
}

/**
 * The object path inside the bucket for one of our public URLs, or null when
 * the URL is anything else. A foreign or malformed URL must never become a
 * delete against something it does not name.
 */
export function kitchenObjectPath(url: string, supabaseUrl: string): string | null {
  const base = publicPrefix(supabaseUrl, KITCHEN_BUCKET);
  if (!url.startsWith(base)) return null;
  const path = url.slice(base.length);
  if (!path || path.includes("..") || path.includes("?") || path.includes("#")) return null;
  return decodeURIComponent(path);
}
