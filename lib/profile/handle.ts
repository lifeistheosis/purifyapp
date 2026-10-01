// A reader's public @handle: the one thing a profile link carries, so a
// profile can open from Community without the auth uuid ever leaving the
// server (supabase/migrations/20260802_revoke_public_user_id.sql).
//
// The rules here are the database's (20261001_profiles_badges.sql,
// profiles_handle_format): lowercase a-z, 0-9, underscore and dot, 3 to 24
// characters, no dot at either end and never two in a row. Kept in step by
// lib/profile/__tests__/handle.test.ts. Pure, so the API, the editor and the
// tests all apply the identical rule.

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 24;

/** How long after a change before the handle may change again. */
export const HANDLE_COOLDOWN_MS = 60 * 60 * 1000;

/** Names nobody may take: the team's own, and words that would read as official. */
export const RESERVED_HANDLES = new Set([
  "admin",
  "administrator",
  "api",
  "community",
  "eikon",
  "everyone",
  "help",
  "here",
  "me",
  "mod",
  "moderator",
  "null",
  "official",
  "owner",
  "plus",
  "premium",
  "pro",
  "profile",
  "purify",
  "purifyapp",
  "purifyteam",
  // Every reader without a name starts as reader plus a number; the bare
  // word would read as the house default.
  "reader",
  "root",
  "settings",
  "staff",
  "support",
  "system",
  "team",
  "undefined",
  "verified",
]);

export type HandleProblem = "length" | "chars" | "dots" | "reserved";

/** What a reader typed, as a handle: no @, no surrounding space, lowercase. */
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

/** Why a normalized handle cannot be used, or null when it can. */
export function handleProblem(handle: string): HandleProblem | null {
  if (handle.length < HANDLE_MIN || handle.length > HANDLE_MAX) return "length";
  if (!/^[a-z0-9_.]+$/.test(handle)) return "chars";
  if (handle.startsWith(".") || handle.endsWith(".") || handle.includes("..")) return "dots";
  if (RESERVED_HANDLES.has(handle)) return "reserved";
  return null;
}

/**
 * The starting handle for a display name, the same reduction the database's
 * profile_handle_base() makes: what survives of the name, cut to 18 so a
 * number can follow, or "reader" when too little survives (a name in Greek
 * or Cyrillic script reduces to nothing).
 */
export function handleBase(name: string | null | undefined): string {
  const reduced = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_.]+/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, 18)
    .replace(/^\.+|\.+$/g, "");
  if (reduced.length < HANDLE_MIN || RESERVED_HANDLES.has(reduced)) return "reader";
  return reduced;
}

/**
 * The name a first handle may be made from, or null.
 *
 * A name the reader chose (`chosen`: the display_name in their account
 * metadata, set at sign-up or in Account) always seeds it. Without one, a
 * profile carries the email's local part as its display name
 * (supabase/migrations/20260518_profiles_bookmarks_annotations.sql,
 * handle_new_user), which is how every Google sign-in starts. A handle made
 * from that would put half of the reader's email address in a public link, so
 * it seeds nothing and the reader starts as "reader" plus a number, free to
 * choose their own. profile_handle_seed() in 20261001_profiles_badges.sql is
 * the same rule for the backfill and the sign-up trigger.
 */
export function handleSeed(
  displayName: string | null | undefined,
  chosen: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const picked = (chosen ?? "").trim();
  if (picked) return picked;
  const n = (displayName ?? "").trim();
  if (!n) return null;
  const local = (email ?? "").split("@")[0].trim().toLowerCase();
  if (local && n.toLowerCase() === local) return null;
  return n;
}

/** Whether a reader who changed their handle at `changedAt` may change it now. */
export function handleChangeAllowed(changedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!changedAt) return true;
  const at = new Date(changedAt).getTime();
  if (!Number.isFinite(at)) return true;
  return now.getTime() - at >= HANDLE_COOLDOWN_MS;
}
