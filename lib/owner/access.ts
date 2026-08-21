import "server-only";
import { getAdminUser, adminEmails } from "@/lib/admin/access";

// The owner dashboard's gate, deliberately its own function rather than a
// reuse of getAdminUser.
//
// Today it resolves to the same person, and a single shared gate would work.
// The reason it is separate anyway is the shape of what sits behind it: the
// operational panel shows what happened, and this shows revenue, projections
// and market strategy. The first is something a future moderator could
// reasonably see; the second is not. Splitting the check now costs one file
// and means adding a moderator later is an env var rather than an audit of
// every page to work out which half of the admin they should lose.
//
// OWNER_EMAILS falls back to ADMIN_EMAILS when unset, so a deploy that has not
// set it yet does not lock the owner out of his own dashboard. Set it
// explicitly the moment a second person gets an admin address: from then on
// the fallback is the thing standing between a moderator and the P&L.

/** Comma-separated allowlist. Falls back to ADMIN_EMAILS when unset. */
export function ownerEmails(): string[] {
  const explicit = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return explicit.length ? explicit : adminEmails();
}

export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return ownerEmails().includes(email.toLowerCase());
}

/**
 * The signed-in owner, or null.
 *
 * Layered on the admin gate rather than beside it: being an owner requires
 * being an admin first, so a change to how admins authenticate cannot leave a
 * second, weaker door open onto the more sensitive surface.
 */
export async function getOwnerUser() {
  const admin = await getAdminUser();
  if (!admin) return null;
  return isOwnerEmail(admin.email) ? admin : null;
}

/** True when OWNER_EMAILS is doing real work rather than borrowing the admin list. */
export function ownerListIsExplicit(): boolean {
  return (process.env.OWNER_EMAILS ?? "").trim().length > 0;
}
