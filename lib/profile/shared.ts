import "server-only";

import { communityEnabled } from "@/lib/community/flags";
import { handleProblem, normalizeHandle } from "@/lib/profile/handle";
import type { PublicProfile } from "@/lib/profile/publicProfile";
import { buildProfile, loadProfileRow } from "@/lib/profile/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * A profile for the shareable page and its link preview (app/(app)/u/[handle]),
 * the same fixed projection the Community API serves, or null.
 */
export async function sharedProfile(raw: string): Promise<PublicProfile | null> {
  if (!communityEnabled()) return null;
  const handle = normalizeHandle(decodeURIComponent(raw));
  const problem = handleProblem(handle);
  if (problem && problem !== "reserved") return null;
  const admin = createAdminClient();
  const row = await loadProfileRow(admin, { handle });
  if (!row || row === "unavailable") return null;
  const { profile } = await buildProfile(admin, row, { posts: false });
  return profile;
}
