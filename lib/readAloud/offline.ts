"use client";

/**
 * Offline listening, for Plus (1.8, the owner's yes of 2026-10-24): a book's
 * readings saved on the phone, so they play in church, on a flight, with no
 * signal. Only in the apps: a browser keeps what it keeps.
 *
 * Each chapter is two files in the app's own folder (home, below), its
 * recording and its timings (audio/read/<book>/<chapter>.mp3 and .json), asked of the
 * website as the player asks for them (lib/readAloud/chapters.ts) and written
 * with the Filesystem plugin. What is saved is listed on the device
 * (purify:readAloud.saved), so the player can choose the saved file at once,
 * without asking the phone; a saved chapter whose file has gone is dropped
 * from the list the next time the list is checked (checkSaved).
 *
 * Nothing here decides who may save: the screens ask Plus first.
 */

import { useSyncExternalStore } from "react";

import { forgetReaderBook } from "./weekKept";

const KEY = "purify:readAloud.saved";
const EVENT = "purify:readAloud.saved";

/** A saved chapter: where its two files are on the phone, and how big the recording is. */
export type Saved = { mp3: string; json: string; bytes: number };

type Plugin = typeof import("@capacitor/filesystem");

/**
 * The folder the recordings are kept in (1.9, his yes to the sheet's 7, "just
 * do the safer route"): the plugin's LibraryNoCloud, as the downloaded Bibles'
 * (lib/bible/downloads/store.ts). On an iPhone that is the Library kept out
 * of iCloud backups, as Apple's storage rules ask of what can be downloaded
 * again. Until 1.9 it was Data, which is Documents there and is backed up, so
 * hours of audio could go into a reader's iCloud. On Android both are the
 * app's own files.
 */
function home(fs: Plugin) {
  return fs.Directory.LibraryNoCloud;
}

/** Set once what was saved before 1.9 is all in the folder above. */
const MOVED_KEY = "purify:readAloud.home";

function read(): Record<string, Saved> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const o = raw ? (JSON.parse(raw) as unknown) : {};
    return o && typeof o === "object" ? (o as Record<string, Saved>) : {};
  } catch {
    return {};
  }
}

function write(all: Record<string, Saved>): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* a full or private store: the chapter streams as before */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Every saved chapter, by "book/chapter". */
export function savedChapters(): Record<string, Saved> {
  return typeof window === "undefined" ? {} : read();
}

/** Listen for the list changing (a book saved or removed). */
export function onSavedChange(changed: () => void): () => void {
  window.addEventListener(EVENT, changed);
  return () => window.removeEventListener(EVENT, changed);
}

const NO_BOOKS: ReadonlySet<string> = new Set();
let booksKey: string | null = null;
let booksSet: ReadonlySet<string> = NO_BOOKS;

/** The books with a reading saved on the phone, at least one chapter of them (1.9: marked in the books list). */
export function savedBooks(): ReadonlySet<string> {
  if (typeof window === "undefined") return NO_BOOKS;
  const keys = Object.keys(read()).sort().join(",");
  if (keys !== booksKey) {
    booksKey = keys;
    booksSet = new Set(keys ? keys.split(",").map((k) => k.split("/")[0]) : []);
  }
  return booksSet;
}

/** The saved books, kept in step with the phone: empty on the website, where nothing is saved. */
export function useSavedBooks(): ReadonlySet<string> {
  return useSyncExternalStore(onSavedChange, savedBooks, () => NO_BOOKS);
}

/** How much the saved recordings take, in bytes. */
export function savedBytes(): number {
  return Object.values(savedChapters()).reduce((n, s) => n + s.bytes, 0);
}

/** The address the WebView plays a saved file from (Capacitor's own file bridge). */
function playable(uri: string): string {
  const cap = (window as unknown as { Capacitor?: { convertFileSrc?: (u: string) => string } }).Capacitor;
  return cap?.convertFileSrc ? cap.convertFileSrc(uri) : uri;
}

/** A saved chapter's recording or timings, as an address the player can open; null when not saved. */
export function savedSrc(book: string, chapter: number, kind: "mp3" | "json" = "mp3"): string | null {
  if (typeof window === "undefined") return null;
  const s = read()[`${book}/${chapter}`];
  return s ? playable(kind === "mp3" ? s.mp3 : s.json) : null;
}

/** A recording as base64, which is how the plugin takes a file's bytes; in pieces, so a long chapter does not overflow the call stack. */
async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}

/**
 * Save the given chapters of a book, one after another, telling `progress`
 * after each. A chapter that cannot be had (no signal, the website refused)
 * is left to stream and counted as failed; the rest are kept. `stop`, asked
 * before each chapter, ends the saving there (1.9: the signal went, or the
 * phone moved to mobile data while the saving waits for Wi-Fi); the chapters
 * not reached are neither saved nor failed.
 */
export async function saveChapters(
  book: string,
  chapters: readonly number[],
  urls: (chapter: number) => { mp3: string; json: string },
  progress: (done: number, total: number) => void = () => {},
  plugin?: Plugin,
  stop: () => boolean = () => false,
): Promise<{ saved: number; failed: number; stopped: boolean }> {
  const { Filesystem, Directory, Encoding } = plugin ?? (await import("@capacitor/filesystem"));
  let saved = 0;
  let failed = 0;
  for (const [i, chapter] of chapters.entries()) {
    if (stop()) return { saved, failed, stopped: true };
    const key = `${book}/${chapter}`;
    try {
      const { mp3, json } = urls(chapter);
      const [audio, timings] = await Promise.all([fetch(mp3), fetch(json)]);
      if (!audio.ok || !timings.ok) throw new Error("not on the website");
      const blob = await audio.blob();
      const base = `audio/read/${book}/${chapter}`;
      const a = await Filesystem.writeFile({ path: `${base}.mp3`, data: await toBase64(blob), directory: Directory.LibraryNoCloud, recursive: true });
      const j = await Filesystem.writeFile({ path: `${base}.json`, data: await timings.text(), directory: Directory.LibraryNoCloud, recursive: true, encoding: Encoding.UTF8 });
      write({ ...read(), [key]: { mp3: a.uri, json: j.uri, bytes: blob.size } });
      saved += 1;
    } catch {
      failed += 1;
    }
    progress(i + 1, chapters.length);
  }
  return { saved, failed, stopped: false };
}

/** Take one saved chapter off the phone (1.9: the week's readings, once their day has passed). */
export async function removeChapter(book: string, chapter: number, plugin?: Plugin): Promise<void> {
  const { Filesystem, Directory } = plugin ?? (await import("@capacitor/filesystem"));
  // From the folder it is kept in, and from the one before 1.9, should it not have moved yet.
  for (const directory of [Directory.LibraryNoCloud, Directory.Data]) {
    for (const ext of ["mp3", "json"]) {
      try {
        await Filesystem.deleteFile({ path: `audio/read/${book}/${chapter}.${ext}`, directory });
      } catch {
        /* already gone */
      }
    }
  }
  const all = read();
  delete all[`${book}/${chapter}`];
  write(all);
}

/** Take a book's saved chapters off the phone. It is the reader's no longer (./weekKept.ts). */
export async function removeBook(book: string, plugin?: Plugin): Promise<void> {
  forgetReaderBook(book);
  const { Filesystem, Directory } = plugin ?? (await import("@capacitor/filesystem"));
  for (const directory of [Directory.LibraryNoCloud, Directory.Data]) {
    try {
      await Filesystem.rmdir({ path: `audio/read/${book}`, directory, recursive: true });
    } catch {
      /* already gone */
    }
  }
  const all = read();
  for (const key of Object.keys(all)) if (key.startsWith(`${book}/`)) delete all[key];
  write(all);
}

/**
 * Move what a reader saved before 1.9 from Data to the folder recordings are
 * kept in now (home, above), once, and the list's addresses with it. Where the
 * two are one folder (Android), nothing moves. A chapter that does not move
 * this time stays where it is and keeps playing from where it is; the move is
 * tried again next time, and marked done once every saved chapter is settled:
 * its recording in the new place, or on the phone no more. Never throws.
 *
 * Fable's release check 1, M5: one move at a time (a second call while one
 * runs waits for it); each chapter's addresses written as it moves, so an app
 * closed half way through leaves no chapter pointing at where it was; and a
 * chapter whose timings file is missing no longer holds the move open for
 * ever, since its recording is what decides.
 */
let moving: Promise<void> | null = null;

export function moveSavedHome(plugin?: Plugin): Promise<void> {
  if (!moving) {
    moving = moveOnce(plugin).finally(() => {
      moving = null;
    });
  }
  return moving;
}

async function moveOnce(plugin?: Plugin): Promise<void> {
  if (typeof window === "undefined") return;
  const mark = () => {
    try {
      window.localStorage.setItem(MOVED_KEY, "1");
    } catch {
      /* asked again next time; nothing is moved twice */
    }
  };
  try {
    if (window.localStorage.getItem(MOVED_KEY) === "1") return;
  } catch {
    return;
  }
  const keys = Object.keys(read());
  if (!keys.length) {
    mark();
    return;
  }
  const fs = plugin ?? (await import("@capacitor/filesystem"));
  const { Filesystem, Directory } = fs;
  try {
    const [from, to] = await Promise.all([
      Filesystem.getUri({ path: "audio/read", directory: Directory.Data }),
      Filesystem.getUri({ path: "audio/read", directory: home(fs) }),
    ]);
    if (from.uri === to.uri) {
      mark();
      return;
    }
  } catch {
    return;
  }
  const isThere = async (path: string, directory: Plugin["Directory"][keyof Plugin["Directory"]]) => {
    try {
      await Filesystem.stat({ path, directory });
      return true;
    } catch {
      return false;
    }
  };
  let settled = 0;
  for (const key of keys) {
    const book = key.split("/")[0];
    try {
      await Filesystem.mkdir({ path: `audio/read/${book}`, directory: home(fs), recursive: true });
    } catch {
      /* already there */
    }
    for (const ext of ["mp3", "json"] as const) {
      const path = `audio/read/${key}.${ext}`;
      try {
        await Filesystem.rename({ from: path, directory: Directory.Data, to: path, toDirectory: home(fs) });
      } catch {
        /* moved by an earlier try, or never there: the new place is asked next */
      }
    }
    const mp3 = `audio/read/${key}.mp3`;
    if (await isThere(mp3, home(fs))) {
      // In its new place: its addresses now, before the next chapter, so a
      // move cut short leaves this one playing. A timings file that never was
      // is asked for where it would be, and does not hold the move open.
      try {
        const [a, j] = await Promise.all([
          Filesystem.getUri({ path: mp3, directory: home(fs) }),
          Filesystem.getUri({ path: `audio/read/${key}.json`, directory: home(fs) }),
        ]);
        const now = read();
        if (now[key]) {
          now[key] = { ...now[key], mp3: a.uri, json: j.uri };
          write(now);
        }
        settled += 1;
      } catch {
        /* its addresses next time */
      }
    } else if (!(await isThere(mp3, Directory.Data))) {
      // On the phone no more: nothing to move (checkSaved takes it off the list).
      settled += 1;
    }
    // Else still in the old place: it plays from there, and is tried again.
  }
  if (settled === keys.length) {
    mark();
    try {
      await Filesystem.rmdir({ path: "audio/read", directory: Directory.Data, recursive: true });
    } catch {
      /* nothing left there */
    }
  }
}

/**
 * At each launch, and whenever the saving screen opens: what was saved before
 * 1.9 moved (moveSavedHome), any saved chapter whose recording is no longer on
 * the phone taken off the list, and every other chapter's addresses made
 * again from where its files are now. An app update moves an iPhone app's
 * folder, and an address kept from before points nowhere (Fable's release
 * check 1, M5): a chapter saved before an update plays after it. A chapter not
 * yet moved is looked for where it was, so it is never dropped for that. One
 * check at a time. Never throws.
 */
let checking: Promise<void> | null = null;

export function checkSaved(plugin?: Plugin): Promise<void> {
  if (!checking) {
    checking = checkOnce(plugin)
      .catch(() => {
        /* the list stays as it was; the next launch checks again */
      })
      .finally(() => {
        checking = null;
      });
  }
  return checking;
}

async function checkOnce(plugin?: Plugin): Promise<void> {
  await moveSavedHome(plugin);
  const keys = Object.keys(read());
  if (!keys.length) return;
  const { Filesystem, Directory } = plugin ?? (await import("@capacitor/filesystem"));
  const gone: string[] = [];
  const now: Record<string, { mp3: string; json: string }> = {};
  for (const key of keys) {
    let there = false;
    let found = Directory.LibraryNoCloud;
    for (const directory of [Directory.LibraryNoCloud, Directory.Data]) {
      try {
        await Filesystem.stat({ path: `audio/read/${key}.mp3`, directory });
        there = true;
        found = directory;
        break;
      } catch {
        /* not in this one */
      }
    }
    if (!there) {
      gone.push(key);
      continue;
    }
    try {
      const [a, j] = await Promise.all([
        Filesystem.getUri({ path: `audio/read/${key}.mp3`, directory: found }),
        Filesystem.getUri({ path: `audio/read/${key}.json`, directory: found }),
      ]);
      now[key] = { mp3: a.uri, json: j.uri };
    } catch {
      /* kept as it is listed */
    }
  }
  // Written over the list as it is now, as a chapter may have been saved meanwhile.
  const all = read();
  let changed = false;
  for (const key of gone) {
    if (all[key]) {
      delete all[key];
      changed = true;
    }
  }
  for (const [key, uris] of Object.entries(now)) {
    if (all[key] && (all[key].mp3 !== uris.mp3 || all[key].json !== uris.json)) {
      all[key] = { ...all[key], ...uris };
      changed = true;
    }
  }
  if (changed) write(all);
}
