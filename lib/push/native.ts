// Native push registration for the iOS/Android Capacitor shells (APNs / FCM
// via @capacitor/push-notifications). The Web Push counterpart is in
// ./client.ts; ./reminders.ts is the facade that picks between them.
//
// Every @capacitor import here is DYNAMIC and reached only inside the native
// shell, so this module is safe to import from web client code — the plugin
// never enters the browser bundle (same guard pattern as NativeBridge.tsx).

import { MORNING_DEFAULT, EVENING_DEFAULT } from "./client";

const TOKEN_KEY = "purify:push.native-token"; // last token we registered
const ON_KEY = "purify:push.native-on"; // "1" while reminders are on
const TIMES_KEY = "purify:push.native-times"; // desired times for the next token
const PENDING_KEY = "purify:push.pending-native"; // captured signed-out, flush on login

export type NativeEnableResult =
  | { ok: true }
  | { ok: false; reason: "denied" | "unsupported" };

type Receive = "prompt" | "prompt-with-rationale" | "granted" | "denied";

function platform(): "ios" | "android" | null {
  const cap = (window as { Capacitor?: { getPlatform?: () => string } })
    .Capacitor;
  const p = cap?.getPlatform?.();
  return p === "ios" || p === "android" ? p : null;
}

function tz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function setItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
function getItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function removeItem(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

let listenersAttached = false;

/** Attach the registration/tap listeners exactly once per app lifetime. */
async function attachListeners(): Promise<void> {
  if (listenersAttached) return;
  listenersAttached = true;
  const { PushNotifications } = await import("@capacitor/push-notifications");

  await PushNotifications.addListener("registration", async (token) => {
    const plat = platform();
    if (!plat) return;
    setItem(TOKEN_KEY, token.value);
    const raw = getItem(TIMES_KEY);
    const times = raw
      ? (JSON.parse(raw) as { morning: string; evening: string })
      : { morning: MORNING_DEFAULT, evening: EVENING_DEFAULT };
    const payload = {
      token: token.value,
      platform: plat,
      morningTime: times.morning,
      eveningTime: times.evening,
      timezone: tz(),
    };
    try {
      const res = await fetch("/api/push/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        // Signed-out: keep the token and persist on first sign-in.
        setItem(PENDING_KEY, JSON.stringify(payload));
      } else if (res.ok) {
        setItem(ON_KEY, "1");
      }
    } catch {
      setItem(PENDING_KEY, JSON.stringify(payload));
    }
  });

  await PushNotifications.addListener("registrationError", () => {
    removeItem(ON_KEY);
  });

  // Tap on a delivered notification → deep-link to the prayer rule.
  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      const url = action.notification?.data?.url;
      if (typeof url === "string" && url.startsWith("/")) {
        window.location.assign(url);
      }
    },
  );
}

/** Current native reminder status, mapped to the same vocabulary as web. */
export async function nativeStatus(): Promise<
  "unsupported" | "denied" | "not-subscribed" | "subscribed"
> {
  if (!platform()) return "unsupported";
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.checkPermissions();
    const receive = perm.receive as Receive;
    if (receive === "denied") return "denied";
    if (receive === "granted" && getItem(ON_KEY) === "1") return "subscribed";
    return "not-subscribed";
  } catch {
    return "unsupported";
  }
}

export async function enableNative(
  morning: string = MORNING_DEFAULT,
  evening: string = EVENING_DEFAULT,
): Promise<NativeEnableResult> {
  if (!platform()) return { ok: false, reason: "unsupported" };
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    if ((perm.receive as Receive) !== "granted") {
      return { ok: false, reason: "denied" };
    }
    // The token arrives asynchronously on the "registration" listener; stash
    // the desired times so that handler can persist them.
    setItem(TIMES_KEY, JSON.stringify({ morning, evening }));
    await attachListeners();
    await PushNotifications.register();
    setItem(ON_KEY, "1"); // optimistic; cleared on registrationError
    return { ok: true };
  } catch {
    return { ok: false, reason: "unsupported" };
  }
}

export async function disableNative(): Promise<void> {
  const token = getItem(TOKEN_KEY);
  removeItem(ON_KEY);
  removeItem(PENDING_KEY);
  if (token) {
    try {
      await fetch(`/api/push/device?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      });
    } catch {
      /* ignore */
    }
  }
}

export async function updateNativeTimes(
  morning: string,
  evening: string,
): Promise<void> {
  const token = getItem(TOKEN_KEY);
  setItem(TIMES_KEY, JSON.stringify({ morning, evening }));
  if (!token) return;
  const plat = platform();
  if (!plat) return;
  try {
    await fetch("/api/push/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        platform: plat,
        morningTime: morning,
        eveningTime: evening,
        timezone: tz(),
      }),
    });
  } catch {
    /* ignore */
  }
}

/** Persist a token captured while signed-out, now that the user is in. */
export async function flushPendingNative(): Promise<void> {
  const raw = getItem(PENDING_KEY);
  if (!raw) return;
  try {
    const res = await fetch("/api/push/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
    });
    if (res.ok) {
      removeItem(PENDING_KEY);
      setItem(ON_KEY, "1");
    }
  } catch {
    /* leave stashed; next sign-in retries */
  }
}
