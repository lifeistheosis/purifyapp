/**
 * Why a native push failed, counted and said in words the admin panel can
 * show.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * On 2026-09-27 a broadcast to 294 devices came back "Sent to 294
 * recipient(s)." while not one of 135 iPhones had ever received a push, and
 * the reason Apple gave for each was thrown away inside the sender. "Sent"
 * was true of the Android half only. So every failure now keeps the
 * provider's own reason (APNs `reason`, Firebase `code`), the senders count
 * them per platform, and the broadcast says which platform failed and what
 * to change.
 *
 * Pure: reasons in, counts and sentences out. Never a token or a key.
 */

export type NativePlatform = "ios" | "android";

/** Failures per platform, keyed by the provider's reason. */
export type FailureTally = Record<NativePlatform, Record<string, number>>;

export function emptyTally(): FailureTally {
  return { ios: {}, android: {} };
}

export function addFailure(tally: FailureTally, platform: NativePlatform, reason: string | undefined): void {
  const key = reason || "unknown";
  tally[platform][key] = (tally[platform][key] ?? 0) + 1;
}

export function tallyIsEmpty(tally: FailureTally): boolean {
  return Object.keys(tally.ios).length === 0 && Object.keys(tally.android).length === 0;
}

/**
 * The reason carried by whatever a provider threw: APNs errors have `reason`,
 * Firebase and network errors have `code`, and a key that cannot sign throws
 * an ordinary Error. Short, and never the message of an error that could echo
 * a credential back.
 */
export function reasonOf(e: unknown): string {
  const o = (e ?? {}) as { reason?: unknown; code?: unknown; name?: unknown };
  if (typeof o.reason === "string" && o.reason) return o.reason;
  if (typeof o.code === "string" && o.code) return o.code;
  if (typeof o.name === "string" && o.name && o.name !== "Error") return o.name;
  return "unknown";
}

/**
 * What Apple's answer means for one iPhone's token.
 *
 * `other-host`: BadDeviceToken is also what a real token gets from the wrong
 * one of Apple's two servers. App Store and TestFlight builds register with
 * production and a build run from Xcode with the sandbox, so the other server
 * is asked before the token is judged. `gone`: Apple says the token will
 * never work again. `keep`: anything else is about the key, the settings or
 * the moment, not the phone.
 */
export function apnsVerdict(reason: string): "gone" | "other-host" | "keep" {
  if (reason === "BadDeviceToken") return "other-host";
  if (reason === "Unregistered" || reason === "DeviceTokenNotForTopic") return "gone";
  return "keep";
}

/** Firebase codes that mean the token is dead. invalid-argument is also a malformed message, which is why pruning waits for proof (see the providers). */
export function fcmTokenGone(code: string): boolean {
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token" ||
    code === "messaging/invalid-argument"
  );
}

const IOS: Record<string, string> = {
  InvalidProviderToken:
    "Apple refused the key. APNS_KEY_ID must be the ID in the key's file name (AuthKey_<ID>.p8), APNS_TEAM_ID the Team ID from Apple Developer, Membership, and the key must have Apple Push Notifications service ticked.",
  MissingProviderToken: "Apple got no key with the request. Check APNS_KEY_P8.",
  ExpiredProviderToken: "Apple said the key's sign-in had expired. The next send signs again by itself.",
  InvalidSigningKey: "The key could not sign. Paste APNS_KEY_P8 again, as base64 of the .p8 file.",
  TopicDisallowed: "Apple will not send for that app. APNS_BUNDLE_ID should be net.purifyapp.purify.",
  BadTopic: "APNS_BUNDLE_ID is not a valid app ID. It should be net.purifyapp.purify.",
  MissingTopic: "APNS_BUNDLE_ID is empty. It should be net.purifyapp.purify.",
  DeviceTokenNotForTopic:
    "These iPhones belong to a different app than APNS_BUNDLE_ID, which should be net.purifyapp.purify.",
  BadDeviceToken: "Neither of Apple's servers knows these iPhones.",
  Unregistered: "These iPhones removed the app or turned notifications off.",
  TooManyProviderTokenUpdates: "Apple asked us to sign in less often. The next run tries again.",
  TooManyRequests: "Apple asked us to slow down. The next run tries again.",
  ServiceUnavailable: "Apple's push service was down. The next run tries again.",
  InternalServerError: "Apple's push service had an error. The next run tries again.",
};

const ANDROID: Record<string, string> = {
  "messaging/mismatched-credential":
    "FCM_SERVICE_ACCOUNT_JSON is from a different Firebase project than the app's google-services.json.",
  "messaging/registration-token-not-registered": "These phones removed the app or turned notifications off.",
  "messaging/invalid-registration-token": "These phones' tokens are not valid Firebase tokens.",
  "messaging/invalid-argument": "Firebase refused the message or the token.",
  "messaging/quota-exceeded": "Firebase's sending limit was reached. The next run tries again.",
  "messaging/server-unavailable": "Firebase was down. The next run tries again.",
  "messaging/internal-error": "Firebase had an error. The next run tries again.",
  "app/invalid-credential": "Firebase refused FCM_SERVICE_ACCOUNT_JSON. Download a new private key and paste it.",
};

/** One reason in plain words, for the admin panel. */
export function explainFailure(platform: NativePlatform, reason: string): string {
  const known = (platform === "ios" ? IOS : ANDROID)[reason];
  if (known) return known;
  return platform === "ios" ? `Apple answered ${reason}.` : `Firebase answered ${reason}.`;
}

/**
 * The failures of one send, as sentences: the platform, how many, the reason
 * code as the provider gave it, and what it means. Most frequent reason
 * first; empty when nothing failed.
 */
export function describeFailures(tally: FailureTally): string {
  const out: string[] = [];
  for (const platform of ["ios", "android"] as const) {
    const entries = Object.entries(tally[platform]).sort((a, b) => b[1] - a[1]);
    for (const [reason, n] of entries) {
      const who = platform === "ios" ? (n === 1 ? "iPhone" : "iPhones") : n === 1 ? "Android phone" : "Android phones";
      out.push(`${n} ${who} failed (${reason}): ${explainFailure(platform, reason)}`);
    }
  }
  return out.join(" ");
}
