import "server-only";

// APNs sender for iOS reminder pushes. Token-based auth with a .p8 key
// (no certificate rotation). Lazy-imports `apns2` and reads config from env,
// so the cron can run a dry-run before any Apple credentials exist.
//
// Env (all server-only):
//   APNS_KEY_P8      base64 of the .p8 auth-key file contents
//   APNS_KEY_ID      the 10-char key id
//   APNS_TEAM_ID     the 10-char Apple team id
//   APNS_BUNDLE_ID   the app bundle id (net.purifyapp.purify) = APNs topic
//   APNS_PRODUCTION  "true" → api.push.apple.com, else sandbox

export type SendResult = { ok: true } | { ok: false; gone: boolean };

/**
 * The signing key, or null when APNS_KEY_P8 is absent or is not really the
 * base64 of a .p8 file.
 *
 * Same trap as FCM_SERVICE_ACCOUNT_JSON, which took the push-deliver cron down
 * in production on 2026-08-07: `Buffer.from(x, "base64")` never throws, it just
 * drops characters it does not recognise, so a wrong value decodes to garbage
 * and the failure surfaces later and somewhere else. Checking for the PEM
 * header here means a bad key dry-runs, like a missing one, instead of failing
 * mid-send once real devices are registered.
 */
function readSigningKey(): string | null {
  const raw = process.env.APNS_KEY_P8;
  if (!raw) return null;
  const decoded = Buffer.from(raw, "base64").toString("utf8");
  if (!decoded.includes("BEGIN PRIVATE KEY")) {
    console.error(
      "[push/apns] APNS_KEY_P8 is set but does not decode to a PEM private key, so iOS push is dry-running. It must be base64 of the .p8 file's contents.",
    );
    return null;
  }
  return decoded;
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
