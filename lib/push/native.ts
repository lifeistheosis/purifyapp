// Native push registration for the iOS/Android Capacitor shells (APNs / FCM
// via @capacitor/push-notifications). The Web Push counterpart is in
// ./client.ts; ./reminders.ts is the facade that picks between them.
//
// Every @capacitor import here is DYNAMIC and reached only inside the native
// shell, so this module is safe to import from web client code — the plugin
// never enters the browser bundle (same guard pattern as NativeBridge.tsx).
//
// Every call to /api/push/device goes through apiFetch, never bare fetch: this
// module runs ONLY inside the native shell, which is served from
// https://localhost with app/api stashed out of the export. A relative fetch
// there resolves to the local bundle, where no route handler exists, so the
// token silently never reached the server and device_push_tokens stayed empty.
// apiFetch rewrites to SITE_URL and attaches the Bearer token.

import { apiFetch } from "@/lib/api/client";
import { nativePlatform as platform } from "@/lib/platform/native";
import { openFromPush } from "./open";
import {
  EVENING_DEFAULT,
  MORNING_DEFAULT,
  reminderChange,
  shownTimes,
  type ReminderChange,
  type ReminderTimes,
  type SaveResult,
} from "./times";

const TOKEN_KEY = "purify:push.native-token"; // last token we registered
const ON_KEY = "purify:push.native-on"; // "1" while reminders are on
const TIMES_KEY = "purify:push.native-times"; // desired times for the next token
const PENDING_KEY = "purify:push.pending-native"; // captured signed-out, flush on login
const USER_KEY = "purify:push.native-user"; // the account this phone was last given to

/** How long a sign-out waits for the phone to be taken off its account. */
export const UNLINK_WAIT_MS = 2500;

export type NativeEnableResult =
  | { ok: true }
  | { ok: false; reason: "denied" | "unsupported" };

type Receive = "prompt" | "prompt-with-rationale" | "granted" | "denied";

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
    const times = nativeReminderTimes();
    const payload = {
      token: token.value,
      platform: plat,
      morningTime: times.morning,
      eveningTime: times.evening,
      timezone: tz(),
    };
    try {
      const res = await apiFetch("/api/push/device", {
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

  // Tap on a delivered notification: open the screen it is about, through
  // the app's router. It used to be a hard navigation, which inside the shell
  // is handed the front door whatever it asked for, so every tapped reminder
  // and every tapped reply opened Today (lib/push/open.ts).
  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      openFromPush(action.notification?.data?.url);
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
  removeItem(USER_KEY);
  if (token) {
    try {
      await apiFetch(`/api/push/device?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      });
    } catch {
      /* ignore */
    }
  }
}

/** The real times in this phone's copy, and only those. */
function keptTimes(): ReminderChange {
  try {
    return reminderChange(JSON.parse(getItem(TIMES_KEY) ?? "null"));
  } catch {
    return {};
  }
}

/**
 * The times this phone's reminders come at. The phone's own copy, which it
 * sends with its token at every launch, so it is also what the server holds;
 * the defaults only where the phone has none. The account screen showed the
 * defaults after every launch instead, and saved them on the next change.
 */
export function nativeReminderTimes(): ReminderTimes {
  return shownTimes(keptTimes());
}

/**
 * Change this phone's times. The time the reader changed goes into the
 * phone's copy and the other stays as the copy has it; then the phone sends
 * both from that copy, as it does at every launch. Both, so that a server
 * from before 2026-10-30, which takes a time left out as no reminder at all,
 * is never handed half a pair; and both are the reader's, never a default
 * shown in place of one. "kept" when the server did not take it: the copy
 * goes up with the token at the next launch, or the next sign-in.
 */
export async function updateNativeTimes(change: ReminderChange): Promise<SaveResult> {
  const times = { ...nativeReminderTimes(), ...reminderChange(change) };
  setItem(TIMES_KEY, JSON.stringify(times));
  const token = getItem(TOKEN_KEY);
  const plat = platform();
  if (!token || !plat) return "kept";
  try {
    const res = await apiFetch("/api/push/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        platform: plat,
        morningTime: times.morning,
        eveningTime: times.evening,
        timezone: tz(),
      }),
    });
    return res.ok ? "saved" : "kept";
  } catch {
    return "kept";
  }
}

/**
 * Keep this phone's token current, once per launch, for a reader who has
 * reminders on.
 *
 * The token only ever reached the server from enableNative, the moment a
 * reader first turned reminders on. Apple and Google both change a device's
 * token over time (a restore, a reinstall, Firebase's own refresh), and the
 * listener that would have caught a new one was attached only during that
 * first enable, so the server kept sending to a token the phone no longer
 * answered to. Registering on every launch is how both platforms expect it
 * done; the registration listener upserts, so an unchanged token costs one
 * small request.
 *
 * A reader who has since turned notifications off in the phone's settings
 * is taken off the list instead, so the admin count means phones that can
 * show a push, not phones that once could.
 */
export async function refreshNative(): Promise<void> {
  if (!platform() || getItem(ON_KEY) !== "1") return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.checkPermissions();
    const receive = perm.receive as Receive;
    if (receive === "denied") {
      await disableNative();
      return;
    }
    if (receive !== "granted") return;
    await attachListeners();
    await PushNotifications.register();
  } catch {
    /* the next launch tries again */
  }
}

/**
 * Give this phone to the account that has just signed in, when the reader
 * has notifications on here.
 *
 * A phone's token is saved for whoever is signed in when it is sent, so a
 * sign-in on a phone that another account used moves the phone to the new
 * one (app/api/push/device). But the token was sent only at launch
 * (refreshNative), so a reader who signed in and kept the app open was still
 * hearing nothing, or the other account's notifications, until they closed
 * it. Once per account: Supabase says SIGNED_IN each time the app comes back
 * to the front.
 */
export async function relinkNative(userId: string): Promise<void> {
  if (!platform() || getItem(ON_KEY) !== "1" || getItem(USER_KEY) === userId) return;
  setItem(USER_KEY, userId);
  await flushPendingNative();
  await refreshNative();
}

/**
 * Take this phone off the account that is signing out, while its session can
 * still say whose phone it is.
 *
 * Without this a phone went on showing the account's replies, mentions and
 * reminders after it signed out, to whoever held it next. The reader's
 * choice to have notifications on this phone is kept, so the next sign-in
 * gives the phone to that account (relinkNative). Never holds a sign-out up
 * for longer than UNLINK_WAIT_MS.
 */
export async function unlinkNative(): Promise<void> {
  removeItem(USER_KEY);
  const token = getItem(TOKEN_KEY);
  if (!platform() || !token) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    apiFetch(`/api/push/device?token=${encodeURIComponent(token)}`, { method: "DELETE" }).catch(() => undefined),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, UNLINK_WAIT_MS);
    }),
  ]);
  clearTimeout(timer);
}

/**
 * A kept registration, with the times this phone holds now. It was kept with
 * the times of its moment, and the reader can have changed them since (signed
 * in and offline, say). Sent as it was, it put those older times, onboarding's
 * defaults as often as not, over the reader's new ones until the next launch.
 */
function withKeptTimes(raw: string): string {
  const kept = keptTimes();
  if (!kept.morning && !kept.evening) return raw;
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    return JSON.stringify({
      ...payload,
      ...(kept.morning ? { morningTime: kept.morning } : {}),
      ...(kept.evening ? { eveningTime: kept.evening } : {}),
    });
  } catch {
    return raw;
  }
}

/** Persist a token captured while signed-out, now that the user is in. */
export async function flushPendingNative(): Promise<void> {
  const raw = getItem(PENDING_KEY);
  if (!raw) return;
  try {
    const res = await apiFetch("/api/push/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: withKeptTimes(raw),
    });
    if (res.ok) {
      removeItem(PENDING_KEY);
      setItem(ON_KEY, "1");
    }
  } catch {
    /* leave stashed; next sign-in retries */
  }
}
