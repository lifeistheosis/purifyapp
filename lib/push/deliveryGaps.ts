/**
 * Which push transports could not deliver a broadcast, and exactly what each
 * one is missing.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * A broadcast that reached nobody used to report one sentence: "no push
 * secrets are set, so every transport dry-ran." That is true and useless. There
 * are three transports, each gated by its own environment variables, and the
 * devices waiting on them are not evenly split. The operator reading that line
 * cannot tell whether one missing key would fix it or seven would, which
 * platform the 266 devices are on, or whether a key is absent or present and
 * broken. So they cannot act on it.
 *
 * This names the transport, the device count it would have reached, and the
 * variable names still missing. NAMES ONLY, never values: it reads whether a
 * variable is set, and the route only ever passes it presence.
 *
 * It also catches a gap the old message could not express at all. The native
 * path counted as "configured" when EITHER Apple or Firebase was set, so with
 * Firebase alone every iPhone was silently skipped while the broadcast was
 * logged as sent. A gap is reported per transport, so a partial send says
 * which half did not go.
 *
 * Pure, so it can be tested without any credentials existing.
 */

export type PushTransport = "web" | "android" | "ios";

/** Every variable each transport needs before it will send anything. */
export const PUSH_ENV: Record<PushTransport, readonly string[]> = {
  web: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"],
  android: ["FCM_SERVICE_ACCOUNT_JSON"],
  ios: ["APNS_KEY_P8", "APNS_KEY_ID", "APNS_TEAM_ID", "APNS_BUNDLE_ID"],
};

const LABEL: Record<PushTransport, string> = {
  web: "Web push",
  android: "Android",
  ios: "iPhone",
};

export type TransportGap = {
  transport: PushTransport;
  label: string;
  /** Devices in this broadcast's audience that needed this transport. */
  devices: number;
  /** Variables that are not set at all. */
  missing: string[];
  /**
   * True when every variable is set and the transport still refused to
   * configure: a value is present but unreadable (a .p8 that is not base64, a
   * service account pasted as raw JSON). The providers log which one.
   */
  malformed: boolean;
};

/** Which of a transport's variables are unset, by name. */
export function missingPushEnv(
  env: Record<string, string | undefined>,
): Record<PushTransport, string[]> {
  const unset = (keys: readonly string[]) => keys.filter((k) => !env[k]);
  return {
    web: unset(PUSH_ENV.web),
    android: unset(PUSH_ENV.android),
    ios: unset(PUSH_ENV.ios),
  };
}

/**
 * The transports this audience needed that are not able to send.
 *
 * A transport with no devices waiting is never a gap, however unconfigured:
 * nagging about Apple keys for an audience with no iPhones in it is noise.
 */
export function deliveryGaps(
  devices: Record<PushTransport, number>,
  configured: Record<PushTransport, boolean>,
  missing: Record<PushTransport, string[]>,
): TransportGap[] {
  const order: PushTransport[] = ["android", "ios", "web"];
  return order
    .filter((t) => devices[t] > 0 && !configured[t])
    .map((t) => ({
      transport: t,
      label: LABEL[t],
      devices: devices[t],
      missing: missing[t],
      malformed: missing[t].length === 0,
    }))
    .sort((a, b) => b.devices - a.devices);
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function plural(n: number, one: string): string {
  return `${n} ${one}${n === 1 ? "" : "s"}`;
}

/** One sentence per gap, largest audience first. Empty when nothing is missing. */
export function describeGaps(gaps: TransportGap[]): string {
  return gaps
    .map((g) => {
      if (g.malformed) {
        return `${g.label}, ${plural(g.devices, "device")}: its variables are set but one could not be read, so it dry-ran. The server log names which.`;
      }
      const verb = g.missing.length === 1 ? "is" : "are";
      return `${g.label}, ${plural(g.devices, "device")}: ${listNames(g.missing)} ${verb} not set.`;
    })
    .join(" ");
}
