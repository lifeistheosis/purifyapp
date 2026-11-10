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
import { SITE_URL } from "@/lib/site";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { isWebOnlyAddress, openFromPush } from "./open";
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
const OPENED_KEY = "purify:push.opened"; // ids of the taps already opened, newest last
const ZONE_KEY = "purify:push.native-zone"; // the time zone the server last took from this phone

/** How many opened taps are remembered: far more than can wait in a shade. */
const OPENED_KEPT = 20;

/** How long a sign-out waits for the phone to be taken off its account. */
export const UNLINK_WAIT_MS = 2500;

/** How long turning reminders on waits for the server to take this phone. */
export const SAVE_WAIT_MS = 10_000;

/**
 * How long a call into the phone's own code may take before turning
 * reminders on moves on without it. Only the wait for the server had a
 * limit, so a phone that never answered left the button on "…" for good
 * (build 90, note 2). The phone's own question has none: it waits on the
 * reader.
 */
export const PHONE_WAIT_MS = 3_000;

/**
 * Why turning reminders on did not work, when it was not the reader's own
 * "no": the phone's own code did not answer ("phone"); Google or Apple gave
 * this phone no address to send to ("no-address"); the website could not be
 * reached ("offline"); the website answered and did not keep the phone
 * ("refused"). For the sentence a reader is shown, and for the plain line a
 * tester is.
 */
export type EnableWhy = "phone" | "no-address" | "offline" | "refused";

export type NativeEnableResult =
  | { ok: true }
  | { ok: false; reason: "denied" | "unsupported" | "signed-out" | "failed"; why?: EnableWhy };

/** What became of this phone's token, for a reader turning reminders on. */
type SaveOutcome = "saved" | "signed-out" | EnableWhy;
let awaitingSave: ((outcome: SaveOutcome) => void) | null = null;
/** Whether the phone's address has come since the wait began: what a wait that ran out was waiting for. */
let addressCame = false;

const LATE = Symbol("late");
/** The promise's own answer, or LATE once the time is up. A late answer is dropped. */
function within<T>(work: Promise<T>, ms: number): Promise<T | typeof LATE> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(LATE), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Tell a reader waiting on enableNative what the server said. */
function settleSave(outcome: SaveOutcome): void {
  const done = awaitingSave;
  awaitingSave = null;
  done?.(outcome);
}

/** Wait for the next answer to a registration, or SAVE_WAIT_MS, whichever comes first. */
function waitForSave(): Promise<SaveOutcome> {
  settleSave("phone");
  addressCame = false;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (awaitingSave === finish) awaitingSave = null;
      // The address never came, or it came and the website has not answered.
      resolve(addressCame ? "offline" : "no-address");
    }, SAVE_WAIT_MS);
    // Declared after the timer it clears, and called only after both exist.
    function finish(outcome: SaveOutcome) {
      clearTimeout(timer);
      resolve(outcome);
    }
    awaitingSave = finish;
  });
}

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
let tapsAttached = false;

/**
 * True the first time a tapped notification is seen, false when the same one
 * comes again.
 *
 * Android keeps the intent an activity was started with and hands it back
 * whenever it builds the activity again: after the app was cleared from
 * memory in the background, or after a restart, when the reader opens it
 * from the recent apps list (MainActivity has the same note for shortcuts).
 * Capacitor reads that intent each time and reports the tap again, so a
 * reader who once opened Purify from a reminder would be carried back to that
 * reminder's screen at every such return. Each push has its own id (Firebase's
 * message id, Apple's notification id), so the ones already opened are kept.
 * A tap without an id is opened, as every tap was before.
 */
function firstTap(id: unknown): boolean {
  if (typeof id !== "string" || id === "") return true;
  let opened: unknown;
  try {
    opened = JSON.parse(getItem(OPENED_KEY) ?? "[]");
  } catch {
    opened = [];
  }
  const kept = Array.isArray(opened) ? opened.filter((x): x is string => typeof x === "string") : [];
  if (kept.includes(id)) return false;
  setItem(OPENED_KEY, JSON.stringify([...kept, id].slice(-OPENED_KEPT)));
  return true;
}

/**
 * Open what a tapped notification is about, from the moment the app starts.
 *
 * Called by components/native/NativeBridge.tsx as soon as the app is up, on
 * every phone, whether or not its reminders are on. The tap listener used to
 * be attached only with the registration ones: by enableNative, or by
 * refreshNative three seconds after launch and only when this phone's own
 * note said reminders were on. So a notification that launched the app
 * showed Today for three seconds before its screen, and one that arrived
 * while the note was missing (a Community notification on a phone whose
 * stored note had been cleared, a reminder in flight as the reader turned
 * them off) opened only Today. Both platforms keep a tap until a listener
 * takes it, so attaching early loses nothing, and attaching asks nothing of
 * the reader: no permission, no registration.
 */
export async function listenForTaps(): Promise<void> {
  if (tapsAttached || !platform()) return;
  tapsAttached = true;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    // Tap on a delivered notification: open the screen it is about, through
    // the app's router. It used to be a hard navigation, which inside the shell
    // is handed the front door whatever it asked for, so every tapped reminder
    // and every tapped reply opened Today (lib/push/open.ts).
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      if (action.actionId === "dismiss") return;
      if (!firstTap(action.notification?.id)) return;
      const url: unknown = action.notification?.data?.url;
      // The owner's alerts open the admin, which is on the website alone:
      // in the phone's browser, signed in there, never as Today in the app.
      if (isWebOnlyAddress(url)) openOnWebsite(url);
      else openFromPush(url);
    });
  } catch {
    // The plugin could not be reached: the next launch tries again.
    tapsAttached = false;
  }
}

/**
 * Open a website-only address in the phone's own browser: window.open hands
 * an address on another host to Safari on an iPhone and to the default
 * browser on Android (the shells open nothing but their own pages inside),
 * as the paywall's store link does (components/billing/PlusPaywall.tsx).
 */
function openOnWebsite(path: string): void {
  try {
    window.open(new URL(path, SITE_URL).toString(), "_blank");
  } catch {
    /* an address that cannot be made opens nothing */
  }
}

/** Attach the registration listeners exactly once per app lifetime, and the tap one with them. */
async function attachListeners(): Promise<void> {
  await listenForTaps();
  if (listenersAttached) return;
  listenersAttached = true;
  const { PushNotifications } = await import("@capacitor/push-notifications");

  await PushNotifications.addListener("registration", async (token) => {
    const plat = platform();
    if (!plat) return;
    addressCame = true;
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
        settleSave("signed-out");
      } else if (res.ok) {
        setItem(ON_KEY, "1");
        setItem(ZONE_KEY, payload.timezone);
        settleSave("saved");
      } else {
        settleSave("refused");
      }
    } catch {
      setItem(PENDING_KEY, JSON.stringify(payload));
      settleSave("offline");
    }
  });

  await PushNotifications.addListener("registrationError", () => {
    removeItem(ON_KEY);
    settleSave("no-address");
  });
}

/**
 * Whether the phone shows Purify's notifications at all, asked of the app's
 * own bridge (lib/widget/bridge.ts, loaded only when asked). True only when
 * the phone says they are off; anything it cannot say (an iPhone, whose
 * permission already answers; an older build) reads as not blocked, as
 * before.
 *
 * On Android 12 and older the push plugin answers "granted" whatever the
 * reader set, so a reader who switched Purify's notifications off in the
 * phone's settings was shown reminders as on, and the server kept sending
 * pushes the phone hid.
 */
async function blockedOnPhone(): Promise<boolean> {
  if (platform() !== "android") return false;
  try {
    const { phoneNotificationsEnabled } = await import("@/lib/widget/bridge");
    // A phone that does not answer in time cannot say, and reads as not blocked.
    return (await within(phoneNotificationsEnabled(), PHONE_WAIT_MS)) === false;
  } catch {
    return false;
  }
}

/**
 * Current native reminder status, mapped to the same vocabulary as web.
 * "subscribed" only with an account signed in: the server keeps a phone's
 * token for an account and nowhere else, so with nobody signed in nothing
 * can come, whatever this phone remembers choosing.
 */
export async function nativeStatus(): Promise<
  "unsupported" | "denied" | "not-subscribed" | "subscribed"
> {
  if (!platform()) return "unsupported";
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.checkPermissions();
    const receive = perm.receive as Receive;
    if (receive === "denied") return "denied";
    if (receive === "granted" && (await blockedOnPhone())) return "denied";
    if (receive === "granted" && getItem(ON_KEY) === "1" && readLocalSessionUser()) return "subscribed";
    return "not-subscribed";
  } catch {
    return "unsupported";
  }
}

/**
 * Turn this phone's reminders on: "ok" only once the server holds its token.
 *
 * With nobody signed in nothing is asked of the phone: there is no account to
 * keep the token with, and the caller asks for a sign-in first. It used to
 * ask the phone's question, keep the token on the phone for an account that
 * might never come, and say "on" while nothing could be sent. And it used to
 * say "on" as soon as the phone was asked for a token, before the server had
 * it; now it waits for the server's answer (SAVE_WAIT_MS at most), and a
 * token the server did not take is not kept to go up later behind the
 * reader's back: they were told it did not work, and they ask again.
 */
export async function enableNative(
  morning: string = MORNING_DEFAULT,
  evening: string = EVENING_DEFAULT,
): Promise<NativeEnableResult> {
  if (!platform()) return { ok: false, reason: "unsupported" };
  if (!readLocalSessionUser()) return { ok: false, reason: "signed-out" };
  let register: () => Promise<void>;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    // The phone's own question: it waits on the reader, so it has no limit.
    const perm = await PushNotifications.requestPermissions();
    if ((perm.receive as Receive) !== "granted" || (await blockedOnPhone())) {
      return { ok: false, reason: "denied" };
    }
    register = () => PushNotifications.register();
  } catch {
    // A shell with no push plugin, or one that cannot ask.
    return { ok: false, reason: "unsupported" };
  }
  try {
    // The token arrives asynchronously on the "registration" listener; stash
    // the desired times so that handler can persist them.
    setItem(TIMES_KEY, JSON.stringify({ morning, evening }));
    if ((await within(attachListeners(), PHONE_WAIT_MS)) === LATE) {
      // Asked again at the next tap, from the start.
      listenersAttached = false;
      return { ok: false, reason: "failed", why: "phone" };
    }
    const saved = waitForSave();
    // Not waited on: the address comes by the listener, and the wait for it
    // has its own limit. A call that fails ends that wait at once; one that
    // never answers cannot hold the button.
    void register().catch(() => settleSave("phone"));
    const outcome = await saved;
    if (outcome === "saved") return { ok: true };
    removeItem(PENDING_KEY);
    if (outcome === "signed-out") return { ok: false, reason: "signed-out" };
    return { ok: false, reason: "failed", why: outcome };
  } catch {
    return { ok: false, reason: "failed", why: "phone" };
  }
}

export async function disableNative(): Promise<void> {
  const token = getItem(TOKEN_KEY);
  removeItem(ON_KEY);
  removeItem(PENDING_KEY);
  removeItem(USER_KEY);
  removeItem(ZONE_KEY);
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
  const zone = tz();
  try {
    const res = await apiFetch("/api/push/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        platform: plat,
        morningTime: times.morning,
        eveningTime: times.evening,
        timezone: zone,
      }),
    });
    if (res.ok) setItem(ZONE_KEY, zone);
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
    if (receive === "denied" || (receive === "granted" && (await blockedOnPhone()))) {
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
 * Send this phone's time zone again when it has moved since the server last
 * took it. Called each time the app comes back to the front.
 *
 * The server matches each reminder against the hour on the reader's own
 * clock, in the zone this phone last sent, and the phone sent it only at
 * launch. A phone keeps an app in the background for days, so a reader who
 * flew from New York to Athens and opened Purify where they had left it was
 * still reminded on New York's hours (morning prayer at two in the
 * afternoon) until the app was next closed and opened. Nothing is sent while
 * the zone is the one the server has, and nothing for a phone that has not
 * yet recorded one: its launch sends it anyway.
 */
export async function refreshNativeIfMoved(): Promise<void> {
  if (!platform() || getItem(ON_KEY) !== "1") return;
  const sent = getItem(ZONE_KEY);
  if (sent === null || sent === tz()) return;
  await refreshNative();
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
 * A kept registration, with the times this phone holds now and the zone it is
 * in now. It was kept with the times and the zone of its moment, and the
 * reader can have changed the times since (signed in and offline, say), or
 * travelled. Sent as it was, it put those older times, onboarding's defaults
 * as often as not, over the reader's new ones until the next launch, and the
 * old zone with them.
 */
function withKeptTimes(raw: string, zone: string): string {
  const kept = keptTimes();
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    return JSON.stringify({
      ...payload,
      ...(kept.morning ? { morningTime: kept.morning } : {}),
      ...(kept.evening ? { eveningTime: kept.evening } : {}),
      timezone: zone,
    });
  } catch {
    return raw;
  }
}

/** Persist a token captured while signed-out, now that the user is in. */
export async function flushPendingNative(): Promise<void> {
  const raw = getItem(PENDING_KEY);
  if (!raw) return;
  const zone = tz();
  try {
    const res = await apiFetch("/api/push/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: withKeptTimes(raw, zone),
    });
    if (res.ok) {
      removeItem(PENDING_KEY);
      setItem(ON_KEY, "1");
      setItem(ZONE_KEY, zone);
    }
  } catch {
    /* leave stashed; next sign-in retries */
  }
}
