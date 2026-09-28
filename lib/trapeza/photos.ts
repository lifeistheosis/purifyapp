// Where Kitchen photos live, and who owns which. Pure: the routes pass in the
// Supabase URL, so this imports nothing and the rules are tested directly.
//
// One public bucket, "kitchen", created on first upload like the avatars and
// campaign buckets. The first folder says what a photo belongs to, the second
// whose it is:
//
//   r/<user id>/...    a member's review photo
//   s/<user id>/...    a photo sent with a member's recipe submission
//   h/<recipe id>/...  a recipe's own photo, set from the admin console
//
// A URL a client sends back is only accepted when it sits under the caller's
// own folder, so nobody can attach another member's photo to their review.

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

function publicBase(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${KITCHEN_BUCKET}/`;
}

/** The public URL prefix every photo in one owner's folder starts with. */
export function kitchenPhotoPrefix(
  supabaseUrl: string,
  folder: KitchenFolder,
  ownerId: string,
): string {
  return `${publicBase(supabaseUrl)}${folder}/${ownerId}/`;
}

/** True when `url` is a photo in that owner's folder of the kitchen bucket. */
export function ownsKitchenPhoto(
  url: string,
  supabaseUrl: string,
  folder: KitchenFolder,
  ownerId: string,
): boolean {
  if (!url || url.includes("..") || url.includes("?") || url.includes("#")) return false;
  const prefix = kitchenPhotoPrefix(supabaseUrl, folder, ownerId);
  if (!url.startsWith(prefix)) return false;
  // One file name after the prefix, nothing nested.
  return /^[A-Za-z0-9._-]+$/.test(url.slice(prefix.length));
}

/**
 * The object path inside the bucket for one of our public URLs, or null when
 * the URL is anything else. A foreign or malformed URL must never become a
 * delete against something it does not name.
 */
export function kitchenObjectPath(url: string, supabaseUrl: string): string | null {
  const base = publicBase(supabaseUrl);
  if (!url.startsWith(base)) return null;
  const path = url.slice(base.length);
  if (!path || path.includes("..") || path.includes("?") || path.includes("#")) return null;
  return decodeURIComponent(path);
}
