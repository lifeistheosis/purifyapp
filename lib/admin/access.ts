import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { aalOf, adminGate, secondStepRequired, verifiedFactorCount, type AdminGate } from "./secondStep";

/** Comma-separated allowlist of admin emails, from the ADMIN_EMAILS env var. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/**
 * Where the requester stands with the admin: not an admin at all ("none"), or
 * an admin who may open the panel ("ok"), must type their sign-in code first
 * ("verify"), or must add the code app first ("enroll"). The rule is
 * lib/admin/secondStep.ts (admin item A4).
 *
 * The access token is the session's own, and it is checked by the auth
 * server (getUser with that token) before its level is read from it; whether
 * the account has a factor is read from the user the server returns. Neither
 * is taken from the copy of the user in the browser's cookie.
 */
export async function adminAccess(): Promise<{ state: "none" } | { state: AdminGate; user: User }> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const jwt = session?.access_token;
  if (!jwt) return { state: "none" };
  const {
    data: { user },
  } = await supabase.auth.getUser(jwt);
  if (!user || !isAdminEmail(user.email)) return { state: "none" };
  return {
    state: adminGate({ aal: aalOf(jwt), verifiedFactors: verifiedFactorCount(user.factors), required: secondStepRequired() }),
    user,
  };
}

/**
 * Returns the signed-in admin user, or null if the requester is not an admin,
 * or is one who has not yet typed the sign-in code their account requires.
 * Every admin and owner route goes through here, so the second step guards
 * them all at once.
 */
export async function getAdminUser(): Promise<User | null> {
  const access = await adminAccess();
  return access.state === "ok" ? access.user : null;
}

/**
 * Gate for the diagnostic admin routes (identities-debug, site-debug,
 * geo-debug). These leak internal state and shouldn't be reachable in
 * prod unless the operator explicitly opts in by setting
 * ADMIN_DEBUG_ENABLED=1 alongside the email allowlist.
 */
export function adminDebugEnabled(): boolean {
  const v = (process.env.ADMIN_DEBUG_ENABLED ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
