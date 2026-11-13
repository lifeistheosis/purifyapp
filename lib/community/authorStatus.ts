import type { SupabaseClient } from "@supabase/supabase-js";

import { censorName } from "@/lib/moderation/server";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";

/**
 * The writers in a feed or a thread as their public profiles give them now,
 * by @handle: each one's status line and the name they go by. None for a
 * private profile, the rule of buildProfile (lib/profile/server.ts). The feed
 * hands both to the profile card a name opens (ProfileSeed), so the card draws
 * them from its first frame.
 *
 *   - The status line: arriving with the profile, it pushed everything under
 *     it down at once (Updates 25's walk, the profile card's jumps).
 *   - The name: a post keeps the name its writer had when posting
 *     (author_name), and the card shows the profile's name now. So a writer
 *     who has changed theirs had the card's heading change under the finger
 *     when the profile came: ivan.rizevski's "IvanTheHumbleSinner" moved 62px
 *     sideways (Updates 30's walk, 2026-11-13). The arbiter's call that day:
 *     the feed shows the writer's current name wherever the profile is
 *     readable, and a private profile keeps the post's own.
 *
 * The name is the profile's display_name, which a change of name writes with
 * the account's (components/profile/ProfileHero.tsx), with a listed word
 * masked and cut to 80 as identity() gives it to the card. A profile with no
 * name of its own leaves the post's.
 *
 * One read of profiles for the whole list. Before the profile columns exist,
 * or on any error, nobody has either: the post's own name stands, and the
 * card draws the line when the profile comes, as it did.
 */
export type AuthorsNow = {
  statuses: ReadonlyMap<string, string>;
  names: ReadonlyMap<string, string>;
};

/** Nobody's profile read: every post keeps its own name and draws no status. */
export const NO_AUTHORS: AuthorsNow = { statuses: new Map(), names: new Map() };

export async function authorsNow(admin: SupabaseClient, rows: readonly Record<string, unknown>[]): Promise<AuthorsNow> {
  const handles = [...new Set(rows.map((r) => r.author_handle).filter((h): h is string => typeof h === "string" && h.length > 0))];
  const statuses = new Map<string, string>();
  const names = new Map<string, string>();
  if (handles.length === 0) return { statuses, names };
  const read = (cols: string) => admin.from("profiles").select(cols).in("handle", handles);
  let { data, error } = await read("handle, display_name, status_text, profile_private");
  // Before profile_private, every profile is public (buildProfile reads it the same way).
  if (error && isColumnAbsent(error)) ({ data, error } = await read("handle, display_name, status_text"));
  if (error || !data) return { statuses, names };
  for (const row of data as unknown as { handle?: unknown; display_name?: unknown; status_text?: unknown; profile_private?: unknown }[]) {
    if (row.profile_private === true || typeof row.handle !== "string") continue;
    if (typeof row.status_text === "string" && row.status_text) statuses.set(row.handle, row.status_text);
    const name = typeof row.display_name === "string" ? row.display_name.trim() : "";
    // The mask's list is read once and kept (lib/moderation/server.ts), so this is no read per writer.
    if (name) names.set(row.handle, (await censorName(admin, name)).slice(0, 80));
  }
  return { statuses, names };
}

/** A row's writer's status line, or null. */
export function statusOf(row: Record<string, unknown>, authors: AuthorsNow): string | null {
  return typeof row.author_handle === "string" ? (authors.statuses.get(row.author_handle) ?? null) : null;
}

/** The name a row's writer goes by now, where their profile is readable; else the row's own. */
export function nameOf(row: Record<string, unknown>, authors: AuthorsNow): unknown {
  return (typeof row.author_handle === "string" && authors.names.get(row.author_handle)) || row.author_name;
}
