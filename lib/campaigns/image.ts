// Where a prayer campaign's picture lives. Pure, like lib/trapeza/photos.ts.
//
// One public bucket, "campaign-media", created on first upload. A picture
// lands at c/<uuid>.<ext>: a random name, because the bucket is public and
// the address must not say whose campaign it is. Who uploaded it is written
// in upload_owners instead (lib/security/uploadOwners.ts).
//
// Until 2026-10 it was c/<user id>/<time>.<ext>. lib/security/uploadPath.ts
// has that story, and scripts/migrate-upload-paths.mjs moves the pictures
// stored that way.

import { publicPrefix, uploadRef, type UploadRef } from "@/lib/security/uploadPath";

export const CAMPAIGN_BUCKET = "campaign-media";

/**
 * The campaign picture behind one of our public URLs, in either shape, or
 * null for anything else. The create schema only pins the host
 * (isSupabaseStorageUrl), so a URL that passes it can still name an avatar,
 * a kitchen photo or another campaign's picture; this is what tells them
 * apart.
 */
export function campaignImage(url: string | null | undefined, supabaseUrl: string): UploadRef | null {
  return uploadRef(url, publicPrefix(supabaseUrl, CAMPAIGN_BUCKET), "c");
}
