// Browser Web Push helpers, shared by the account-page toggle
// (components/profile/PushOptIn.tsx) and the onboarding "prayer reminders"
// step. Pure browser Push API; no third-party notification provider.
//
// Anonymous note: requesting permission and creating a PushSubscription work
// without an account, but persisting it (`POST /api/push/subscribe`) requires
// auth (401 otherwise). The onboarding flow therefore stashes the
// subscription locally and flushes it on first sign-in (see PostSignInBridge).

export const MORNING_DEFAULT = "07:00";
export const EVENING_DEFAULT = "21:00";

const PENDING_KEY = "purify:push.pending";

export type SubscribeResult =
  | { ok: true; subscription: PushSubscription }
  | { ok: false; reason: "unsupported" | "denied" | "no-vapid" };

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

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Request OS permission and create a browser PushSubscription. */
export async function requestAndSubscribe(): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };
  const vapidPub = process.env.NEXT_PUBLIC_VAPID_KEY;
  if (!vapidPub) return { ok: false, reason: "no-vapid" };
  const reg = await navigator.serviceWorker.ready;
  const keyBytes = urlBase64ToUint8Array(vapidPub);
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
}

function bodyFor(
  sub: Pick<PushSubscription, "endpoint" | "getKey">,
  morningTime: string,
  eveningTime: string,
) {
  return JSON.stringify({
    endpoint: sub.endpoint,
    keys: {
      p256dh: bufToB64(sub.getKey("p256dh")),
      auth: bufToB64(sub.getKey("auth")),
    },
    morningTime,
    eveningTime,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

/** Persist a subscription on the server. Returns the raw Response so callers
 *  can detect 401 (signed-out) and stash for later. */
export async function persistSubscription(
  sub: PushSubscription,
  morningTime: string = MORNING_DEFAULT,
  eveningTime: string = EVENING_DEFAULT,
): Promise<Response> {
  return fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: bodyFor(sub, morningTime, eveningTime),
  });
}

export async function removeSubscription(): Promise<void> {
  const sub = await getExistingSubscription();
  if (!sub) return;
  await fetch(
    `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
    { method: "DELETE" },
  );
  await sub.unsubscribe();
}

// --- Anonymous → signed-in handoff --------------------------------------

type PendingPush = {
  endpoint: string;
  p256dh: string;
  auth: string;
  morningTime: string;
  eveningTime: string;
  timezone: string;
};

/** Stash a subscription captured while signed-out, to persist after login. */
export function stashPending(
  sub: PushSubscription,
  morningTime: string = MORNING_DEFAULT,
  eveningTime: string = EVENING_DEFAULT,
): void {
  if (typeof window === "undefined") return;
  try {
    const pending: PendingPush = {
      endpoint: sub.endpoint,
      p256dh: bufToB64(sub.getKey("p256dh")),
      auth: bufToB64(sub.getKey("auth")),
      morningTime,
      eveningTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* ignore */
  }
}

/** Persist any stashed subscription now that the user is signed in. */
export async function flushPending(): Promise<void> {
  if (typeof window === "undefined") return;
  let pending: PendingPush;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return;
    pending = JSON.parse(raw) as PendingPush;
  } catch {
    return;
  }
  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: pending.endpoint,
        keys: { p256dh: pending.p256dh, auth: pending.auth },
        morningTime: pending.morningTime,
        eveningTime: pending.eveningTime,
        timezone: pending.timezone,
      }),
    });
    if (res.ok) window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* leave it stashed; next sign-in retries */
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
