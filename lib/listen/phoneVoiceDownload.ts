"use client";

// The on-phone voice's download, as a job the app keeps (1.9).
//
// The owner's word, 2026-11-11: "only a reader who chooses it downloads it,
// about 90 MB once". So nothing here starts by itself for the first time: a
// download begins from the reader's tap, and only one already begun is picked
// up again when the app opens.
//
// What is fetched, and from where. One list, manifest.json in Purify's own
// storage (PHONE_VOICE_STORE), names every file of the engine with its size
// and its SHA-256. The files are fetched from the same storage and from
// nowhere else, each is checked against the list before it is kept, and a
// file that does not match is thrown away: a reader's phone never runs an
// engine the list does not name. Nothing the reader reads is sent anywhere;
// the only requests are for these files.
//
// How it behaves, the way saving a book does (lib/readAloud/saving.ts, whose
// connection it shares):
//   - on mobile data it waits for Wi-Fi, saying so, and the reader may choose
//     mobile data for this download;
//   - with no signal it waits for one and goes on when it is back;
//   - a file already kept is not fetched again, so stopping and starting goes
//     on from the last whole file;
//   - Remove frees every byte.
//
// THE ENGINE IS NOT HERE. This file fetches and keeps; what speaks is behind
// PhoneVoiceEngine (./phoneVoiceEngine.ts), which is a stub until the engine
// has been measured on a phone.

import { useSyncExternalStore } from "react";

import { connection, waitingFor, type Net, type Waiting } from "@/lib/readAloud/saving";

import { PHONE_VOICE_STORE } from "./phoneVoices";

/** The list of the engine's files, in Purify's own storage. */
export const PHONE_VOICE_MANIFEST = `${PHONE_VOICE_STORE}/manifest.json`;

/** The name the files are kept under on the phone. A new engine takes a new name, and the old one is removed. */
export const PHONE_VOICE_CACHE = "purify-phone-voice-v1";

const KEY = "purify:phoneVoice.download";

export type ManifestFile = { path: string; bytes: number; sha256: string };
export type Manifest = { version: number; files: ManifestFile[] };

export type DownloadState =
  /** Not on the phone, and not asked for. */
  | { phase: "none" }
  | { phase: "waiting"; waiting: Waiting; done: number; total: number }
  | { phase: "fetching"; done: number; total: number }
  | { phase: "ready"; bytes: number }
  /** The storage would not give a file, or gave one that is not the list's. Nothing unchecked is kept. */
  | { phase: "failed"; reason: "manifest" | "file" | "checksum" | "space" };

/** Where the files are kept on the phone: the web view's cache, or a stand-in in tests. */
export type Store = {
  has(path: string, bytes: number): Promise<boolean>;
  put(path: string, body: ArrayBuffer): Promise<void>;
  clear(): Promise<void>;
};

/** How a file is fetched and checked: the web's own, or stand-ins in tests. */
export type Wire = {
  fetch(url: string): Promise<{ ok: boolean; json(): Promise<unknown>; arrayBuffer(): Promise<ArrayBuffer> }>;
  sha256(body: ArrayBuffer): Promise<string>;
};

const cacheStore: Store = {
  async has(path, bytes) {
    const hit = await (await caches.open(PHONE_VOICE_CACHE)).match(`${PHONE_VOICE_STORE}/${path}`);
    return !!hit && Number(hit.headers.get("content-length")) === bytes;
  },
  async put(path, body) {
    const cache = await caches.open(PHONE_VOICE_CACHE);
    await cache.put(
      `${PHONE_VOICE_STORE}/${path}`,
      new Response(body, { headers: { "content-length": String(body.byteLength), "content-type": "application/octet-stream" } }),
    );
  },
  async clear() {
    await caches.delete(PHONE_VOICE_CACHE);
  },
};

const webWire: Wire = {
  // No cookie and no referrer go with the request: the storage learns nothing of the reader but that a phone asked.
  fetch: (url) => fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" }),
  async sha256(body) {
    const digest = await crypto.subtle.digest("SHA-256", body);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  },
};

/** A manifest as the storage gives it, or null where it is not one: every path plain, every size and sum well formed. */
export function readManifest(raw: unknown): Manifest | null {
  const m = raw as Partial<Manifest> | null;
  if (!m || !Number.isInteger(m.version) || !Array.isArray(m.files) || m.files.length === 0) return null;
  const files: ManifestFile[] = [];
  for (const f of m.files as Partial<ManifestFile>[]) {
    if (typeof f?.path !== "string" || !/^[a-z0-9_][a-z0-9_./-]*$/i.test(f.path) || f.path.includes("..")) return null;
    if (!Number.isInteger(f.bytes) || (f.bytes as number) <= 0) return null;
    if (typeof f.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(f.sha256)) return null;
    files.push({ path: f.path, bytes: f.bytes as number, sha256: f.sha256 });
  }
  if (new Set(files.map((f) => f.path)).size !== files.length) return null;
  return { version: m.version as number, files };
}

/** What the reader is told the download weighs, before it starts. */
export function manifestBytes(m: Manifest): number {
  return m.files.reduce((sum, f) => sum + f.bytes, 0);
}

type Pending = { mobileData: boolean };

const NONE: DownloadState = { phase: "none" };

let net: Net | null = null;
let store: Store = cacheStore;
let wire: Wire = webWire;
let state: DownloadState = NONE;
let running = false;
let stopAsked = false;
let unwatch: (() => void) | null = null;
const listeners = new Set<() => void>();

const theNet = (): Net => net ?? connection();

function set(next: DownloadState): void {
  state = next;
  for (const l of listeners) l();
}

function readPending(): Pending | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { mobileData: (JSON.parse(raw) as Partial<Pending>).mobileData === true } : null;
  } catch {
    return null;
  }
}

function writePending(p: Pending | null): void {
  try {
    if (p) window.localStorage.setItem(KEY, JSON.stringify(p));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* a full or private store: the download lasts this session */
  }
}

function stopWatching(): void {
  unwatch?.();
  unwatch = null;
}

/** Wait for the connection to change, then try again. */
function watch(): void {
  if (unwatch) return;
  unwatch = theNet().watch(() => {
    stopWatching();
    if (running) stopAsked = true;
    else void run();
  });
}

async function run(): Promise<void> {
  if (running) return;
  const pending = readPending();
  if (!pending) return;
  running = true;
  stopAsked = false;
  try {
    const status = await theNet().status();
    const first = waitingFor(status, pending.mobileData);
    if (first) {
      const kept = state.phase === "fetching" || state.phase === "waiting" ? state : { done: 0, total: 0 };
      set({ phase: "waiting", waiting: first, done: kept.done, total: kept.total });
      watch();
      return;
    }

    const listed = await wire.fetch(PHONE_VOICE_MANIFEST).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const manifest = readManifest(listed);
    if (!manifest) {
      // No signal after all waits for one; a list that is not a list ends it.
      const again = waitingFor(await theNet().status(), pending.mobileData);
      if (again) {
        set({ phase: "waiting", waiting: again, done: 0, total: 0 });
        watch();
      } else {
        writePending(null);
        set({ phase: "failed", reason: "manifest" });
      }
      return;
    }

    const total = manifestBytes(manifest);
    let done = 0;
    set({ phase: "fetching", done, total });
    // The connection is watched while it fetches: a move to mobile data stops it after the file in hand.
    watch();

    for (const file of manifest.files) {
      if (await store.has(file.path, file.bytes).catch(() => false)) {
        done += file.bytes;
        set({ phase: "fetching", done, total });
        continue;
      }
      if (stopAsked || !readPending()) break;

      const body = await wire
        .fetch(`${PHONE_VOICE_STORE}/${file.path}`)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null);
      if (!readPending()) break; // removed or cancelled while it fetched
      if (!body) {
        const again = waitingFor(await theNet().status(), readPending()?.mobileData ?? false);
        if (again) {
          set({ phase: "waiting", waiting: again, done, total });
          watch();
        } else {
          writePending(null);
          stopWatching();
          set({ phase: "failed", reason: "file" });
        }
        return;
      }
      if (body.byteLength !== file.bytes || (await wire.sha256(body)) !== file.sha256) {
        writePending(null);
        stopWatching();
        set({ phase: "failed", reason: "checksum" });
        return;
      }
      try {
        await store.put(file.path, body);
      } catch {
        writePending(null);
        stopWatching();
        set({ phase: "failed", reason: "space" });
        return;
      }
      done += file.bytes;
      set({ phase: "fetching", done, total });
    }

    if (!readPending()) return; // cancelled: cancelPhoneVoice has set the state
    if (stopAsked) {
      const now = waitingFor(await theNet().status(), readPending()?.mobileData ?? false);
      if (now) {
        set({ phase: "waiting", waiting: now, done, total });
        watch();
        return;
      }
      running = false;
      return void run();
    }
    stopWatching();
    writePending(null);
    try {
      window.localStorage.setItem(`${KEY}.ready`, String(total));
    } catch {
      /* it is found again from the files themselves */
    }
    set({ phase: "ready", bytes: total });
  } finally {
    running = false;
  }
}

/** Begin the download, from the reader's tap and never otherwise. */
export async function startPhoneVoice(): Promise<void> {
  if (running || state.phase === "ready") return;
  if (!readPending()) writePending({ mobileData: false });
  await run();
}

/** The reader's choice while it waits for Wi-Fi: use mobile data for this download. */
export async function phoneVoiceOverMobileData(): Promise<void> {
  if (!readPending()) return;
  writePending({ mobileData: true });
  if (running) return;
  await run();
}

/** Stop: the whole files already kept stay, so starting again goes on from them. */
export function cancelPhoneVoice(): void {
  if (state.phase === "ready") return;
  writePending(null);
  stopWatching();
  if (running) stopAsked = true;
  set(NONE);
}

/** Take the engine off the phone: every file, and the note that it was there. */
export async function removePhoneVoice(): Promise<void> {
  writePending(null);
  stopWatching();
  if (running) stopAsked = true;
  try {
    window.localStorage.removeItem(`${KEY}.ready`);
  } catch {
    /* nothing kept */
  }
  await store.clear().catch(() => {});
  set(NONE);
}

/** When the app opens: say what is on the phone, and go on with a download left unfinished. */
export async function resumePhoneVoice(): Promise<void> {
  if (running) return;
  if (readPending()) return void (await run());
  if (state.phase !== "none") return;
  try {
    const bytes = Number(window.localStorage.getItem(`${KEY}.ready`));
    if (Number.isFinite(bytes) && bytes > 0) set({ phase: "ready", bytes });
  } catch {
    /* not known: it shows as not downloaded, and a tap finds the files already kept */
  }
}

export function getPhoneVoice(): DownloadState {
  return state;
}

export function usePhoneVoice(): DownloadState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => state,
    () => NONE,
  );
}

/** For tests: stand-ins for the connection, the phone's store and the wire, and everything forgotten. */
export function resetPhoneVoiceForTests(stand: { net: Net; store: Store; wire: Wire }): void {
  stopWatching();
  net = stand.net;
  store = stand.store;
  wire = stand.wire;
  state = NONE;
  running = false;
  stopAsked = false;
}
