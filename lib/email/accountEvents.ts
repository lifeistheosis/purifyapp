import "server-only";

import { after } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

import { sendEmailOnce } from "./ledger";
import { isNewAccount } from "./newAccount";
import { accountDeletedEmail, welcomeEmail, type EmailContent } from "./templates/account";

/**
 * Account emails that ride on a request someone is waiting for: signing in,
 * deleting an account. Both are scheduled with after(), so the reader gets
 * their redirect or their confirmation first and the mail provider's latency
 * is never theirs to sit through.
 */

function schedule(label: string, job: () => Promise<unknown>) {
  const run = () =>
    job().catch((e) => console.warn(`[email] ${label} threw: ${(e as Error).message}`));
  try {
    after(run);
  } catch {
    // after() throws outside a request scope (a script). Not reachable from
    // the routes that call this; kept so a script cannot crash on it.
    void run();
  }
}

function sendContent(
  key: string,
  kind: string,
  userId: string | null,
  to: string,
  content: EmailContent,
) {
  return sendEmailOnce(createAdminClient(), {
    dedupeKey: key,
    kind,
    userId,
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

/** Welcome a genuinely new account, once. A returning reader gets nothing. */
export function scheduleWelcome(user: { id: string; email?: string | null; created_at?: string | null }) {
  if (!user.email || !isNewAccount(user.created_at)) return;
  const to = user.email;
  schedule("welcome", () => sendContent(`welcome:${user.id}`, "welcome", user.id, to, welcomeEmail()));
}

/**
 * Confirm a deletion, to the address the account had.
 *
 * Call it only AFTER the delete succeeded: telling someone their account is
 * gone when it is not is the one thing this email must never do. user_id is
 * recorded as null because the auth row no longer exists for the ledger's
 * foreign key to point at; the old id lives on in the dedupe key.
 */
export function scheduleAccountDeleted(user: { id: string; email?: string | null }) {
  if (!user.email) return;
  const to = user.email;
  schedule("account deleted", () =>
    sendContent(`account_deleted:${user.id}`, "account_deleted", null, to, accountDeletedEmail()),
  );
}
