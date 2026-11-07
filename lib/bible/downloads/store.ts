"use client";

// The downloaded Bibles on a phone, and a book of one read for a page (1.9;
// ./catalog.ts says what they are and why none is carried in the apps).
//
// In the apps a Bible is downloaded when the reader asks for it: its list
// (public/bibles/<bible>/index.json), then each book's file, written to the
// app's own data folder (bibles/<bible>/<book>.json) with the Filesystem
// plugin, as offline listening keeps its recordings (lib/readAloud/offline.ts).
// Each book is checked against the list (its hash) before it is kept. A
// download that stops (no signal, the app closed) keeps the books it has, and
// the next one begins where it stopped. The Bible counts as on the phone once
// every book is there; what is on the phone is listed on the device
// (purify:bibles.saved), so a chapter knows at once.
//
// On the website nothing is downloaded: a book is fetched from the website's
// own folder when a chapter of it is opened, and the browser keeps it.
//
// A book is read once and kept while it is read (the last few books), so
// turning a chapter does not read the phone again.

import { useSyncExternalStore } from "react";

import { streamedUrl } from "@/lib/media/streamed";
import { isNativeClient } from "@/lib/platform/native";

import { downloadableBible, type BibleId } from "./catalog";
import { readBibleChoice, writeBibleChoice } from "./choice";

/** A verse: its label as its edition prints it (12, "2a", or "" for words before the first verse), and its words. */
export type BibleVerse = [label: number | string, text: string];

/** One book of a Bible, as scripts/bibles/build.mjs writes it. */
export type BibleBookFile = {
  bible: BibleId;
  book: string;
  hash: string;
  /** The app's chapters the edition has no verses for, and its chapter where they stand. */
  elsewhere?: Record<string, number>;
  /** The edition's chapters, its chapter 1 first. */
  chapters: BibleVerse[][];
};

/** A Bible's list of books on the website. */
export type BibleManifest = {
  bible: BibleId;
  version: string;
  bytes: number;
  books: { book: string; chapters: number; bytes: number; hash: string }[];
};

/** A Bible on the phone. */
export type SavedBible = { version: string; bytes: number; books: string[]; at: string };

/** A download under way, or one that stopped. */
export type BibleDownload =
  | { state: "downloading"; done: number; total: number }
  | { state: "failed"; reason: "offline" | "space" };

type Plugin = typeof import("@capacitor/filesystem");
type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

const SAVED_KEY = "purify:bibles.saved";
const PARTIAL_KEY = "purify:bibles.partial";
const EVENT = "purify:bibles";

/** The folder in the app's data where a Bible's books are kept. */
export function bibleFolder(id: BibleId): string {
  return `bibles/${id}`;
}

/** Where a book of a Bible is on the website: the page's own in a browser, the website's in the apps. */
export function bookUrl(id: BibleId, book: string, native: boolean = isNativeClient()): string {
  return streamedUrl(`/bibles/${id}/${book}.json`, native);
}

function manifestUrl(id: BibleId, native: boolean): string {
  return streamedUrl(`/bibles/${id}/index.json`, native);
}

// ---- What is on the phone -------------------------------------------------

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* a full or private store: the Bible stays on the phone, unlisted until the next download */
  }
}

function saved(): Record<string, SavedBible> {
  const all = readJson<Record<string, SavedBible>>(SAVED_KEY) ?? {};
  for (const id of Object.keys(all)) if (!downloadableBible(id)) delete all[id];
  return all;
}

/** The Bibles on the phone, by id. Empty on the website. */
export function savedBibles(): Record<string, SavedBible> {
  return typeof window === "undefined" ? {} : saved();
}

/** Whether a Bible's every book is on the phone. */
export function isSaved(id: BibleId): boolean {
  return Boolean(savedBibles()[id]);
}

// ---- Downloads under way ----------------------------------------------------

const downloads = new Map<BibleId, { progress: BibleDownload; controller: AbortController | null }>();
const listeners = new Set<() => void>();

function changed(): void {
  snapshot = null;
  for (const l of listeners) l();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

function setProgress(id: BibleId, progress: BibleDownload | null, controller: AbortController | null = null): void {
  if (progress) downloads.set(id, { progress, controller });
  else downloads.delete(id);
  changed();
}

export type BiblesState = { saved: Record<string, SavedBible>; downloads: Partial<Record<BibleId, BibleDownload>> };
const EMPTY: BiblesState = { saved: {}, downloads: {} };
let snapshot: BiblesState | null = null;
let savedRaw: string | null = null;

function read(): BiblesState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SAVED_KEY);
  } catch {
    raw = null;
  }
  if (!snapshot || raw !== savedRaw) {
    savedRaw = raw;
    const live: Partial<Record<BibleId, BibleDownload>> = {};
    for (const [id, d] of downloads) live[id] = d.progress;
    snapshot = { saved: saved(), downloads: live };
  }
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SAVED_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The Bibles on the phone and the downloads under way, kept in step. */
export function useBibles(): BiblesState {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

// ---- Downloading ------------------------------------------------------------

class Stopped extends Error {
  constructor(readonly reason: "offline" | "space" | "cancelled") {
    super(reason);
  }
}

/** A book's file read and checked: it is the book the list names, at the list's hash. */
function checkBook(text: string, id: BibleId, entry: BibleManifest["books"][number]): BibleBookFile | null {
  try {
    const file = JSON.parse(text) as BibleBookFile;
    const ok = file.bible === id && file.book === entry.book && file.hash === entry.hash && Array.isArray(file.chapters);
    return ok ? file : null;
  } catch {
    return null;
  }
}

async function fetchText(url: string, fetcher: Fetch, signal: AbortSignal, cache: RequestCache): Promise<string> {
  let res: Response;
  try {
    res = await fetcher(url, { signal, cache });
  } catch {
    throw new Stopped(signal.aborted ? "cancelled" : "offline");
  }
  if (!res.ok) throw new Stopped("offline");
  return res.text();
}

/**
 * Download a Bible to the phone, telling `progress` the bytes done of the
 * whole as each book is kept. Books kept by an earlier download of the same
 * version are not downloaded again. Resolves once every book is on the phone
 * and the Bible is listed; a download already under way is not started twice.
 */
export async function downloadBible(
  id: BibleId,
  { fetcher = (u, i) => fetch(u, i), plugin, native = isNativeClient() }: { fetcher?: Fetch; plugin?: Plugin; native?: boolean } = {},
): Promise<"saved" | "failed" | "cancelled" | "running"> {
  if (downloads.get(id)?.progress.state === "downloading") return "running";
  const controller = new AbortController();
  const signal = controller.signal;
  setProgress(id, { state: "downloading", done: 0, total: downloadableBible(id)?.bytes ?? 0 }, controller);
  try {
    const fs = plugin ?? (await import("@capacitor/filesystem"));
    const manifest = JSON.parse(await fetchText(manifestUrl(id, native), fetcher, signal, "no-cache")) as BibleManifest;
    if (manifest.bible !== id || !Array.isArray(manifest.books)) throw new Stopped("offline");

    // Books kept by an earlier download of this version.
    const partial = readJson<Record<string, { version: string; done: string[] }>>(PARTIAL_KEY) ?? {};
    const mine = partial[id]?.version === manifest.version ? partial[id] : { version: manifest.version, done: [] };
    partial[id] = mine;
    writeJson(PARTIAL_KEY, partial);
    const done = new Set(mine.done);
    let bytes = manifest.books.filter((b) => done.has(b.book)).reduce((n, b) => n + b.bytes, 0);
    setProgress(id, { state: "downloading", done: bytes, total: manifest.bytes }, controller);

    const queue = manifest.books.filter((b) => !done.has(b.book));
    const worker = async () => {
      for (let entry = queue.shift(); entry; entry = queue.shift()) {
        const url = bookUrl(id, entry.book, native);
        let text = await fetchText(url, fetcher, signal, "default");
        // A copy kept from an earlier version of the Bible: ask the website itself.
        if (!checkBook(text, id, entry)) text = await fetchText(url, fetcher, signal, "reload");
        if (!checkBook(text, id, entry)) throw new Stopped("offline");
        try {
          await fs.Filesystem.writeFile({
            path: `${bibleFolder(id)}/${entry.book}.json`,
            data: text,
            directory: fs.Directory.Data,
            encoding: fs.Encoding.UTF8,
            recursive: true,
          });
        } catch {
          throw new Stopped("space");
        }
        if (signal.aborted) throw new Stopped("cancelled");
        mine.done.push(entry.book);
        writeJson(PARTIAL_KEY, { ...(readJson<Record<string, unknown>>(PARTIAL_KEY) ?? {}), [id]: mine });
        bytes += entry.bytes;
        setProgress(id, { state: "downloading", done: bytes, total: manifest.bytes }, controller);
      }
    };
    // Three books at a time: quick on a good signal, gentle on a poor one.
    await Promise.all([worker(), worker(), worker()]);

    const all = saved();
    all[id] = { version: manifest.version, bytes: manifest.bytes, books: manifest.books.map((b) => b.book), at: new Date().toISOString() };
    writeJson(SAVED_KEY, all);
    const left = readJson<Record<string, unknown>>(PARTIAL_KEY) ?? {};
    delete left[id];
    writeJson(PARTIAL_KEY, left);
    setProgress(id, null);
    return "saved";
  } catch (e) {
    controller.abort();
    const reason = e instanceof Stopped ? e.reason : "offline";
    if (reason === "cancelled") {
      setProgress(id, null);
      return "cancelled";
    }
    setProgress(id, { state: "failed", reason });
    return "failed";
  }
}

/** A download under way, or the one that stopped, for a Bible; null when there is none. */
export function bibleDownload(id: BibleId): BibleDownload | null {
  return downloads.get(id)?.progress ?? null;
}

/** Stop a download under way; the books it kept stay for the next. */
export function cancelBibleDownload(id: BibleId): void {
  downloads.get(id)?.controller?.abort();
}

/** Forget a stopped download's message (the row goes back to Download). */
export function dismissBibleDownload(id: BibleId): void {
  if (downloads.get(id)?.progress.state === "failed") setProgress(id, null);
}

/** Take a Bible off the phone. The reader who reads in it goes back to the English. */
export async function removeBible(id: BibleId, plugin?: Plugin): Promise<void> {
  cancelBibleDownload(id);
  const fs = plugin ?? (await import("@capacitor/filesystem"));
  try {
    await fs.Filesystem.rmdir({ path: bibleFolder(id), directory: fs.Directory.Data, recursive: true });
  } catch {
    /* already gone */
  }
  const all = saved();
  delete all[id];
  writeJson(SAVED_KEY, all);
  const partial = readJson<Record<string, unknown>>(PARTIAL_KEY) ?? {};
  delete partial[id];
  writeJson(PARTIAL_KEY, partial);
  for (const key of [...books.keys()]) if (key.startsWith(`${id}/`)) books.delete(key);
  if (readBibleChoice() === id) writeBibleChoice(null);
  setProgress(id, null);
}

// ---- Reading ------------------------------------------------------------------

/** The last books read, by "bible/book". */
const books = new Map<string, Promise<BibleBookFile | null>>();
const KEEP = 4;

/**
 * A book of a Bible, for a page: from the phone in the apps (null when the
 * Bible is not on it), from the website in a browser (null when it cannot be
 * had). Kept while it is read, so the next chapter is at once.
 */
export function readBibleBook(
  id: BibleId,
  book: string,
  { native = isNativeClient(), plugin, fetcher = (u, i) => fetch(u, i) }: { native?: boolean; plugin?: Plugin; fetcher?: Fetch } = {},
): Promise<BibleBookFile | null> {
  const key = `${id}/${book}`;
  const kept = books.get(key);
  if (kept) {
    books.delete(key);
    books.set(key, kept);
    return kept;
  }
  const reading = (async (): Promise<BibleBookFile | null> => {
    try {
      let text: string;
      if (native) {
        if (!savedBibles()[id]?.books.includes(book)) return null;
        const fs = plugin ?? (await import("@capacitor/filesystem"));
        const got = await fs.Filesystem.readFile({ path: `${bibleFolder(id)}/${book}.json`, directory: fs.Directory.Data, encoding: fs.Encoding.UTF8 });
        text = typeof got.data === "string" ? got.data : await got.data.text();
      } else {
        const res = await fetcher(bookUrl(id, book, false));
        if (!res.ok) return null;
        text = await res.text();
      }
      const file = JSON.parse(text) as BibleBookFile;
      return file.bible === id && file.book === book && Array.isArray(file.chapters) ? file : null;
    } catch {
      return null;
    }
  })();
  books.set(key, reading);
  while (books.size > KEEP) books.delete(books.keys().next().value!);
  // A book that could not be read is asked for again next time.
  void reading.then((file) => {
    if (!file && books.get(key) === reading) books.delete(key);
  });
  return reading;
}

/** For tests: forget the books kept and the downloads under way. */
export function resetBibleStoreForTests(): void {
  books.clear();
  downloads.clear();
  snapshot = null;
  savedRaw = null;
}
