// Browser Web Push helpers, shared by the account-page toggle
// (components/profile/PushOptIn.tsx) and the onboarding "prayer reminders"
// step. Pure browser Push API; no third-party notification provider.
//
// Anonymous note: requesting permission and creating a PushSubscription work
// without an account, but persisting it (`POST /api/push/subscribe`) requires
// auth (401 otherwise). The onboarding flow therefore stashes the
// subscription locally and flushes it on first sign-in (see PostSignInBridge).

import { createClient } from "@/lib/supabase/client";
import { readLocalSessionUser } from "@/lib/supabase/localSession";

import {
  reminderChange,
  shownTimes,
  type ReminderChange,
  type ReminderTimes,
  type SaveResult,
} from "./times";
import { browserVapidKey } from "./vapid";

export { EVENING_DEFAULT, MORNING_DEFAULT } from "./times";

const PENDING_KEY = "purify:push.pending";
/** "1" once the reader has turned reminders off in this browser. */
const OFF_KEY = "purify:push.web-off";
/** The endpoint the server last took from this browser. */
const SAVED_KEY = "purify:push.saved";
/** How long to wait for the service worker before calling it a failure. */
const READY_TIMEOUT_MS = 8000;
/** How long the account screen waits for the saved times before showing what this browser knows. */
const READ_TIMEOUT_MS = 8000;

export type SubscribeResult =
  | { ok: true; subscription: PushSubscription }
  | { ok: false; reason: "unsupported" | "denied" | "no-vapid" | "failed" };

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function permissionDenied(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "denied"
  );
}

/**
 * The active service worker, or null when none answers in time.
 * `navigator.serviceWorker.ready` never settles where no worker is registered
 * (a development build, a browser that refused it), and a caller awaiting it
 * forever is a button that does nothing.
 */
async function readyRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), READY_TIMEOUT_MS)),
    ]);
  } catch {
    return null;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await readyRegistration();
    return reg ? await reg.pushManager.getSubscription() : null;
  } catch {
    return null;
  }
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  if (x.length !== b.length) return false;
  for (let i = 0; i < x.length; i++) if (x[i] !== b[i]) return false;
  return true;
}

/**
 * Create the browser's PushSubscription, permission already given.
 *
 * Never throws. Until 2026-10-04 a refused subscribe (the key built into the
 * bundle was not a key, see ./vapid.ts) threw out of here and out of both
 * callers, so the reader answered the permission prompt and then nothing
 * happened, with nothing said.
 */
async function subscribeGranted(): Promise<SubscribeResult> {
  const key = browserVapidKey();
  if (!key.ok) return { ok: false, reason: "no-vapid" };
  try {
    const reg = await readyRegistration();
    if (!reg) return { ok: false, reason: "failed" };
    const keyBytes = urlBase64ToUint8Array(key.value);
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // One made for our key is the one we want. One made for another key
      // cannot be sent to by this server, so it is replaced.
      if (sameKey(existing.options?.applicationServerKey, keyBytes)) return { ok: true, subscription: existing };
      await existing.unsubscribe();
    }
    // Slice into a fresh ArrayBuffer so TS sees ArrayBufferView<ArrayBuffer>,
    // not the wider Uint8Array<ArrayBufferLike> Node-style return.
    const appServerKey = keyBytes.buffer.slice(
      keyBytes.byteOffset,
      keyBytes.byteOffset + keyBytes.byteLength,
    ) as ArrayBuffer;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey,
    });
    return { ok: true, subscription };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/** Request OS permission and create a browser PushSubscription. */
export async function requestAndSubscribe(): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  let perm: NotificationPermission;
  try {
    perm = await Notification.requestPermission();
  } catch {
    return { ok: false, reason: "failed" };
  }
  if (perm !== "granted") return { ok: false, reason: "denied" };
  markWebOff(false);
  return subscribeGranted();
}

/** Remember, in this browser, whether the reader turned reminders off. */
export function markWebOff(off: boolean): void {
  try {
    if (off) window.localStorage.setItem(OFF_KEY, "1");
    else window.localStorage.removeItem(OFF_KEY);
  } catch {
    /* blocked storage: the reader's choice still stands for this page */
  }
}

/**
 * Remember that the server holds this browser's subscription, or forget it.
 * It is what lets a later visit tell a saved subscription from a stranded
 * one without asking the server on every page.
 */
export function markSaved(endpoint: string | null): void {
  try {
    if (endpoint) window.localStorage.setItem(SAVED_KEY, endpoint);
    else window.localStorage.removeItem(SAVED_KEY);
  } catch {
    /* blocked storage: nothing here works without it, and nothing breaks */
  }
}

function isSaved(endpoint: string): boolean {
  try {
    return window.localStorage.getItem(SAVED_KEY) === endpoint;
  } catch {
    return false;
  }
}

/**
 * Finish reminders that were asked for and never reached the server.
 *
 * A browser that has allowed notifications for Purify did so in exactly one
 * place, the "turn on reminders" step, because nothing else here asks. Two
 * things can have gone wrong after that, and this repairs both on a later
 * visit, a reader who has since turned reminders off in this browser left
 * alone:
 *
 *   - No subscription was ever made. Until 2026-10-04 that was everyone
 *     (see ./vapid.ts): the permission is granted and nothing is behind it.
 *   - A subscription was made and never saved. Onboarding runs before
 *     sign-up, so it is kept in this browser (stashPending) for the account
 *     that comes later, and the only thing that ever sent it on was the
 *     account page. A reader who signed in and never opened that page, or
 *     whose save failed, had reminders "on" that the server knew nothing of.
 *
 * Saved with the times kept with it, as they were kept, or with none when
 * none were: the route then leaves a saved row's own times as they are and
 * gives a new row the defaults. It used to send the defaults for a browser
 * kept without times, which put them over the reader's own whenever a saved
 * browser lost its mark. No request is made for a browser that is already
 * saved, or while nobody is signed in.
 */
export async function healWebPush(): Promise<"healed" | "stashed" | "none"> {
  if (!pushSupported() || Notification.permission !== "granted") return "none";
  try {
    if (window.localStorage.getItem(OFF_KEY) === "1") return "none";
  } catch {
    return "none";
  }
  const reg = await readyRegistration();
  if (!reg) return "none";
  let sub: PushSubscription | null;
  try {
    sub = await reg.pushManager.getSubscription();
  } catch {
    return "none";
  }
  if (!sub) {
    const made = await subscribeGranted();
    if (!made.ok) return "none";
    sub = made.subscription;
  } else if (isSaved(sub.endpoint)) {
    return "none";
  }

  const kept = readPending();
  const mine = kept && kept.endpoint === sub.endpoint ? kept : null;
  const times = mine ? pendingTimes(mine) : {};
  if (!readLocalSessionUser()) {
    // Nobody to save it under yet. Kept, as onboarding keeps it.
    if (!mine) stashPending(sub, times);
    return "stashed";
  }
  try {
    const res = await persistSubscription(sub, times);
    if (res.ok) {
      markSaved(sub.endpoint);
      clearPending();
      return "healed";
    }
    if (res.status === 401 && !mine) stashPending(sub, times);
    return res.status === 401 ? "stashed" : "none";
  } catch {
    // Offline at that moment. The next visit tries again.
    return "none";
  }
}

function bodyFor(
  sub: Pick<PushSubscription, "endpoint" | "getKey">,
  times: ReminderChange,
) {
  return JSON.stringify({
    endpoint: sub.endpoint,
    keys: {
      p256dh: bufToB64(sub.getKey("p256dh")),
      auth: bufToB64(sub.getKey("auth")),
    },
    // A time left out is not sent, and the route leaves it as the row has it.
    morningTime: times.morning,
    eveningTime: times.evening,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

/** Persist a subscription on the server, with the times given and no others.
 *  Returns the raw Response so callers can detect 401 (signed-out) and stash
 *  for later. */
export async function persistSubscription(
  sub: PushSubscription,
  times: ReminderChange,
): Promise<Response> {
  return fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: bodyFor(sub, times),
  });
}

// --- The times this browser's reminders come at ---------------------------

type SavedRow = { endpoint: string; morning_time: string | null; evening_time: string | null };

/**
 * This browser's times as its saved row holds them, read as the reader
 * (push_subscriptions_self_select: their own rows and no one else's). All of
 * the reader's rows are asked for and this browser's is picked out here,
 * which keeps the endpoint, the address that can send to this browser, out
 * of the request's URL. Null when there is nothing to read: signed out,
 * offline, or no row for this browser under this account.
 */
async function readSavedTimes(endpoint: string): Promise<ReminderChange | null> {
  const user = readLocalSessionUser();
  if (!user) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const read = createClient()
      .from("push_subscriptions")
      .select("endpoint, morning_time, evening_time")
      .eq("user_id", user.id);
    const result = await Promise.race([
      read,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), READ_TIMEOUT_MS);
      }),
    ]);
    if (!result || result.error || !Array.isArray(result.data)) return null;
    const row = (result.data as SavedRow[]).find((r) => r.endpoint === endpoint);
    return row ? reminderChange({ morning: row.morning_time, evening: row.evening_time }) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The times this browser's reminders come at, for the account screen: what
 * still waits on this browser to be sent, over what its saved row holds,
 * over the defaults. Until 2026-10-30 the screen asked neither and showed
 * 07:00 and 21:00 after every reload, whatever the reader had saved.
 */
export async function webReminderTimes(): Promise<ReminderTimes> {
  const sub = await getExistingSubscription();
  if (!sub) return shownTimes();
  const kept = readPending();
  const waiting = kept && kept.endpoint === sub.endpoint ? pendingTimes(kept) : null;
  // Both still wait here, so they are the answer and the server is not asked.
  if (waiting?.morning && waiting.evening) return shownTimes(waiting);
  return shownTimes(waiting, await readSavedTimes(sub.endpoint));
}

/**
 * Save a change to this browser's times: only the time the reader changed,
 * and the route leaves the other as the row has it. A browser still waiting
 * to be saved sends what waits along with the change.
 *
 * A change the server did not take (signed out, offline, a failed save) is
 * kept on this browser with whatever already waits, and the browser is
 * marked unsaved, so the sign-in (flushPending) or the next visit that is
 * signed in (healWebPush) sends it. This used to look for an ok and do
 * nothing otherwise: a time changed while signed out was dropped, and after
 * the sign-in the browser went on at the times it had before.
 */
export async function updateWebTimes(change: ReminderChange): Promise<SaveResult> {
  const sub = await getExistingSubscription();
  if (!sub) return "failed";
  const kept = readPending();
  const waiting = kept && kept.endpoint === sub.endpoint ? pendingTimes(kept) : null;
  const times: ReminderChange = { ...waiting, ...reminderChange(change) };
  try {
    const res = await persistSubscription(sub, times);
    if (res.ok) {
      markSaved(sub.endpoint);
      if (waiting) clearPending();
      return "saved";
    }
    // Refused for what it is, not for who sent it or when: kept, it would
    // only go up again to be refused again.
    if (res.status !== 401 && res.status < 500) return "failed";
  } catch {
    // Offline at that moment.
  }
  stashPending(sub, times);
  markSaved(null);
  return "kept";
}

export async function removeSubscription(): Promise<void> {
  // The reader's choice, kept so a later visit does not subscribe them again.
  markWebOff(true);
  markSaved(null);
  clearPending();
  const sub = await getExistingSubscription();
  if (!sub) return;
  await fetch(
    `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
    { method: "DELETE" },
  );
  await sub.unsubscribe();
}

// --- Anonymous → signed-in handoff --------------------------------------

/**
 * A subscription the server has not taken yet, with the times to send with
 * it. A time is absent when the reader changed only the other one: then the
 * saved row's own is the one that stands.
 */
type PendingPush = {
  endpoint: string;
  p256dh: string;
  auth: string;
  morningTime?: string;
  eveningTime?: string;
  timezone: string;
};

/** Stash a subscription captured while signed-out, to persist after login. */
export function stashPending(sub: PushSubscription, times: ReminderChange): void {
  if (typeof window === "undefined") return;
  try {
    const pending: PendingPush = {
      endpoint: sub.endpoint,
      p256dh: bufToB64(sub.getKey("p256dh")),
      auth: bufToB64(sub.getKey("auth")),
      morningTime: times.morning,
      eveningTime: times.evening,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* ignore */
  }
}

function readPending(): PendingPush | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as Partial<PendingPush> | null;
    return pending && typeof pending.endpoint === "string" ? (pending as PendingPush) : null;
  } catch {
    return null;
  }
}

/** The real times a stash carries, and only those. */
function pendingTimes(pending: PendingPush): ReminderChange {
  return reminderChange({ morning: pending.morningTime, evening: pending.eveningTime });
}

function clearPending(): void {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/** Persist any stashed subscription now that the user is signed in. */
export async function flushPending(): Promise<void> {
  const pending = readPending();
  if (!pending) return;
  // Only the times that were kept: one the reader did not change is left as
  // the saved row has it.
  const times = pendingTimes(pending);
  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: pending.endpoint,
        keys: { p256dh: pending.p256dh, auth: pending.auth },
        morningTime: times.morning,
        eveningTime: times.evening,
        timezone: pending.timezone,
      }),
    });
    if (res.ok) {
      markSaved(pending.endpoint);
      clearPending();
    }
  } catch {
    /* leave it stashed; the next visit retries (healWebPush) */
  }
}

// --- Encoding helpers (moved here from PushOptIn) -----------------------

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const b64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function bufToB64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str);
}
