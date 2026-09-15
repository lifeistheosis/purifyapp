import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { emailByUserId } from "@/lib/admin/accountEmails";
import { notifyOwner } from "@/lib/admin/ownerAlert";
import { sendEmailOnce } from "@/lib/email/ledger";
import { paymentFailedEmail, plusActiveEmail, type BillingStore } from "@/lib/email/templates/account";

import { lifecycleDedupeKey, type LifecycleEffects } from "./lifecycleEvents";

/**
 * Apply what a RevenueCat event means beyond plus_until: the two state columns,
 * then the email it owes.
 *
 * Called by the webhook AFTER the entitlement write succeeded. Nothing in here
 * may change the webhook's answer. RevenueCat retries on a 5xx, and a retry
 * re-runs the entitlement write, which is harmless, but it must never be caused
 * by an email: a slow or failing Resend call is not a reason to replay a
 * purchase. So the column write is best effort with a log, and the email is
 * sent by the caller inside after(), once the response is already gone.
 */

export async function writeLifecycleState(
  admin: SupabaseClient,
  userId: string,
  effects: LifecycleEffects,
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (effects.autoRenew !== undefined) patch.auto_renew = effects.autoRenew;
  if (effects.billingIssueAt !== undefined) patch.billing_issue_at = effects.billingIssueAt;
  if (Object.keys(patch).length === 0) return;

  const { error } = await admin.from("entitlements").update(patch).eq("user_id", userId);
  if (error) {
    // Most likely 20260914_email_sends.sql is not applied, so the columns do
    // not exist yet. Access is already correct; only the extra facts are lost.
    console.warn(`[revenuecat] lifecycle state not written for ${userId}: ${error.message}`);
  }
}

export async function sendLifecycleEmail(
  admin: SupabaseClient,
  userId: string,
  effects: LifecycleEffects,
  store: string,
): Promise<void> {
  const owed = effects.email;
  if (!owed) return;

  const to = await emailByUserId(userId).catch(() => null);
  if (!to) {
    console.warn(`[revenuecat] no address for ${userId}; ${owed.kind} not sent`);
    return;
  }

  const content =
    owed.kind === "payment_failed" ? paymentFailedEmail(store as BillingStore) : plusActiveEmail();

  const result = await sendEmailOnce(admin, {
    dedupeKey: lifecycleDedupeKey(userId, owed),
    kind: owed.kind,
    userId,
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
  console.info(`[revenuecat] ${owed.kind} for ${userId}: ${result.status}`);

  // The owner hears about a failed renewal too, digit-free for the push bar.
  // Only on a real first send, so a retried webhook does not ping twice.
  if (owed.kind === "payment_failed" && result.status === "sent") {
    await notifyOwner({
      kind: "billing-issue",
      title: "A renewal did not go through",
      body: "A member's payment failed. They have been emailed how to fix it.",
      url: "/admin?tab=subscriptions",
    }).catch(() => undefined);
  }
}
