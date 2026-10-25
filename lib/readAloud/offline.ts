"use client";

/**
 * Offline listening, for Plus (1.8, the owner's yes of 2026-10-24): a book's
 * readings saved on the phone, so they play in church, on a flight, with no
 * signal. Only in the apps: a browser keeps what it keeps.
 *
 * Each chapter is two files in the app's own data folder, its recording and
 * its timings (audio/read/<book>/<chapter>.mp3 and .json), asked of the
 * website as the player asks for them (lib/readAloud/chapters.ts) and written
 * with the Filesystem plugin. What is saved is listed on the device
 * (purify:readAloud.saved), so the player can choose the saved file at once,
 * without asking the phone; a saved chapter whose file has gone is dropped
 * from the list the next time the list is checked (checkSaved).
 *
 * Nothing here decides who may save: the screens ask Plus first.
 */

const KEY = "purify:readAloud.saved";
const EVENT = "purify:readAloud.saved";

/** A saved chapter: where its two files are on the phone, and how big the recording is. */
export type Saved = { mp3: string; json: string; bytes: number };

type Plugin = typeof import("@capacitor/filesystem");

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
 * is left to stream and counted as failed; the rest are kept.
 */
export async function saveChapters(
  book: string,
  chapters: readonly number[],
  urls: (chapter: number) => { mp3: string; json: string },
  progress: (done: number, total: number) => void = () => {},
  plugin?: Plugin,
): Promise<{ saved: number; failed: number }> {
  const { Filesystem, Directory, Encoding } = plugin ?? (await import("@capacitor/filesystem"));
  let saved = 0;
  let failed = 0;
  for (const [i, chapter] of chapters.entries()) {
    const key = `${book}/${chapter}`;
    try {
      const { mp3, json } = urls(chapter);
      const [audio, timings] = await Promise.all([fetch(mp3), fetch(json)]);
      if (!audio.ok || !timings.ok) throw new Error("not on the website");
      const blob = await audio.blob();
      const base = `audio/read/${book}/${chapter}`;
      const a = await Filesystem.writeFile({ path: `${base}.mp3`, data: await toBase64(blob), directory: Directory.Data, recursive: true });
      const j = await Filesystem.writeFile({ path: `${base}.json`, data: await timings.text(), directory: Directory.Data, recursive: true, encoding: Encoding.UTF8 });
      write({ ...read(), [key]: { mp3: a.uri, json: j.uri, bytes: blob.size } });
      saved += 1;
    } catch {
      failed += 1;
    }
    progress(i + 1, chapters.length);
  }
  return { saved, failed };
}

/** Take a book's saved chapters off the phone. */
export async function removeBook(book: string, plugin?: Plugin): Promise<void> {
  const { Filesystem, Directory } = plugin ?? (await import("@capacitor/filesystem"));
  try {
    await Filesystem.rmdir({ path: `audio/read/${book}`, directory: Directory.Data, recursive: true });
  } catch {
    /* already gone */
  }
  const all = read();
  for (const key of Object.keys(all)) if (key.startsWith(`${book}/`)) delete all[key];
  write(all);
}

/** Drop from the list any saved chapter whose recording is no longer on the phone. */
export async function checkSaved(plugin?: Plugin): Promise<void> {
  const all = read();
  const keys = Object.keys(all);
  if (!keys.length) return;
  const { Filesystem, Directory } = plugin ?? (await import("@capacitor/filesystem"));
  let changed = false;
  for (const key of keys) {
    try {
      await Filesystem.stat({ path: `audio/read/${key}.mp3`, directory: Directory.Data });
    } catch {
      delete all[key];
      changed = true;
    }
  }
  if (changed) write(all);
}
