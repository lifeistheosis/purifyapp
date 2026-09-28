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
//   APNS_PRODUCTION  which of Apple's servers to ask FIRST: "false" starts
//                    with the sandbox, anything else with production. The
//                    other server is always asked before a token is judged
//                    dead (see sendApns).

import { parseP8 } from "../credentials";
import { apnsVerdict, reasonOf } from "../failures";

export type SendResult = { ok: true } | { ok: false; gone: boolean; reason: string };

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

type Server = "production" | "development";

/**
 * Production first unless told otherwise. Every build a reader can install
 * (App Store, TestFlight) registers with production, and the old default,
 * the sandbox, is the one that would have answered BadDeviceToken for all
 * 135 of them.
 */
function serverOrder(): Server[] {
  return process.env.APNS_PRODUCTION?.trim().toLowerCase() === "false"
    ? ["development", "production"]
    : ["production", "development"];
}

const clients: Partial<Record<Server, Promise<ApnsClientLike>>> = {};

async function getClient(server: Server): Promise<ApnsClientLike> {
  let client = clients[server];
  if (!client) {
    client = (async () => {
      const { ApnsClient, Host } = await import("apns2");
      // Non-null because every caller reaches this through apnsConfigured().
      const signingKey = readSigningKey() as string;
      return new ApnsClient({
        team: process.env.APNS_TEAM_ID as string,
        keyId: process.env.APNS_KEY_ID as string,
        signingKey,
        defaultTopic: process.env.APNS_BUNDLE_ID as string,
        host: server === "production" ? Host.production : Host.development,
      }) as unknown as ApnsClientLike;
    })();
    clients[server] = client;
  }
  return client;
}

/**
 * True once this process has delivered at least one push to an iPhone.
 *
 * Until then a "gone" answer is not trusted enough to delete a token. A wrong
 * APNS_BUNDLE_ID makes every phone answer DeviceTokenNotForTopic, and asking
 * the wrong server makes every phone answer BadDeviceToken: either would have
 * deleted all 135 registered iPhones in one run, and a deleted token only
 * comes back when its reader turns reminders on again. One real delivery
 * proves the settings, and pruning starts from there. A token skipped before
 * that is judged on the next run.
 */
let proven = false;

/**
 * Apple's reason, or InvalidSigningKey when the key failed before anything
 * reached Apple: fast-jwt, which apns2 signs with, throws FAST_JWT_* codes
 * for a key it cannot use.
 */
function apnsReason(e: unknown): string {
  const reason = reasonOf(e);
  return reason.startsWith("FAST_JWT") ? "InvalidSigningKey" : reason;
}

export async function sendApns(
  token: string,
  msg: { title: string; body: string; url: string },
): Promise<SendResult> {
  const { Notification } = await import("apns2");
  const note = new Notification(token, {
    alert: { title: msg.title, body: msg.body },
    topic: process.env.APNS_BUNDLE_ID as string,
    sound: "default",
    data: { url: msg.url },
  });
  let reason = "unknown";
  for (const server of serverOrder()) {
    try {
      const client = await getClient(server);
      await client.send(note);
      proven = true;
      return { ok: true };
    } catch (e) {
      reason = apnsReason(e);
      if (apnsVerdict(reason) !== "other-host") break;
    }
  }
  const verdict = apnsVerdict(reason);
  // BadDeviceToken after both servers is a token neither knows.
  const gone = proven && (verdict === "gone" || verdict === "other-host");
  return { ok: false, gone, reason };
}

export type ApnsCheck = { ok: boolean; reason: string };

const CHECK_TTL_MS = 10 * 60_000;
let lastCheck: { at: number; result: ApnsCheck } | null = null;

/**
 * Does Apple accept the key, asked without reaching anyone.
 *
 * Sends to a token that cannot exist. Apple checks the key before the token,
 * so BadDeviceToken is the pass: the key, APNS_KEY_ID and APNS_TEAM_ID are
 * right and only the made-up token is wrong. InvalidProviderToken is the
 * fail that a readable key alone cannot rule out. Kept for ten minutes and
 * signed by the same client the sends use, because Apple refuses a key that
 * signs in too often (TooManyProviderTokenUpdates). Null when Apple could
 * not be reached at all: that says nothing about the key, so it is neither
 * blamed nor kept.
 */
export async function checkApns(): Promise<ApnsCheck | null> {
  if (!apnsConfigured()) return null;
  if (lastCheck && Date.now() - lastCheck.at < CHECK_TTL_MS) return lastCheck.result;
  let result: ApnsCheck;
  try {
    // Silent, so it carries no words at all (lib/push/copy.ts holds every
    // word a push may say) and would show nothing even on a real phone.
    const { SilentNotification } = await import("apns2");
    const client = await getClient("production");
    await client.send(
      new SilentNotification("0".repeat(64), { topic: process.env.APNS_BUNDLE_ID as string }),
    );
    result = { ok: true, reason: "" };
  } catch (e) {
    const reason = apnsReason(e);
    const answered = typeof (e as { reason?: unknown } | null)?.reason === "string";
    if (!answered && reason !== "InvalidSigningKey") return null;
    result = { ok: reason === "BadDeviceToken", reason };
  }
  lastCheck = { at: Date.now(), result };
  return result;
}
