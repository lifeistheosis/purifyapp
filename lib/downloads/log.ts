"use client";

// Every download on this phone, for the bell's sheet and the phone's own
// notifications (1.9, build 95 note 23; the owner, 2026-11-13: "whenever you
// are downloading something it should show up on your notification bar and
// also show up on your notifications in the app (its status and when it
// finishes)").
//
// A reader downloads three things, each kept by its own store: a Bible
// (lib/bible/downloads/store.ts), a book's readings to listen offline
// (lib/readAloud/saving.ts) and a chant's recording (lib/chants/offline.ts).
// components/native/DownloadsBridge.tsx watches the three and writes here what
// each is doing; the bell's sheet reads it (components/nav/NotificationsSheet.tsx),
// and the phone is told (./notice.ts).
//
// Kept on the device (purify:downloads), newest first: the last eight, and an
// ended one for a week. Nothing here leaves the phone.

import { useSyncExternalStore } from "react";

export type DownloadKind = "bible" | "book" | "chant";

/** Running, waiting (for Wi-Fi or a signal), or ended: done, or failed. */
export type DownloadState = "running" | "waiting" | "done" | "failed";

/** The words of a download's line: a message key and its values. */
export type DownloadWords = { key: string; vars?: Record<string, string | number> };

export type Download = {
  /** "bible:ru-synodal", "book:luke", "chant:<slug>/<version>". */
  key: string;
  kind: DownloadKind;
  /** What it is, in the reader's words as it began: a Bible's own title, a book's name, a chant with its version. */
  name: string;
  state: DownloadState;
  /** How far it has come, 0 to 1. */
  share: number;
  /** A book's chapters saved and in all; 0 for the others. */
  done: number;
  total: number;
  /** While waiting: what for. */
  waiting?: "wifi" | "signal";
  /** Once failed: why, in its own words. */
  failure?: DownloadWords;
  /** When it began, and when it ended. */
  at: string;
  ended?: string;
  /** Its end has been seen in the bell's sheet. */
  seen?: boolean;
};

const KEY = "purify:downloads";
/** The most kept. */
export const KEPT = 8;
/** How long an ended one is kept. */
export const KEPT_MS = 7 * 24 * 60 * 60 * 1000;

const STATES: readonly DownloadState[] = ["running", "waiting", "done", "failed"];
const KINDS: readonly DownloadKind[] = ["bible", "book", "chant"];

export const isEnded = (d: Pick<Download, "state">): boolean => d.state === "done" || d.state === "failed";

function valid(d: unknown): d is Download {
  if (!d || typeof d !== "object") return false;
  const x = d as Partial<Download>;
  return (
    typeof x.key === "string" &&
    KINDS.includes(x.kind as DownloadKind) &&
    typeof x.name === "string" &&
    STATES.includes(x.state as DownloadState) &&
    typeof x.share === "number" &&
    typeof x.at === "string"
  );
}

/** What is kept, as it should be: valid, newest first, ended ones a week, at most eight. */
export function keep(list: readonly Download[], now: number = Date.now()): Download[] {
  const out: Download[] = [];
  const seenKeys = new Set<string>();
  for (const d of list) {
    if (!valid(d) || seenKeys.has(d.key)) continue;
    seenKeys.add(d.key);
    if (isEnded(d) && now - Date.parse(d.ended ?? d.at) > KEPT_MS) continue;
    out.push(d);
  }
  return out.slice(0, KEPT);
}

function readRaw(): Download[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? keep(parsed as Download[]) : [];
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();
const NONE: Download[] = [];
let snapshot: Download[] | null = null;

function write(list: Download[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* a full or private store: this session still sees it */
  }
  snapshot = list;
  for (const l of listeners) l();
}

/** Every download kept, newest first. Empty on the server. */
export function readDownloads(): Download[] {
  if (typeof window === "undefined") return NONE;
  snapshot ??= readRaw();
  return snapshot;
}

/**
 * A download as it is now: a new one goes to the top, one already kept is
 * changed where it stands, and one that begins again (a Bible tried again)
 * goes back to the top as new.
 */
export function putDownload(d: Download): void {
  const list = readDownloads();
  const at = list.findIndex((x) => x.key === d.key);
  const again = at >= 0 && isEnded(list[at]) && !isEnded(d);
  const next = at < 0 || again ? [d, ...list.filter((x) => x.key !== d.key)] : list.map((x, i) => (i === at ? d : x));
  write(keep(next));
}

/** A download let go before its end (stopped by the reader): not kept. */
export function dropDownload(key: string): void {
  const list = readDownloads();
  if (list.some((d) => d.key === key)) write(list.filter((d) => d.key !== key));
}

/** The kept download for a key, if any. */
export function downloadOf(key: string): Download | null {
  return readDownloads().find((d) => d.key === key) ?? null;
}

/** An end the reader has not yet seen in the bell's sheet: it lights the bell. */
export function hasUnseenEnd(list: readonly Download[] = readDownloads()): boolean {
  return list.some((d) => isEnded(d) && !d.seen);
}

/** The bell's sheet was opened: every end in it is seen. */
export function markDownloadsSeen(): void {
  const list = readDownloads();
  if (list.some((d) => isEnded(d) && !d.seen)) write(list.map((d) => (isEnded(d) ? { ...d, seen: true } : d)));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The downloads kept, in step with every change. */
export function useDownloads(): Download[] {
  return useSyncExternalStore(subscribe, readDownloads, () => NONE);
}

/** For tests: forget what was read. */
export function resetDownloadsForTests(): void {
  snapshot = null;
  listeners.clear();
}
