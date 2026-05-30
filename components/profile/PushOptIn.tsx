"use client";

// Opt-in opt-out toggle + time pickers for prayer reminders. Lives in
// the signed-in account page. Pure browser Push API; no third-party
// notification provider.

import { useEffect, useState } from "react";

type State =
  | { kind: "loading" }
  | { kind: "unsupported" }
  | { kind: "subscribed"; morningTime: string | null; eveningTime: string | null }
  | { kind: "not-subscribed" }
  | { kind: "denied" };

export function PushOptIn() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState({ kind: "unsupported" });
      return;
    }
    if (Notification.permission === "denied") {
      setState({ kind: "denied" });
      return;
    }
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setState({
            kind: "subscribed",
            morningTime: null,
            eveningTime: null,
          });
        } else {
          setState({ kind: "not-subscribed" });
        }
      } catch {
        setState({ kind: "not-subscribed" });
      }
    })();
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState({ kind: "denied" });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const vapidPub = process.env.NEXT_PUBLIC_VAPID_KEY;
      if (!vapidPub) {
        alert(
          "Push reminders are not yet enabled on this build (VAPID key missing).",
        );
        return;
      }
      const keyBytes = urlBase64ToUint8Array(vapidPub);
      // Slice into a fresh ArrayBuffer so TS sees ArrayBufferView<ArrayBuffer>,
      // not the wider Uint8Array<ArrayBufferLike> Node-style return.
      const appServerKey = keyBytes.buffer.slice(
        keyBytes.byteOffset,
        keyBytes.byteOffset + keyBytes.byteLength,
      ) as ArrayBuffer;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: bufToB64(sub.getKey("p256dh")),
            auth: bufToB64(sub.getKey("auth")),
          },
          morningTime: "07:00",
          eveningTime: "21:00",
          timezone: tz,
        }),
      });
      setState({
        kind: "subscribed",
        morningTime: "07:00",
        eveningTime: "21:00",
      });
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(
          `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
          { method: "DELETE" },
        );
        await sub.unsubscribe();
      }
      setState({ kind: "not-subscribed" });
    } finally {
      setBusy(false);
    }
  }

  async function updateTimes(morning: string, evening: string) {
    if (state.kind !== "subscribed") return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: bufToB64(sub.getKey("p256dh")),
            auth: bufToB64(sub.getKey("auth")),
          },
          morningTime: morning,
          eveningTime: evening,
          timezone: tz,
        }),
      });
      setState({
        kind: "subscribed",
        morningTime: morning,
        eveningTime: evening,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-paper/12 bg-paper/[0.03] p-5">
      <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
        Prayer reminders
      </p>
      <p className="font-serif text-[16px] text-paper/85 leading-[1.6] mb-4">
        One nudge in the morning, one in the evening. Off by default. No
        third-party notification provider; the Web Push API runs in your
        browser only.
      </p>
      {state.kind === "loading" && (
        <p className="font-sans text-[13px] text-paper/55 italic">Checking…</p>
      )}
      {state.kind === "unsupported" && (
        <p className="font-sans text-[13px] text-paper/55">
          Your browser does not support Web Push. Try a recent Chrome,
          Edge, or Firefox.
        </p>
      )}
      {state.kind === "denied" && (
        <p className="font-sans text-[13px] text-paper/55">
          Notifications are blocked at the browser level. Re-enable them in
          your site settings and refresh.
        </p>
      )}
      {state.kind === "not-subscribed" && (
        <button
          type="button"
          onClick={subscribe}
          disabled={busy}
          className="rounded-pill border border-gold/40 bg-gold/[0.08] text-gold px-5 py-2 font-sans text-[13px] font-semibold hover:bg-gold/[0.14] transition-colors disabled:opacity-40"
        >
          {busy ? "Subscribing…" : "Turn on reminders"}
        </button>
      )}
      {state.kind === "subscribed" && (
        <div className="space-y-3">
          <div className="flex gap-4 flex-wrap items-end">
            <label className="flex flex-col gap-1">
              <span className="font-sans text-[12px] text-paper/55">
                Morning
              </span>
              <input
                type="time"
                defaultValue={state.morningTime ?? "07:00"}
                onBlur={(e) =>
                  updateTimes(e.target.value, state.eveningTime ?? "21:00")
                }
                className="rounded-md border border-paper/15 bg-night px-3 py-1.5 font-sans text-[13px] text-paper"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-sans text-[12px] text-paper/55">
                Evening
              </span>
              <input
                type="time"
                defaultValue={state.eveningTime ?? "21:00"}
                onBlur={(e) =>
                  updateTimes(state.morningTime ?? "07:00", e.target.value)
                }
                className="rounded-md border border-paper/15 bg-night px-3 py-1.5 font-sans text-[13px] text-paper"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={unsubscribe}
            disabled={busy}
            className="font-sans text-[12.5px] text-paper/55 hover:text-paper transition-colors disabled:opacity-40"
          >
            Turn off reminders
          </button>
        </div>
      )}
    </section>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const b64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToB64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str);
}
