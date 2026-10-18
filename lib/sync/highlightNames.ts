"use client";

import { localHighlightNames, writeHighlightNames } from "@/lib/bible/highlightColors";
import { readAccountNames, reconcileNames } from "@/lib/bible/highlightPalette";
import { canSync } from "@/lib/entitlements/client";
import { createClient } from "@/lib/supabase/client";
import { readLocalSessionUser } from "@/lib/supabase/localSession";

/**
 * What a reader's highlight colours mean, kept with their account (1.7.1), so
 * a second phone shows "Promises" where the first one does.
 *
 * In user_metadata.purify_highlights, beside the onboarding answers
 * (user_metadata.purify_space, lib/onboarding/accountSync.ts): the place the
 * app already keeps a reader's preferences without a table, so this needs no
 * migration. { names: { [colour id]: name }, at: ISO }.
 *
 * The copy changed last wins (lib/bible/highlightPalette.ts, reconcileNames).
 * The account's copy is read from the session the device already holds
 * (lib/supabase/localSession.ts), with no request and no auth lock; it is as
 * fresh as the session, which the proxy renews on every page. Writing it is
 * supabase.auth.updateUser, which merges one key of the metadata and leaves
 * the others. Names travel as the highlights do: only where the highlights
 * sync (canSync, the Purify Plus layer), and silently, since a name is a
 * garnish and nothing may wait on it.
 */

const KEY = "purify_highlights";

function accountCopy() {
  const user = readLocalSessionUser();
  if (!user) return { signedIn: false, account: null };
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return { signedIn: true, account: readAccountNames(meta[KEY]) };
}

/** Send this device's names to the account. */
export async function pushHighlightNames(): Promise<void> {
  try {
    if (!accountCopy().signedIn) return;
    if (!(await canSync())) return;
    const local = localHighlightNames();
    if (!local.at) return;
    await createClient().auth.updateUser({ data: { [KEY]: { names: local.names, at: local.at } } });
  } catch {
    /* kept on the device */
  }
}

/**
 * On a page's first load for a signed-in reader (components/profile/SyncBridge):
 * take the account's names when they are newer, send this device's when they
 * are.
 */
export async function syncHighlightNames(): Promise<void> {
  try {
    const { signedIn, account } = accountCopy();
    if (!signedIn) return;
    const decision = reconcileNames(localHighlightNames(), account);
    if (decision === "keep") return;
    if (!(await canSync())) return;
    if (decision === "take" && account) writeHighlightNames(account.names, { at: account.at, source: "sync" });
    else if (decision === "send") await pushHighlightNames();
  } catch {
    /* kept on the device */
  }
}
