import "server-only";

import type { User } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin/access";
import { aalOf, adminGate, secondStepRequired, verifiedFactorCount } from "@/lib/admin/secondStep";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Where an admin's account stands in Community (Fable's release check 1, M4;
 * Edgar's item 64, "the sign-in code over Community moderation too").
 *
 * WHY. Community gave an admin by email its powers on the email alone: the
 * moderation queue readers reach from any device (app/api/community/moderation),
 * staff standing past the spam filter and the posting limits (isStaff in
 * lib/community/trustServer.ts) and the Moderate button (app/api/community/mine).
 * The panel has asked for the admin's sign-in code since A4
 * (lib/admin/secondStep.ts), so a session lifted from a browser could not open
 * /admin but could still moderate.
 *
 * HOW. With the switch on, an admin's account counts as one in Community only
 * when the session passes the panel's own rule (adminGate === "ok"). Until it
 * does, the account is "held": no admin powers, and its badges count for
 * nothing either, so a Team badge on the same account is no way round the
 * code. Readers who moderate by badge are unchanged.
 *
 * THE SWITCH IS OFF until Edgar's word, and off means the email alone, exactly
 * as before. Turning it on is the one line below. The phone apps have no code
 * prompt (the code is typed in /admin on the website), so with it on the
 * admin moderates from the website once his code is added.
 *
 * Tested in lib/community/__tests__/adminStanding.test.ts.
 */
export const COMMUNITY_ADMIN_NEEDS_CODE = false;

export type AdminStanding = "admin" | "held" | "reader";

/** An account as Community's checks take one: with the request's standing, when the route has worked it out. */
export type CommunityUser = Pick<User, "id" | "email"> & { standing?: AdminStanding };

let needsCode = COMMUNITY_ADMIN_NEEDS_CODE;

/** Test seam: the switch as a case needs it. */
export function __setCommunityAdminNeedsCode(on: boolean) {
  needsCode = on;
}

/**
 * The account's standing. The email decides who is an admin at all, so a
 * standing can never make a reader one. With the switch on, an admin's
 * account counts only when the route has checked its session; one nobody
 * checked is held.
 */
export function standingOf(user: { email?: string | null; standing?: AdminStanding }): AdminStanding {
  if (!isAdminEmail(user.email)) return "reader";
  if (!needsCode) return "admin";
  return user.standing === "admin" ? "admin" : "held";
}

/** The access token the request carries: the apps' bearer header, else the website's cookie session. */
async function requestToken(req: Request, supabase: Awaited<ReturnType<typeof createClientFromRequest>>): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  if (/^bearer\s+/i.test(header)) return header.replace(/^bearer\s+/i, "").trim() || null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * The standing of the account signed in on this request. Only an admin's
 * account is looked at, and only with the switch on: for everyone else it
 * costs nothing. As in lib/admin/access.ts, the level is read from a token the
 * auth server has just accepted, which must be this same account's, and
 * whether the account has a code is read from the user the server returns,
 * never from the browser's copy. Never throws: anything that cannot be
 * checked is held.
 */
export async function requestStanding(req: Request, user: Pick<User, "id" | "email">): Promise<AdminStanding> {
  if (!isAdminEmail(user.email)) return "reader";
  if (!needsCode) return "admin";
  try {
    const supabase = await createClientFromRequest(req);
    const jwt = await requestToken(req, supabase);
    if (!jwt) return "held";
    const {
      data: { user: checked },
    } = await supabase.auth.getUser(jwt);
    if (!checked || checked.id !== user.id || !isAdminEmail(checked.email)) return "held";
    const gate = adminGate({ aal: aalOf(jwt), verifiedFactors: verifiedFactorCount(checked.factors), required: secondStepRequired() });
    return gate === "ok" ? "admin" : "held";
  } catch {
    return "held";
  }
}
