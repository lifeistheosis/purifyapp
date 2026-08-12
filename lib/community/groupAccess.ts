import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Is the caller a member of this parish group?
 *
 * Every community and campaign route reads with the service role, which
 * BYPASSES row level security. That is deliberate (the anon key cannot read
 * auth.users, and the feed must not carry user_id), but it means the row
 * policy protecting a private group thread never runs for these handlers.
 * The check has to be made explicitly, in the route, or it is not made at
 * all.
 *
 * The caller's own token is what proves identity here, never a user id from
 * the request body or the query string.
 *
 * Callers should answer a false with the same shape they use for "no such
 * thing", not with 403. A non-member must not be able to learn that a group
 * id is real by the difference between two error codes; group ids travel in
 * URLs and a URL is one guess away from another.
 */
export async function callerIsGroupMember(
  req: Request,
  admin: ReturnType<typeof createAdminClient>,
  groupId: string,
): Promise<boolean> {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await admin
    .from("prayer_campaign_group_members")
    .select("group_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  return !!data;
}
