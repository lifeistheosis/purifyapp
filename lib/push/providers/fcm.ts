import "server-only";

// FCM sender for Android reminder pushes (Firebase Cloud Messaging v1).
// Lazy-imports `firebase-admin` and reads a service account from env, so the
// cron can dry-run before any Firebase credentials exist.
//
// Env (server-only):
//   FCM_SERVICE_ACCOUNT_JSON  base64 of the Firebase service-account JSON

import type { SendResult } from "./apns";

export type { SendResult };

export function fcmConfigured(): boolean {
  return Boolean(process.env.FCM_SERVICE_ACCOUNT_JSON);
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
      const json = JSON.parse(
        Buffer.from(
          process.env.FCM_SERVICE_ACCOUNT_JSON as string,
          "base64",
        ).toString("utf8"),
      );
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
