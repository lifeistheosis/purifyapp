import "server-only";

// FCM sender for Android reminder pushes (Firebase Cloud Messaging v1).
// Lazy-imports `firebase-admin` and reads a service account from env, so the
// cron can dry-run before any Firebase credentials exist.
//
// Env (server-only):
//   FCM_SERVICE_ACCOUNT_JSON  the Firebase service-account JSON file, as it is
//                             or base64 of it (lib/push/credentials.ts)

import { parseServiceAccount } from "../credentials";
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
    });
    return { ok: true };
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    const gone =
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token" ||
      code === "messaging/invalid-argument";
    return { ok: false, gone };
  }
}
