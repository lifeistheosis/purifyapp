import { AVATAR_BUCKET, avatarRef } from "@/lib/community/avatarPath";
import { publicPrefix } from "@/lib/security/uploadPath";

/**
 * The picture a sign-in left in a reader's metadata, for the places that
 * fall back to it when their profile row has no picture of its own (1.9).
 *
 * user_metadata.avatar_url holds Google's photo, which Supabase writes again
 * at every Google sign-in, or the address of a picture the reader uploaded
 * (app/api/community/avatar/route.ts copies it there for older app builds).
 *
 * Once a moderator has taken a reader's picture down ("clear profile",
 * lib/community/moderation.ts), app_metadata says so. Neither the reader
 * (who can rewrite user_metadata with the public key) nor a sign-in writes
 * app_metadata; only the service role does. From then on only a picture
 * the reader uploads to us stands for them, which a moderator can take
 * down again. Google's photo does not come back at their next sign-in.
 * The stores ask that reported content can be acted on (Apple 1.2).
 */
export const PICTURE_CLEARED = "picture_cleared_at";

type SignedIn = { user_metadata?: unknown; app_metadata?: unknown } | null | undefined;

/** Whether a moderator has taken this reader's picture down. */
export function pictureCleared(user: SignedIn): boolean {
  const app = (user?.app_metadata ?? {}) as Record<string, unknown>;
  return typeof app[PICTURE_CLEARED] === "string" && app[PICTURE_CLEARED] !== "";
}

/** The sign-in's picture this reader may still be shown with, or null. */
export function signInPicture(user: SignedIn): string | null {
  const meta = (user?.user_metadata ?? {}) as { avatar_url?: unknown };
  const url = typeof meta.avatar_url === "string" && meta.avatar_url ? meta.avatar_url : null;
  if (!url || !pictureCleared(user)) return url;
  // Taken down once: only a picture in our own bucket stands for them now.
  return avatarRef(url, publicPrefix(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", AVATAR_BUCKET)) ? url : null;
}
