import "server-only";

// FCM sender for Android reminder pushes (Firebase Cloud Messaging v1).
// Lazy-imports `firebase-admin` and reads a service account from env, so the
// cron can dry-run before any Firebase credentials exist.
//
// Env (server-only):
//   FCM_SERVICE_ACCOUNT_JSON  the Firebase service-account JSON file, as it is
//                             or base64 of it (lib/push/credentials.ts)

import { parseServiceAccount } from "../credentials";
import { fcmTokenGone, reasonOf } from "../failures";
import type { SendResult } from "./apns";

export type { SendResult };

// Read once. `undefined` means "not looked at yet".
let parsed: ReturnType<typeof parseServiceAccount> | undefined;

/**
 * The service account, or null when FCM_SERVICE_ACCOUNT_JSON is absent or
 * cannot be read.
 *
 * lib/push/credentials.ts does the reading, and accepts the downloaded file as
 * it is as well as base64 of it: requiring base64 is what left 175 Android
 * devices without a single push on 2026-09-19, because the value on Render was
 * the file itself. A value that still cannot be read dry-runs rather than
 * throwing mid-send, which is the promise at the top of this file, and
 * fcmProblem() says why in words the admin panel can show.
 */
function readServiceAccount(): Record<string, unknown> | null {
  if (parsed === undefined) {
    parsed = parseServiceAccount(process.env.FCM_SERVICE_ACCOUNT_JSON);
    if (!parsed.ok && process.env.FCM_SERVICE_ACCOUNT_JSON) {
      console.error(`[push/fcm] ${parsed.reason} Android push is dry-running.`);
    }
  }
  return parsed.ok ? parsed.value : null;
}

/** Why Android cannot send, or null when it can. Never contains a value. */
export function fcmProblem(): string | null {
  readServiceAccount();
  return parsed && !parsed.ok ? parsed.reason : null;
}

export function fcmConfigured(): boolean {
  return readServiceAccount() !== null;
}

type MessagingLike = {
  send: (msg: unknown) => Promise<string>;
};

let messagingPromise: Promise<MessagingLike> | null = null;

async function getMessaging(): Promise<MessagingLike> {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      const { initializeApp, cert, getApps, getApp } = await import(
        "firebase-admin/app"
      );
      const { getMessaging } = await import("firebase-admin/messaging");
      // Non-null because every caller reaches this through fcmConfigured().
      const json = readServiceAccount() as Record<string, unknown>;
      const app = getApps().length
        ? getApp()
        : initializeApp({ credential: cert(json) });
      return getMessaging(app) as unknown as MessagingLike;
    })();
  }
  return messagingPromise;
}

/**
 * The Android notification channel every push is posted to.
 *
 * MainActivity.java creates it at high importance, which is what lets a push
 * appear as a banner, and the manifest names it as Firebase's default. Before
 * it existed Firebase fell back to its own "Miscellaneous" channel at default
 * importance: no banner, only a small icon in the status bar, so a broadcast
 * Firebase had accepted for 157 phones (2026-09-27) looked to a reader like
 * nothing had arrived. A build without the channel ignores the id and uses
 * that fallback, so naming it here is safe before the new build is out.
 */
export const ANDROID_CHANNEL_ID = "purify";

/**
 * True once this process has delivered at least one push to Android.
 *
 * invalid-argument is Firebase's answer to a dead token AND to a message it
 * cannot accept, so a mistake in the message itself would read as every
 * token being dead. Tokens are only deleted once a delivery has proved the
 * message is sound; same rule as the APNs sender.
 */
let proven = false;

export async function sendFcm(
  token: string,
  msg: { title: string; body: string; url: string },
): Promise<SendResult> {
  const messaging = await getMessaging();
  try {
    await messaging.send({
      token,
      notification: { title: msg.title, body: msg.body },
      data: { url: msg.url },
      android: {
        priority: "high",
        notification: {
          channelId: ANDROID_CHANNEL_ID,
          sound: "default",
          // Android 7 and older have no channels and read this instead.
          priority: "high",
        },
      },
    });
    proven = true;
    return { ok: true };
  } catch (e) {
    const reason = reasonOf(e);
    return { ok: false, gone: proven && fcmTokenGone(reason), reason };
  }
}
