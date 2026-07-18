import "server-only";

// Shared push transport layer, used by BOTH the hourly reminder cron
// (app/api/cron/push-deliver) and the admin broadcast
// (app/api/admin/push/send). One implementation of each transport so
// delivery + dead-token pruning never drift between them.
//
// Every transport is dry-run-safe: with its credentials unset it counts
// candidates and sends nothing, never throwing. Canonical payload shape is
// { title, body, url } (matches public/sw.js and lib/push/native.ts).

import type { SupabaseClient } from "@supabase/supabase-js";
import { apnsConfigured, sendApns } from "./providers/apns";
import { fcmConfigured, sendFcm } from "./providers/fcm";

export { apnsConfigured, fcmConfigured };

export type PushPayload = { title: string; body: string; url: string };
export type WebSub = { endpoint: string; p256dh: string; auth: string };
export type NativeToken = { token: string; platform: "ios" | "android" };

export function webPushConfigured(): boolean {
  return !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

let webpushMod: typeof import("web-push") | null = null;
async function loadWebPush(): Promise<typeof import("web-push") | null> {
  if (webpushMod) return webpushMod;
  try {
    const m = await import("web-push");
    webpushMod = (m.default ?? m) as typeof import("web-push");
    webpushMod.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    return webpushMod;
  } catch {
    return null;
  }
}

/**
 * Send one Web Push message. Updates last_sent_at on success; prunes the
 * subscription on a 410/404 (gone). Returns the outcome for tallying.
 */
export async function sendWebPushOne(
  supa: SupabaseClient,
  sub: WebSub,
  payload: PushPayload & { kind?: string },
): Promise<{ ok: boolean; gone: boolean }> {
  const webpush = await loadWebPush();
  if (!webpush) return { ok: false, gone: false };
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    await supa
      .from("push_subscriptions")
      .update({ last_sent_at: new Date().toISOString() })
      .eq("endpoint", sub.endpoint);
    return { ok: true, gone: false };
  } catch (e) {
    const msg = String(e);
    const gone = msg.includes("410") || msg.includes("404");
    if (gone) {
      await supa.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    }
    return { ok: false, gone };
  }
}

/**
 * Send one native message via the right transport. Updates last_sent_at on
 * success; prunes the token when the provider reports it gone.
 */
export async function sendNativeOne(
  supa: SupabaseClient,
  t: NativeToken,
  payload: PushPayload,
): Promise<{ ok: boolean; gone: boolean; skipped: boolean }> {
  const configured = t.platform === "ios" ? apnsConfigured() : fcmConfigured();
  if (!configured) return { ok: false, gone: false, skipped: true };
  const res =
    t.platform === "ios"
      ? await sendApns(t.token, payload)
      : await sendFcm(t.token, payload);
  if (res.ok) {
    await supa
      .from("device_push_tokens")
      .update({ last_sent_at: new Date().toISOString() })
      .eq("token", t.token);
    return { ok: true, gone: false, skipped: false };
  }
  if (res.gone) {
    await supa.from("device_push_tokens").delete().eq("token", t.token);
  }
  return { ok: false, gone: !!res.gone, skipped: false };
}

export type BroadcastResult = {
  web: { sent: number; failed: number; candidates: number; dryRun: boolean };
  native: {
    sent: number;
    failed: number;
    skipped: number;
    candidates: number;
    dryRun: boolean;
  };
};

/**
 * Honest delivery status for a broadcast log row: `enqueued` when every
 * transport dry-ran (no secrets, nothing left), `sent` when at least one
 * real delivery succeeded, else `failed`. Never claims a delivery that did
 * not happen.
 */
export function broadcastStatus(
  r: BroadcastResult,
): "sent" | "failed" | "enqueued" {
  if (r.web.dryRun && r.native.dryRun) return "enqueued";
  const sent = r.web.sent + r.native.sent;
  const failed = r.web.failed + r.native.failed;
  if (sent > 0) return "sent";
  if (failed > 0) return "failed";
  return "enqueued";
}

/** Send one payload to an explicit set of web subs + native tokens. */
export async function broadcast(
  supa: SupabaseClient,
  payload: PushPayload,
  targets: { webSubs: WebSub[]; tokens: NativeToken[] },
): Promise<BroadcastResult> {
  const web = { sent: 0, failed: 0, candidates: targets.webSubs.length, dryRun: false };
  if (!webPushConfigured()) {
    web.dryRun = true;
  } else {
    for (const s of targets.webSubs) {
      const r = await sendWebPushOne(supa, s, payload);
      if (r.ok) web.sent++;
      else web.failed++;
    }
  }

  const native = {
    sent: 0,
    failed: 0,
    skipped: 0,
    candidates: targets.tokens.length,
    dryRun: false,
  };
  if (!apnsConfigured() && !fcmConfigured()) {
    native.dryRun = true;
  } else {
    for (const t of targets.tokens) {
      const r = await sendNativeOne(supa, t, payload);
      if (r.ok) native.sent++;
      else if (r.skipped) native.skipped++;
      else native.failed++;
    }
  }

  return { web, native };
}
