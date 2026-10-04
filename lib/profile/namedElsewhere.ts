import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Whether any OTHER profile names this file in `column`.
 *
 * The last word on a picture whose path was never recorded for its reader: a
 * file their own row names is theirs to delete only while nobody else's row
 * shows it. Matched on the path, not the whole address, so the same file
 * under another spelling of the host still counts. Not knowing is a yes: a
 * file goes only on a clear no.
 */
export async function namedByAnotherProfile(
  admin: SupabaseClient,
  column: "avatar_url" | "banner_url",
  path: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await admin.from("profiles").select("id").like(column, `%/${path}`).neq("id", userId).limit(1);
  if (error) console.warn("[profile] old picture kept, could not ask who else shows it", column, error.message);
  return Boolean(error) || (data ?? []).length > 0;
}
