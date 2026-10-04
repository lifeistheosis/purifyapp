/**
 * Where a reader's profile picture lives in the public avatars bucket, and
 * what its address is allowed to say about whose it is.
 *
 * THE PATH. app/api/community/avatar/route.ts writes a/<random uuid>.<ext>,
 * and writes down who uploaded it in upload_owners
 * (lib/security/uploadOwners.ts), like every other upload of a reader's. It
 * used to write u/<user id>/<time>.<ext>, which put the Supabase auth uuid
 * (also the RevenueCat appUserID) into every public avatar URL, and through
 * that into the feed, replies, kitchen reviews and the public profile: the
 * identifier 20260802000100_revoke_public_user_id.sql keeps out of every
 * public read. scripts/migrate-avatar-paths.mjs moves the files stored that
 * way, and 20261008000000_avatar_random_path.sql lets profiles.avatar_url
 * hold the new shape. Until the script has run, rows still hold the old
 * addresses, so this still reads that shape and says whose it was.
 *
 * WHOSE A FILE IS. Never the reader's own word. A signed-in reader can
 * rewrite their own user_metadata with the public anon key
 * (supabase.auth.updateUser), so an address there proves nothing. A file is
 * theirs when the record names them, or when it is an old path with their
 * own id in it: that path says whose it is by itself.
 *
 * No imports, on purpose: scripts/migrate-avatar-paths.mjs loads this file
 * straight into Node, which strips the types but resolves no "@/" alias.
 */

export const AVATAR_BUCKET = "avatars";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const EXT = "(jpg|png|webp)";

/** What the upload route writes now. */
const RANDOM_PATH = new RegExp(`^a/${UUID}\\.${EXT}$`);
/** What it wrote before: u/<user id>/<Date.now()>.<ext>. */
const LEGACY_PATH = new RegExp(`^u/(${UUID})/\\d{1,16}\\.${EXT}$`);

/** The same shape as an UploadRef in lib/security/uploadPath.ts. */
export type AvatarRef = {
  /** The object's path inside the avatars bucket. */
  path: string;
  /** jpg, png or webp. */
  ext: string;
  /** The user id an old path carried, or null for a random path. */
  legacyOwner: string | null;
};

/**
 * Every table that copies a reader's avatar URL when they write, with the
 * column that says whose row it is. Posts and replies follow
 * profiles.avatar_url by trigger (20261003000000_profile_pictures.sql);
 * kitchen reviews follow nothing, so a picture that moves or is replaced has
 * to be repointed here before its old file goes.
 */
export const AVATAR_COPIES = [
  { table: "community_posts", owner: "user_id" },
  { table: "community_post_replies", owner: "user_id" },
  { table: "trapeza_recipe_reviews", owner: "author_id" },
] as const;

/**
 * The profile picture behind one of our public URLs, in either shape, or
 * null for anything else: another host, another folder, a banner, a nested
 * path, a query string. `prefix` is the bucket's public URL prefix,
 * ".../storage/v1/object/public/avatars/", exactly as getPublicUrl builds
 * it, so a lookalike host never matches.
 */
export function avatarRef(url: unknown, prefix: string): AvatarRef | null {
  if (typeof url !== "string" || !prefix || !url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  const random = RANDOM_PATH.exec(path);
  if (random) return { path, ext: random[1], legacyOwner: null };
  const legacy = LEGACY_PATH.exec(path);
  return legacy ? { path, ext: legacy[2], legacyOwner: legacy[1] } : null;
}
