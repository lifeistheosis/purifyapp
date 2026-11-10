import "server-only";

import { SITE_URL } from "@/lib/site";

// Is this server the test web?
//
// The owner's names (CLAUDE.md, "The test web and the main web"): the main
// web is purifyapp.net, deployed from main; the test web is a second, private
// website that runs the branch's work on its own test database, for test
// builds to talk to (docs/1.9-build/notes/test-web.md).
//
// A rule that applies on the test web alone asks here. The answer is yes only
// when all three hold:
//
//   the marker     PURIFY_TEST_WEB=1, set on the test web's own Render
//                  service and nowhere else. A server-side value, read when a
//                  request is answered: it is not a NEXT_PUBLIC name, so no
//                  app and no page's script ever carries it.
//   the address    The site's own address (lib/site.ts) is not the main
//                  web's: not purifyapp.net, not a name under it, and not the
//                  address Render gives the main service.
//   the database   The database is named, and is not the main web's project.
//
// The last two are not trust in the marker. They are what makes a mistake
// harmless: the marker pasted into the main web's settings changes nothing
// there, because the main web's address and its database both say no. The
// test web also refuses to start on the main web's database; this does not
// lean on that, and that does not lean on this.

/** The marker's name, and the one value that counts. */
export const TEST_WEB_MARKER = "PURIFY_TEST_WEB";

/** The main web's own addresses: its name, and the address Render gives its service (lib/site.ts, FALLBACK). */
export const MAIN_WEB_HOSTS: readonly string[] = ["purifyapp.net", "purifyapp.onrender.com"];

/** The main web's database: the Supabase project a merge to main runs migrations against (AGENTS.md). */
export const MAIN_DATABASE_REF = "avbqyvjgcrucjwevwixt";

/** A host is the main web's when it is one of its addresses or a name under one. */
export function isMainWebHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/\.$/, "");
  return MAIN_WEB_HOSTS.some((main) => h === main || h.endsWith(`.${main}`));
}

/**
 * Whether this server is the test web. Never yes on the main web, whatever
 * its settings say. Anything that cannot be read is a no.
 *
 * The settings and the address are parameters so that a test can ask about a
 * server it is not (lib/campaigns/__tests__/testWeb.test.ts).
 */
export function onTestWeb(env: Record<string, string | undefined> = process.env, site: string = SITE_URL): boolean {
  if ((env[TEST_WEB_MARKER] ?? "").trim() !== "1") return false;
  let host: string;
  try {
    host = new URL(site).hostname;
  } catch {
    return false;
  }
  if (!host || isMainWebHost(host)) return false;
  const database = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().toLowerCase();
  if (!database || database.includes(MAIN_DATABASE_REF)) return false;
  return true;
}
