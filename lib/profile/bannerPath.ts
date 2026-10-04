// Where a profile banner lives. Pure, like lib/campaigns/image.ts.
//
// The public "avatars" bucket, at b/<uuid>.<ext>: a random name, because the
// bucket is public and a banner is shown to everyone, so its address says
// nothing about whose it is. Who uploaded it is written in upload_owners
// (lib/security/uploadOwners.ts), and lib/profile/bannerFile.ts asks that
// record before a banner file is ever deleted.

import { publicPrefix, uploadRef } from "@/lib/security/uploadPath";

export const BANNER_BUCKET = "avatars";

/**
 * The banner file behind one of our public URLs, or null for anything else:
 * another host, another bucket or folder, a profile picture, a nested path,
 * a query string. A banner never had an old shape with an id in it, so that
 * shape is refused too.
 */
export function bannerPath(url: string | null | undefined, supabaseUrl: string): string | null {
  const ref = uploadRef(url, publicPrefix(supabaseUrl, BANNER_BUCKET), "b");
  return ref && !ref.legacyOwner ? ref.path : null;
}
