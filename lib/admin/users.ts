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

/**
 * Every account that has an email address, for a send that must reach
 * everyone, like a terms change.
 *
 * `complete` is false when the walk stopped at MAX_PAGES with a full last page,
 * meaning there are more accounts than this function will read. A caller
 * sending a legal notice must refuse on that rather than quietly reach the
 * first ten thousand and report success.
 */
export async function allAccountEmails(
  admin: SupabaseClient,
): Promise<{ accounts: { id: string; email: string }[]; complete: boolean }> {
  const accounts: { id: string; email: string }[] = [];
  let pages = 0;
  let lastPageFull = false;
  await walkUsers(admin, (users) => {
    pages += 1;
    lastPageFull = users.length === PER_PAGE;
    for (const u of users) if (u.email) accounts.push({ id: u.id, email: u.email });
    return true;
  });
  return { accounts, complete: !(pages >= MAX_PAGES && lastPageFull) };
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

export type SignInProvider = "google" | "apple" | "email" | "other";

/**
 * How an account signs in, for the Users tab's donut and its per-row pill.
 *
 * FROM app_metadata, NOT identities. GoTrue's admin list endpoint answers
 * `identities: null` for every user (probed 2026-09-19: 200 of 200 on the
 * first page), so reading identities put all 2,012 accounts under "Other" and
 * drew a 100% Other donut. `app_metadata.providers` is the list GoTrue keeps
 * on the user itself, and `app_metadata.provider` the one they signed up
 * with. identities is still read, last, for a user object that does carry it.
 *
 * Precedence is Google, then Apple, then email: someone who linked Google to
 * an email account is counted once, under the provider they sign in with in
 * one tap. That is the order the route has always used.
 */
export function signInProvider(user: { app_metadata?: unknown; identities?: unknown }): SignInProvider {
  const md = (user.app_metadata ?? {}) as { provider?: unknown; providers?: unknown };
  const seen = new Set<string>();
  if (Array.isArray(md.providers)) {
    for (const p of md.providers) if (typeof p === "string") seen.add(p);
  }
  if (typeof md.provider === "string") seen.add(md.provider);
  if (Array.isArray(user.identities)) {
    for (const i of user.identities) {
      const p = (i as { provider?: unknown } | null)?.provider;
      if (typeof p === "string") seen.add(p);
    }
  }
  if (seen.has("google")) return "google";
  if (seen.has("apple")) return "apple";
  if (seen.has("email")) return "email";
  return "other";
}

/** True when the account last signed in within `days` of `now`. */
export function signedInWithin(user: { last_sign_in_at?: string | null }, days: number, now: number): boolean {
  const t = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : NaN;
  return Number.isFinite(t) && now - t <= days * 86_400_000 && t <= now + 60_000;
}
