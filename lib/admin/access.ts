import "server-only";
import { createClient } from "@/lib/supabase/server";

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

/** Returns the signed-in admin user, or null if the requester is not an admin. */
export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email) ? user : null;
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
