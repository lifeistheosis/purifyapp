/**
 * A reader's own upload in a public bucket: what its address looks like, and
 * what an address is allowed to say about who uploaded it.
 *
 * A public bucket serves every object at a URL that is its path, to anyone.
 * So the path is random, <folder>/<uuid>.<ext>, and who uploaded the file is
 * written in the upload_owners table (20261007000000_upload_owners.sql),
 * which only the service role can read. lib/security/uploadOwners.ts asks
 * it.
 *
 * Until 2026-10 the kitchen and campaign uploads were
 * <folder>/<user id>/<file>. The path itself was the proof of whose file it
 * was, and so it put the Supabase auth uuid (also the RevenueCat appUserID)
 * in every public URL of a review photo: the identifier that
 * 20260802000100_revoke_public_user_id.sql keeps out of every public read.
 * scripts/migrate-upload-paths.mjs moves the files stored that way. Until it
 * has run, rows still hold those URLs, so this still reads the old shape and
 * says whose it was.
 *
 * No imports, on purpose: the script loads this file straight into Node,
 * which strips the types but resolves no "@/" alias.
 */

export const UPLOAD_OWNERS_TABLE = "upload_owners";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const EXT = "(jpg|png|webp)";

export type UploadRef = {
  /** The object's path inside its bucket. */
  path: string;
  /** jpg, png or webp. */
  ext: string;
  /** The user id an old path carried, or null for a random path. */
  legacyOwner: string | null;
};

/**
 * The public URL prefix of one bucket, ".../storage/v1/object/public/<bucket>/",
 * as getPublicUrl builds it.
 */
export function publicPrefix(supabaseUrl: string, bucket: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/`;
}

/**
 * The upload behind one of our public URLs, or null for anything else: another
 * host, another bucket or folder, a nested path, a query string. `prefix` is
 * the bucket's public URL prefix, so a lookalike host never matches, and
 * `folder` is the one letter the route writes under.
 */
export function uploadRef(url: unknown, prefix: string, folder: string): UploadRef | null {
  if (typeof url !== "string" || !prefix || !url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  if (path.includes("..")) return null;

  const random = new RegExp(`^${folder}/${UUID}\\.${EXT}$`).exec(path);
  if (random) return { path, ext: random[1], legacyOwner: null };

  // <folder>/<user id>/<file>, one file name and nothing nested.
  const legacy = new RegExp(`^${folder}/(${UUID})/[A-Za-z0-9._-]*\\.${EXT}$`).exec(path);
  if (legacy) return { path, ext: legacy[2], legacyOwner: legacy[1] };

  return null;
}
