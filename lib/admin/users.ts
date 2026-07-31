import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Email lookups against auth.users.
 *
 * `public.profiles` deliberately has NO email column (id, display_name,
 * joined_at, updated_at only — see 20260518_profiles_bookmarks_annotations.sql).
 * Auth is the only source of truth for an address, and the service role reaches
 * it through auth.admin.listUsers, which pages rather than filters.
 *
 * Anything resolving an account by email must go through here. Querying
 * profiles.email fails at PostgREST, and callers that drop the error surface it
 * as "no such account", which is how the gift grant silently rejected every
 * valid address.
 */

const PER_PAGE = 200;
const MAX_PAGES = 50;

export type AuthUserLite = {
  id: string;
  email: string;
  name: string | null;
};

function displayName(user: { user_metadata?: unknown }): string | null {
  const md = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  return md.full_name ?? md.name ?? null;
}

/**
 * Walk auth.users applying `visit` to each page. Stops early when `visit`
 * returns false. Throws if a page errors, so callers decide whether a partial
 * walk is acceptable rather than silently treating it as "not found".
 */
async function walkUsers(
  admin: SupabaseClient,
  visit: (users: { id: string; email?: string; user_metadata?: unknown }[]) => boolean,
): Promise<void> {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw new Error(`auth.listUsers failed on page ${page}: ${error.message}`);
    const users = data?.users ?? [];
    if (!visit(users)) return;
    if (users.length < PER_PAGE) return; // last page
  }
}

/** Resolve an email to an account. Case-insensitive. Null when no account exists. */
export async function findUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<AuthUserLite | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  let hit: AuthUserLite | null = null;
  await walkUsers(admin, (users) => {
    const found = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (found) {
      hit = { id: found.id, email: found.email ?? target, name: displayName(found) };
      return false; // stop paging
    }
    return true;
  });
  return hit;
}

/** Reverse map for rendering lists: user id -> email, for the ids given. */
export async function emailsByUserId(
  admin: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const want = new Set(ids);
  if (want.size === 0) return out;

  await walkUsers(admin, (users) => {
    for (const u of users) {
      if (want.has(u.id) && u.email) {
        out.set(u.id, u.email);
        want.delete(u.id);
      }
    }
    return want.size > 0; // stop once every id is resolved
  });
  return out;
}
