import "server-only";

import type { User } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin/access";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { createClientFromRequest } from "@/lib/supabase/server";
import { isTestWeb } from "@/lib/testWeb";

import { campaignsOpening, type CampaignsOpening } from "./flags";

/**
 * The position this server answers by: the constant's (./flags.ts), with one
 * exception, which is the test web's.
 *
 * THE TEST WEB STANDS ONE STEP AHEAD OF THE BRANCH (2026-11-10). His word for
 * a test build is "as if it was public release": the build cut as the store
 * builds will be, at "testers", talking to a website that answers as the
 * main web will once he has opened campaigns. The constant cannot say both
 * at once, since one commit makes the website and the build. So where the
 * constant says "testers" and this server is the test web, it answers
 * "open", to every account there.
 *
 * What the test web is, is not this file's to say: the test web's own rules
 * say it (lib/testWeb/rules.ts, read through lib/testWeb/index.ts, isTestWeb;
 * the Admin chat's, docs/1.9-build/notes/test-web.md). A server is the test
 * web only with its flag, on its own database (by its address and by the
 * project its public key names), at an address that is not purifyapp.net,
 * with no live payment key; one that says it is the test web and breaks any
 * of these refuses to start, and isTestWeb() answers no for it.
 *
 * It lifts "testers" to "open" and nothing else. Closed stays closed on
 * every server: a branch that says closed has no campaigns on the test web
 * either. And it cannot reach the main web: a server on the main web's
 * database or at its address is not the test web, whatever its settings
 * say. So the main web opens by the one line in ./flags.ts, on his word, and
 * by nothing else. lib/campaigns/__tests__/testWeb.test.ts holds each of
 * these from this side, by what a campaign route answers.
 *
 * Two quiet places read the constant itself and do not follow this: the
 * Discover menu's row on a wide screen and the free plan's line that names
 * campaigns. They stay hidden on the test web's own pages and in a test
 * build, as they do in a store build until the build after campaigns open.
 */
export function serverOpening(): CampaignsOpening {
  const position = campaignsOpening();
  return position === "testers" && isTestWeb() ? "open" : position;
}

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
 * The position asked is this server's own (serverOpening, above): the
 * constant's, or "open" on the test web while the constant says "testers".
 *
 * Every campaign route asks here first and answers its own 404 on a no, the
 * same 404 a missing campaign gets, so a closed door and an empty room read
 * alike from outside.
 */
export type CampaignsCaller = { open: boolean; user: User | null };

export async function campaignsCaller(req: Request): Promise<CampaignsCaller> {
  const position = serverOpening();
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
