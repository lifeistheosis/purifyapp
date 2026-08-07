import "server-only";

// FCM sender for Android reminder pushes (Firebase Cloud Messaging v1).
// Lazy-imports `firebase-admin` and reads a service account from env, so the
// cron can dry-run before any Firebase credentials exist.
//
// Env (server-only):
//   FCM_SERVICE_ACCOUNT_JSON  base64 of the Firebase service-account JSON

import type { SendResult } from "./apns";

export type { SendResult };

// Decoded once. `undefined` means "not looked at yet", `null` means "looked at
// and not usable".
let serviceAccount: Record<string, unknown> | null | undefined;

/**
 * The service account, or null when the env var is absent OR set to something
 * that cannot be used.
 *
 * The second case is not hypothetical. `Buffer.from(x, "base64")` never throws:
 * it silently drops characters it does not recognise, so a value that is not
 * really base64 decodes to an empty string and `JSON.parse("")` throws
 * "Unexpected end of JSON input" from inside the sender. That took down the
 * whole push-deliver cron in production on 2026-08-07, including Web Push,
 * which has nothing to do with Firebase: the route answered 500 and every
 * prayer reminder for that hour went nowhere.
 *
 * Treating a broken credential as "not configured" restores what this module
 * already promised at the top of the file, that the cron can dry-run before
 * any Firebase credentials exist. A malformed one is not more configured than
 * a missing one.
 */
function readServiceAccount(): Record<string, unknown> | null {
  if (serviceAccount !== undefined) return serviceAccount;

  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    serviceAccount = null;
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64").toString("utf8"),
    ) as Record<string, unknown>;
    // cert() needs exactly these three, and fails at initializeApp() without
    // them, which is the throw this function exists to prevent.
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      console.error(
        "[push/fcm] FCM_SERVICE_ACCOUNT_JSON decoded but is missing project_id, client_email or private_key. Android push is dry-running.",
      );
      serviceAccount = null;
      return null;
    }
    serviceAccount = parsed;
  } catch {
    console.error(
      "[push/fcm] FCM_SERVICE_ACCOUNT_JSON is set but is not base64-encoded JSON, so Android push is dry-running. Re-paste it as base64 of the service-account file, not the file itself.",
    );
    serviceAccount = null;
  }
  return serviceAccount;
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
