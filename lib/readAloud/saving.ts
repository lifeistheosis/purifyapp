"use client";

// Saving a book to listen offline, as a job the app keeps (1.9, s3-09 of
// docs/1.9-build/ideas.json: "does saving pick up again after a lost signal,
// and can it wait for Wi-Fi?").
//
// Until 1.9 it did neither. The saving lived in the screen's memory: a signal
// lost half way failed every chapter after it, the app closed ended it, and
// Save again began the book from its first chapter, fetching again what the
// phone already had. And it saved over whatever connection there was.
//
// Now the book being saved is kept on the device until every chapter of it is
// (purify:readAloud.saving), and:
//
//  - Saving skips the chapters already saved, so starting again goes on from
//    where it stopped.
//  - On mobile data it waits for Wi-Fi, saying so, and the reader can choose
//    to use mobile data for this book. A move from Wi-Fi to mobile data while
//    it saves stops it after the chapter in hand, to wait again.
//  - With no signal it waits for one, and goes on by itself when it is back,
//    the next time the app opens included (components/native/SavingBridge.tsx).
//  - Chapters the website would not give, with the phone connected, are left
//    to play online, as before: the job ends, and Save tries them again.
//
// Nothing here asks for Plus on the reader's behalf: the screens ask before a
// saving starts, and a saving picked up by itself is dropped, quietly, for a
// reader who no longer has Plus.

import { useSyncExternalStore } from "react";

import { plusFeaturesNow } from "@/lib/entitlements/usePlusFeatures";
import { streamedUrl } from "@/lib/media/streamed";

import { readAloudRecording } from "./chapters";
import { saveChapters, savedChapters } from "./offline";

const KEY = "purify:readAloud.saving";

/** Why a saving is waiting: for Wi-Fi (on mobile data), or for any signal at all. */
export type Waiting = "wifi" | "signal";

/** The book being saved, how far it has come, and whether it is waiting. */
export type SavingJob = { book: string; done: number; total: number; waiting: Waiting | null };

export type SavingState = {
  job: SavingJob | null;
  /** The last book whose saving ended with chapters the website would not give. */
  failed: string | null;
};

/** The book being saved, as kept on the device. */
type Pending = { book: string; chapters: number[]; mobileData: boolean };

/** The connection, as @capacitor/network tells it. */
export type NetStatus = { connected: boolean; type: "wifi" | "cellular" | "none" | "unknown" };

/** Where the connection is read and watched: the apps' network plugin, or a stand-in in tests. */
export type Net = {
  status(): Promise<NetStatus>;
  watch(changed: (s: NetStatus) => void): () => void;
};

const appNet: Net = {
  async status() {
    try {
      const { Network } = await import("@capacitor/network");
      const s = await Network.getStatus();
      return { connected: s.connected, type: s.connectionType };
    } catch {
      return { connected: navigator.onLine !== false, type: "unknown" };
    }
  },
  watch(changed) {
    let gone = false;
    let remove: (() => void) | null = null;
    void import("@capacitor/network")
      .then(({ Network }) => Network.addListener("networkStatusChange", (s) => changed({ connected: s.connected, type: s.connectionType })))
      .then((handle) => {
        if (gone) void handle.remove();
        else remove = () => void handle.remove();
      })
      .catch(() => {});
    return () => {
      gone = true;
      remove?.();
    };
  },
};

const IDLE: SavingState = { job: null, failed: null };

let net: Net = appNet;
let state: SavingState = IDLE;
let running = false;
/** Set while it saves, to stop after the chapter in hand. */
let stopAsked = false;
let unwatch: (() => void) | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<SavingState>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

function readPending(): Pending | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    const p = raw ? (JSON.parse(raw) as Partial<Pending>) : null;
    if (!p || typeof p.book !== "string" || !Array.isArray(p.chapters)) return null;
    return { book: p.book, chapters: p.chapters.filter((c) => Number.isInteger(c)), mobileData: p.mobileData === true };
  } catch {
    return null;
  }
}

function writePending(p: Pending | null): void {
  try {
    if (p) window.localStorage.setItem(KEY, JSON.stringify(p));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* a full or private store: the saving lasts this session */
  }
}

/** Whether the connection lets this saving go on now, or what it waits for. */
export function waitingFor(s: NetStatus, mobileData: boolean): Waiting | null {
  if (!s.connected || s.type === "none") return "signal";
  if (s.type === "cellular" && !mobileData) return "wifi";
  return null;
}

/** The chapters of a book's saving not yet on the phone. */
function unsaved(p: Pending): number[] {
  const saved = savedChapters();
  return p.chapters.filter((c) => !saved[`${p.book}/${c}`]);
}

function urlsOf(book: string, chapter: number) {
  return { mp3: readAloudRecording(book, chapter), json: streamedUrl(`/audio/read/${book}/${chapter}.json`, true) };
}

function watch(): void {
  if (unwatch) return;
  unwatch = net.watch((s) => {
    const p = readPending();
    if (!p) return;
    const wait = waitingFor(s, p.mobileData);
    if (running) {
      if (wait) stopAsked = true;
      return;
    }
    if (!wait) void run();
    else if (state.job && state.job.waiting !== wait) set({ job: { ...state.job, waiting: wait } });
  });
}

function stopWatching(): void {
  unwatch?.();
  unwatch = null;
}

/** The saving is over: every chapter is on the phone, or it was let go. */
function end(failed: string | null): void {
  writePending(null);
  stopWatching();
  set({ job: null, failed });
}

async function run(): Promise<void> {
  if (running) return;
  const p = readPending();
  if (!p) return;
  const total = p.chapters.length;
  if (unsaved(p).length === 0) return end(null);

  const wait = waitingFor(await net.status(), p.mobileData);
  if (wait) {
    set({ job: { book: p.book, done: total - unsaved(p).length, total, waiting: wait } });
    watch();
    return;
  }
  // A saving picked up by itself is the reader's only while they have Plus.
  if ((await plusFeaturesNow()) === false) return end(null);
  if (running || !readPending()) return;

  running = true;
  stopAsked = false;
  const rest = unsaved(p);
  const before = total - rest.length;
  set({ job: { book: p.book, done: before, total, waiting: null }, failed: null });
  watch();
  try {
    await saveChapters(
      p.book,
      rest,
      (c) => urlsOf(p.book, c),
      (done) => {
        if (readPending()) set({ job: { book: p.book, done: before + done, total, waiting: null } });
      },
      undefined,
      () => stopAsked || !readPending(),
    );
  } finally {
    running = false;
  }

  const now = readPending();
  // Let go while it saved: what was saved stays.
  if (!now) return set({ job: null });
  const left = unsaved(now);
  if (left.length === 0) return end(null);
  const after = waitingFor(await net.status(), now.mobileData);
  if (after) {
    set({ job: { book: now.book, done: total - left.length, total, waiting: after } });
    watch();
    return;
  }
  // Stopped for a change of network that has already passed: go on.
  if (stopAsked) return run();
  // Connected, and the website would not give these: they play online.
  end(now.book);
}

/**
 * Save a book's chapters to listen offline (from the reader's tap, after Plus
 * is asked). A saving under way is left to finish. One that waits is that
 * book tried again now, or, for another book, let go for this one: the
 * chapters it saved stay, and its Save goes on from them.
 */
export async function startSaving(book: string, chapters: readonly number[]): Promise<void> {
  if (running) return;
  const waiting = readPending();
  if (waiting?.book !== book) writePending({ book, chapters: [...chapters], mobileData: false });
  set({ failed: null });
  await run();
}

/** The reader's choice while a saving waits for Wi-Fi: use mobile data for this book. */
export async function saveOverMobileData(): Promise<void> {
  const p = readPending();
  if (!p) return;
  writePending({ ...p, mobileData: true });
  await run();
}

/** Stop saving: the chapters already saved stay on the phone, and the rest play online. */
export function cancelSaving(): void {
  writePending(null);
  stopWatching();
  if (running) stopAsked = true;
  set({ job: null });
}

/** Pick up a saving left unfinished: when the app opens, and comes back to the front. */
export async function resumeSaving(): Promise<void> {
  if (running || !readPending()) return;
  await run();
}

export function getSaving(): SavingState {
  return state;
}

export function useSaving(): SavingState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => state,
    () => IDLE,
  );
}

/** For tests: a stand-in connection, and everything forgotten. */
export function resetSavingForTests(stand: Net): void {
  stopWatching();
  net = stand;
  state = IDLE;
  running = false;
  stopAsked = false;
}
