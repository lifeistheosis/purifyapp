import "server-only";

import type { User } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin/access";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { createClientFromRequest } from "@/lib/supabase/server";

import { campaignsOpening } from "./flags";

/**
 * Whether campaigns are open for whoever sent this request, and who they
 * are (./flags.ts has the three positions):
 *
 *   closed    for nobody, and the account is not even looked up;
 *   testers   for the accounts the server names as admins, by the same list
 *             Testers mode asks about (app/api/admin/whoami): the email
 *             alone, with no sign-in code, because seeing campaigns early is
 *             no power. Moderating asks for the code as it always does
 *             (lib/community/adminStanding.ts);
 *   open      for everyone, signed in or not.
 *
 * Every campaign route asks here first and answers its own 404 on a no, the
 * same 404 a missing campaign gets, so a closed door and an empty room read
 * alike from outside.
 */
export type CampaignsCaller = { open: boolean; user: User | null };

export async function campaignsCaller(req: Request): Promise<CampaignsCaller> {
  const position = campaignsOpening();
  if (position === "closed") return { open: false, user: null };
  let user: User | null = null;
  try {
    const supabase = await createClientFromRequest(req);
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    // No session that can be read: a reader who is not signed in.
  }
  if (position === "open") return { open: true, user };
  return { open: Boolean(user && isAdminEmail(user.email)), user };
}

/**
 * The rework's columns are not there yet: its SQL has not run on this
 * database (docs/1.9-build/notes/campaigns-fable.md, 5.2). A route that
 * meets this answers 404, as a closed one does, and says so in the log: the
 * switch was moved before the SQL was run, which is the order the other way
 * round.
 */
export function reworkAbsent(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error || !isColumnAbsent(error)) return false;
  console.warn("[campaigns] the rework's columns are absent: its SQL has not run here", error.message);
  return true;
}
