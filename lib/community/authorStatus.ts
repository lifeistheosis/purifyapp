import type { SupabaseClient } from "@supabase/supabase-js";

import { isColumnAbsent } from "@/lib/supabase/columnAbsent";

/**
 * The status lines of the writers in a feed or a thread, by @handle, as their
 * public profiles give them: none for a private profile, the rule of
 * buildProfile (lib/profile/server.ts). The feed hands each writer's status to
 * the profile card it opens (ProfileSeed), so the card draws its status line
 * from its first frame: arriving with the profile, the line pushed everything
 * under it down at once (Updates 25's walk, the profile card's jumps).
 *
 * One read of profiles for the whole list. Before the profile columns exist,
 * or on any error, nobody has one: the card then draws the line when the
 * profile comes, as it did.
 */
export async function authorStatuses(
  admin: SupabaseClient,
  rows: readonly Record<string, unknown>[],
): Promise<Map<string, string>> {
  const handles = [...new Set(rows.map((r) => r.author_handle).filter((h): h is string => typeof h === "string" && h.length > 0))];
  const out = new Map<string, string>();
  if (handles.length === 0) return out;
  const read = (cols: string) => admin.from("profiles").select(cols).in("handle", handles);
  let { data, error } = await read("handle, status_text, profile_private");
  // Before profile_private, every profile is public (buildProfile reads it the same way).
  if (error && isColumnAbsent(error)) ({ data, error } = await read("handle, status_text"));
  if (error || !data) return out;
  for (const row of data as unknown as { handle?: unknown; status_text?: unknown; profile_private?: unknown }[]) {
    if (row.profile_private === true || typeof row.handle !== "string") continue;
    if (typeof row.status_text === "string" && row.status_text) out.set(row.handle, row.status_text);
  }
  return out;
}

/** A row's writer's status line, or null. */
export function statusOf(row: Record<string, unknown>, statuses: ReadonlyMap<string, string>): string | null {
  return typeof row.author_handle === "string" ? (statuses.get(row.author_handle) ?? null) : null;
}
