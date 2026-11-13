"use client";

// A download told to the phone (1.9, build 95 note 23): on Android one
// notification for it in the bar, its progress while it runs and then its
// end; on an iPhone, which shows no progress there, a notification when it
// ends. Posted by the app's own plugin, DownloadNotice
// (android/app/src/main/java/net/purifyapp/purify/downloads/DownloadNoticePlugin.java,
// ios/App/App/DownloadNoticePlugin.swift), registered as the widgets' bridge
// is. Nothing on the website.
//
// No foreground service and nothing that needs a store's declaration: a
// download goes on while Purify runs, and the phone may pause it once Purify
// is left; Android clears a progress notice nobody has refreshed in a while
// (STALE_MS on the phone's side), so none is left standing at a number.
//
// The phone posts nothing the reader has not allowed. The first download asks
// once whether Purify may (ASK_AT_FIRST_DOWNLOAD, his call): the bar needs it
// on Android 13 and later and on an iPhone. Purify asks first, in its own
// words (his call of 2026-11-13 about 18:53 UTC: the app asks before the
// phone's prompt), and the phone's own prompt follows only a yes there
// (components/native/DownloadsBridge.tsx shows the ask). Not now is kept, and
// the phone's one prompt is left for another day. Either way the bell's sheet
// still shows every download.

import { nativePlugin } from "@/lib/platform/nativePlugin";

import type { Download, DownloadState } from "./log";

type DownloadNotice = {
  post(o: { id: number; title: string; text: string; share: number; state: DownloadState }): Promise<void>;
  clear(o: { id: number }): Promise<void>;
};

/** Ask whether Purify may notify, once, at the first download (his call, build 95 note 23). */
export const ASK_AT_FIRST_DOWNLOAD = true;

/** A running notice is told again at least this often, so a slow download's never goes stale. */
export const HEARTBEAT_MS = 60_000;
/** And not more often than this as it moves, a whole percent at a time. */
export const STEP_MS = 1000;

const ASKED_KEY = "purify:downloads.askedToNotify";

/** A download's number on the phone: always the same for the same download. */
export function noticeId(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return 70_000 + (Math.abs(h) % 10_000);
}

type Told = { state: DownloadState; percent: number; at: number };
const told = new Map<string, Told>();

/** Whether this state of a download is worth telling the phone: a change of state always, progress a whole percent at a time and not too often, and a heartbeat. */
export function worthTelling(d: Pick<Download, "key" | "state" | "share">, now: number): boolean {
  const before = told.get(d.key);
  if (!before || before.state !== d.state) return true;
  if (d.state !== "running") return false;
  if (now - before.at >= HEARTBEAT_MS) return true;
  return Math.floor(d.share * 100) !== before.percent && now - before.at >= STEP_MS;
}

function askedBefore(): boolean {
  try {
    return window.localStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return true;
  }
}

function markAsked(): void {
  try {
    window.localStorage.setItem(ASKED_KEY, "1");
  } catch {
    /* asked again next time, which the phone itself answers without asking twice */
  }
}

type Permissions = {
  check(): Promise<string>;
  request(): Promise<string>;
};

/** The phone's own answer on notifications, as the reminders ask it (lib/push/native.ts). */
const phonePermissions: Permissions = {
  async check() {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    return (await PushNotifications.checkPermissions()).receive;
  },
  async request() {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    return (await PushNotifications.requestPermissions()).receive;
  },
};

let permissions: Permissions = phonePermissions;
let plugin: () => Promise<{ api: DownloadNotice } | null> = () => nativePlugin<DownloadNotice>("DownloadNotice");

/** Purify's own ask, in its words: the reader's answer, yes or not now. */
type Asker = () => Promise<boolean>;
let asker: Asker | null = null;
let asking: Promise<void> | null = null;

/**
 * Who asks the reader in Purify's own words (components/native/DownloadsBridge.tsx).
 * Without one nothing is asked at all: the phone's prompt never comes first.
 */
export function onAskToNotify(ask: Asker): () => void {
  asker = ask;
  return () => {
    if (asker === ask) asker = null;
  };
}

/**
 * At a download's start: the first one ever asks, once, whether Purify may
 * show notifications, when the phone has not been asked. Purify asks in its
 * own words first, and the phone's own prompt follows only a yes; never again
 * after an answer, whatever it was. Two downloads begun together ask once.
 */
export function askOnceToNotify(): Promise<void> {
  if (!ASK_AT_FIRST_DOWNLOAD || askedBefore() || !asker) return Promise.resolve();
  asking ??= (async () => {
    try {
      if ((await permissions.check()) !== "prompt" || !asker) return;
      // Kept as asked once the reader has answered: an ask that never came
      // to an answer (Purify closed while it waited) is asked again.
      const yes = await asker();
      markAsked();
      if (!yes) return;
      await permissions.request();
    } catch {
      /* no answer: the bell's sheet still shows the download */
    } finally {
      asking = null;
    }
  })();
  return asking;
}

/** Tell the phone a download's state, in the reader's words; nothing when not worth it, or on the website. */
export async function tellPhone(d: Pick<Download, "key" | "state" | "share">, title: string, text: string, now: number = Date.now()): Promise<boolean> {
  if (!worthTelling(d, now)) return false;
  told.set(d.key, { state: d.state, percent: Math.floor(d.share * 100), at: now });
  const box = await plugin();
  if (!box) return false;
  try {
    await box.api.post({ id: noticeId(d.key), title, text, share: d.share, state: d.state });
    return true;
  } catch {
    return false;
  }
}

/** A download let go: its notice taken off the phone. */
export async function clearPhone(key: string): Promise<void> {
  told.delete(key);
  const box = await plugin();
  if (!box) return;
  try {
    await box.api.clear({ id: noticeId(key) });
  } catch {
    /* already gone */
  }
}

/** For tests: a stand-in plugin and permissions, and nothing told yet. */
export function resetNoticeForTests(stand: { plugin?: DownloadNotice | null; permissions?: Permissions } = {}): void {
  told.clear();
  asker = null;
  asking = null;
  permissions = stand.permissions ?? phonePermissions;
  plugin = "plugin" in stand ? async () => (stand.plugin ? { api: stand.plugin } : null) : () => nativePlugin<DownloadNotice>("DownloadNotice");
}
