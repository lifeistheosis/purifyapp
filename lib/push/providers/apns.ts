import "server-only";

// APNs sender for iOS reminder pushes. Token-based auth with a .p8 key
// (no certificate rotation). Lazy-imports `apns2` and reads config from env,
// so the cron can run a dry-run before any Apple credentials exist.
//
// Env (all server-only):
//   APNS_KEY_P8      the .p8 auth-key file, as it is or base64 of it
//   APNS_KEY_ID      the 10-char key id
//   APNS_TEAM_ID     the 10-char Apple team id
//   APNS_BUNDLE_ID   the app bundle id (net.purifyapp.purify) = APNs topic
//   APNS_PRODUCTION  "true" → api.push.apple.com, else sandbox

import { parseP8 } from "../credentials";

export type SendResult = { ok: true } | { ok: false; gone: boolean };

let parsedKey: ReturnType<typeof parseP8> | undefined;

/**
 * The signing key, or null when APNS_KEY_P8 is absent or unreadable.
 *
 * Accepts the .p8 file as Apple hands it over, base64 of it, and the file
 * flattened onto one line by a dashboard (lib/push/credentials.ts). Same trap
 * as the service account: a value that cannot be read dry-runs instead of
 * failing mid-send once real devices are registered, and apnsProblem() says
 * which variable is wrong.
 */
function readSigningKey(): string | null {
  if (parsedKey === undefined) {
    parsedKey = parseP8(process.env.APNS_KEY_P8);
    if (!parsedKey.ok && process.env.APNS_KEY_P8) {
      console.error(`[push/apns] ${parsedKey.reason} iOS push is dry-running.`);
    }
  }
  return parsedKey.ok ? parsedKey.value : null;
}

/** Why iPhones cannot be sent to, or null when they can. Never a value. */
export function apnsProblem(): string | null {
  const unset = ["APNS_KEY_P8", "APNS_KEY_ID", "APNS_TEAM_ID", "APNS_BUNDLE_ID"].filter((k) => !process.env[k]);
  if (unset.length) return null; // deliveryGaps names unset variables itself
  readSigningKey();
  if (parsedKey && !parsedKey.ok) return parsedKey.reason;
  if (!/^[A-Z0-9]{10}$/.test(process.env.APNS_KEY_ID ?? "")) {
    return "APNS_KEY_ID should be the 10-character Key ID shown beside the key in Apple Developer.";
  }
  if (!/^[A-Z0-9]{10}$/.test(process.env.APNS_TEAM_ID ?? "")) {
    return "APNS_TEAM_ID should be the 10-character Team ID from Apple Developer, Membership.";
  }
  return null;
}

export function apnsConfigured(): boolean {
  return Boolean(
    readSigningKey() &&
      process.env.APNS_KEY_ID &&
      process.env.APNS_TEAM_ID &&
      process.env.APNS_BUNDLE_ID,
  );
}

type ApnsClientLike = {
  send: (n: unknown) => Promise<unknown>;
};

let clientPromise: Promise<ApnsClientLike> | null = null;

async function getClient(): Promise<ApnsClientLike> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { ApnsClient, Host } = await import("apns2");
      // Non-null because every caller reaches this through apnsConfigured().
      const signingKey = readSigningKey() as string;
      return new ApnsClient({
        team: process.env.APNS_TEAM_ID as string,
        keyId: process.env.APNS_KEY_ID as string,
        signingKey,
        defaultTopic: process.env.APNS_BUNDLE_ID as string,
        host:
          process.env.APNS_PRODUCTION === "true"
            ? Host.production
            : Host.development,
      }) as unknown as ApnsClientLike;
    })();
  }
  return clientPromise;
}

export async function sendApns(
  token: string,
  msg: { title: string; body: string; url: string },
): Promise<SendResult> {
  const client = await getClient();
  const { Notification } = await import("apns2");
  const note = new Notification(token, {
    alert: { title: msg.title, body: msg.body },
    topic: process.env.APNS_BUNDLE_ID as string,
    sound: "default",
    data: { url: msg.url },
  });
  try {
    await client.send(note);
    return { ok: true };
  } catch (e) {
    // Dead tokens: stop trying. BadDeviceToken / Unregistered /
    // DeviceTokenNotForTopic all mean the row should be pruned.
    const reason = (e as { reason?: string }).reason ?? "";
    const gone =
      reason === "BadDeviceToken" ||
      reason === "Unregistered" ||
      reason === "DeviceTokenNotForTopic";
    return { ok: false, gone };
  }
}
