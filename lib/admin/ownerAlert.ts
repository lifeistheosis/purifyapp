import "server-only";

import { adminEmails } from "@/lib/admin/access";
import { userIdByEmail } from "@/lib/admin/accountEmails";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendNativeOne,
  sendWebPushOne,
  type NativeToken,
  type PushPayload,
  type WebSub,
} from "@/lib/push/send";

/**
 * Tell the owner something happened, while the panel is closed.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * The activity bar in the admin shell only exists while the admin shell does.
 * It is derived from polls that only run in an open tab, so a sale at three in
 * the morning produced no bar, no sound and no record anywhere the owner would
 * look. The numbers moved and nothing said so. This is the half of "activity"
 * that survives the tab being shut.
 *
 * ── It reuses the reader push stack on purpose ──────────────────────────
 *
 * lib/push/send.ts already speaks Web Push, APNs and FCM, already prunes dead
 * subscriptions on 410, and already records last_sent_at. A second sender for
 * one recipient would be a second thing to keep working.
 *
 * ── IT CAN NEVER BREAK THE THING IT REPORTS ON ─────────────────────────
 *
 * Every path here swallows its own failure and returns a tally. The caller
 * that matters is the Stripe webhook: if this threw, or rejected, the webhook
 * would answer non-2xx, Stripe would retry, and a notification failure would
 * turn into a settlement problem. A missed alert is an inconvenience; a
 * payment stuck in retry because the alert failed is an outage. Call it with
 * `void` and never await it in a request's critical path.
 *
 * ── Not configured is not an error ──────────────────────────────────────
 *
 * VAPID keys and the APNs/FCM credentials may all be unset. sendWebPushOne and
 * sendNativeOne already report that as `skipped` rather than throwing, so an
 * unconfigured deployment quietly sends nothing.
 */

export type OwnerAlert = PushPayload & {
  /** Groups the notification client-side; see lib/push/send.ts. */
  kind?: string;
};

export type OwnerAlertResult = {
  sent: number;
  failed: number;
  /** No admin has ever subscribed a device, so there was nobody to tell. */
  noRecipients: boolean;
};

/**
 * The auth ids behind ADMIN_EMAILS.
 *
 * Resolved per call rather than cached: the list is an env var that changes on
 * deploy, and this runs at most a handful of times a day.
 */
async function ownerUserIds(): Promise<string[]> {
  const emails = adminEmails();
  if (emails.length === 0) return [];
  const ids = await Promise.all(
    emails.map(async (e) => {
      try {
        return await userIdByEmail(e);
      } catch {
        // One unresolvable address must not lose the others.
        return null;
      }
    }),
  );
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

export async function notifyOwner(alert: OwnerAlert): Promise<OwnerAlertResult> {
  const empty: OwnerAlertResult = { sent: 0, failed: 0, noRecipients: true };
  try {
    const ids = await ownerUserIds();
    if (ids.length === 0) return empty;

    const supa = createAdminClient();
    const [webRes, nativeRes] = await Promise.all([
      supa
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .in("user_id", ids),
      supa
        .from("device_push_tokens")
        .select("token, platform")
        .in("user_id", ids),
    ]);

    const subs = (webRes.data ?? []) as WebSub[];
    const tokens = (nativeRes.data ?? []) as NativeToken[];
    if (subs.length === 0 && tokens.length === 0) return empty;

    let sent = 0;
    let failed = 0;
    const tally = (ok: boolean) => (ok ? (sent += 1) : (failed += 1));

    await Promise.all([
      ...subs.map(async (s) => {
        try {
          tally((await sendWebPushOne(supa, s, alert)).ok);
        } catch {
          failed += 1;
        }
      }),
      ...tokens.map(async (t) => {
        try {
          const r = await sendNativeOne(supa, t, alert);
          // `skipped` is "this transport is not configured", which is not a
          // failure worth counting: it would make an unconfigured deployment
          // look permanently broken.
          if (!r.skipped) tally(r.ok);
        } catch {
          failed += 1;
        }
      }),
    ]);

    return { sent, failed, noRecipients: false };
  } catch (e) {
    // Logged, never thrown. See the header.
    console.warn("[owner alert] failed", e);
    return { sent: 0, failed: 1, noRecipients: false };
  }
}

/** Money, formatted the way the owner reads it on the panel. */
function money(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    // An unknown currency code from a webhook must not break the message.
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/**
 * A sale settled.
 *
 * NO CUSTOMER DETAIL IN THE BODY. A push notification renders on a lock screen
 * in whatever room the phone is in, so it carries the amount and nothing that
 * identifies the buyer. The order page behind the link has all of it, behind
 * the admin gate where it belongs.
 */
export function saleAlert(totalCents: number, currency: string): OwnerAlert {
  return {
    title: "Purify: a sale",
    body: `${money(totalCents, currency)} just came in.`,
    url: "/admin#orders",
    kind: "owner-sale",
  };
}
