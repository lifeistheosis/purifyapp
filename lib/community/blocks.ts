import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * The auth uuids this caller has blocked, or [] when signed out.
 *
 * One implementation for every read that has to honour a block. It used to
 * live inside app/api/community/posts/route.ts alone, which is how the posts
 * feed came to hide a blocked author while the replies under every thread
 * went on showing them: a block that covered half of what the reader sees.
 * Found 2026-09-25 while writing the unblock screen, whose own copy would
 * otherwise have promised "you will stop seeing their posts and replies".
 *
 * Never throws and never fails the read: if the lookup breaks, the reader
 * sees an unfiltered list rather than an error page. That is the softer of
 * the two failures, and it is logged.
 *
 * The ids go into a WHERE clause and nowhere else. No caller may put one in a
 * response body; the public projections deliberately omit user_id.
 */
export async function blockedAuthorIds(
  req: Request,
  admin: ReturnType<typeof createAdminClient>,
): Promise<string[]> {
  try {
    const supa = await createClientFromRequest(req);
    const {
      data: { user },
    } = await supa.auth.getUser();
    if (!user) return [];
    const { data, error } = await admin
      .from("community_blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id)
      .limit(500);
    if (error) {
      console.warn("[community] block lookup failed", error.message);
      return [];
    }
    return (data ?? []).map((r) => r.blocked_id as string);
  } catch {
    return [];
  }
}

/**
 * Cache headers for a community read that may have been filtered for one
 * reader. A filtered list is that reader's list, so it must never be served
 * from a shared cache to the next caller. `withCors` sets Vary to "Origin"
 * and would otherwise overwrite the Authorization half.
 */
export function personalisedCacheHeaders(personalised: boolean): Record<string, string> {
  return {
    "Cache-Control": personalised ? "private, no-store" : "public, max-age=15",
    Vary: "Origin, Authorization",
  };
}
