import "server-only";

import { createECDH } from "node:crypto";

import { readVapidPrivateKey, readVapidPublicKey, readVapidSubject, type Parsed } from "../vapid";

// Web Push (VAPID) on the server: reading the three variables, checking that
// they belong together, and sending one message. The Apple and Firebase
// counterparts are ./apns.ts and ./fcm.ts.
//
// Read forgivingly (../vapid.ts) because the browser's copy of the public key
// arrived on Render with its own name pasted in front, and web push reached
// nobody for as long as it had existed while the Push tab said "Ready".
// Presence was the only check. This checks that each value IS a key, that the
// private key signs for the public one, and that the key browsers subscribe
// with is the key the server signs with.

export type VapidConfig = { subject: string; publicKey: string; privateKey: string };

type Env = Record<string, string | undefined>;

/** The server's three values, or the first thing wrong with them. */
export function vapidConfig(env: Env = process.env): Parsed<VapidConfig> {
  const publicKey = readVapidPublicKey(env.VAPID_PUBLIC_KEY, "VAPID_PUBLIC_KEY");
  if (!publicKey.ok) return publicKey;
  const privateKey = readVapidPrivateKey(env.VAPID_PRIVATE_KEY, "VAPID_PRIVATE_KEY");
  if (!privateKey.ok) return privateKey;
  const subject = readVapidSubject(env.VAPID_SUBJECT, "VAPID_SUBJECT");
  if (!subject.ok) return subject;
  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(privateKey.value, "base64url"));
    if (ecdh.getPublicKey().toString("base64url") !== publicKey.value) {
      return {
        ok: false,
        reason:
          "VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are not a pair: the private key signs for a different public key. Set both from one `npx web-push generate-vapid-keys` run.",
      };
    }
  } catch {
    return { ok: false, reason: "VAPID_PRIVATE_KEY is not a usable P-256 private key." };
  }
  return { ok: true, value: { subject: subject.value, publicKey: publicKey.value, privateKey: privateKey.value } };
}

/** The server can sign and send. Says nothing about whether a browser can subscribe. */
export function webPushConfigured(env: Env = process.env): boolean {
  return vapidConfig(env).ok;
}

/**
 * What stops web push, in words for the Push tab, or null when nothing does.
 * Covers the half presence could never see: the browser's key
 * (NEXT_PUBLIC_VAPID_KEY, built into the bundle) has to be readable and has
 * to be the server's public key, or browsers subscribe to nothing the server
 * can sign for. Names a variable and a shape, never a value.
 */
export function webPushProblem(env: Env = process.env): string | null {
  const server = vapidConfig(env);
  if (!server.ok) return server.reason;
  const browser = readVapidPublicKey(env.NEXT_PUBLIC_VAPID_KEY, "NEXT_PUBLIC_VAPID_KEY");
  if (!browser.ok) return `${browser.reason} Browsers cannot subscribe without it.`;
  if (browser.value !== server.value.publicKey) {
    return "NEXT_PUBLIC_VAPID_KEY and VAPID_PUBLIC_KEY are different keys: browsers subscribe with one and the server signs with the other, so every send is refused. Set both to the same public key and redeploy.";
  }
  return null;
}

let client: typeof import("web-push") | null = null;
let clientFor: string | null = null;

/** The web-push module, set up with the keys as read. Null when they cannot be. */
export async function webPushClient(): Promise<typeof import("web-push") | null> {
  const config = vapidConfig();
  if (!config.ok) return null;
  const stamp = `${config.value.subject}|${config.value.publicKey}`;
  if (client && clientFor === stamp) return client;
  try {
    const m = await import("web-push");
    const loaded = (m.default ?? m) as typeof import("web-push");
    loaded.setVapidDetails(config.value.subject, config.value.publicKey, config.value.privateKey);
    client = loaded;
    clientFor = stamp;
    return loaded;
  } catch (e) {
    console.warn("[push] web-push could not be set up", e instanceof Error ? e.message : String(e));
    return null;
  }
}
